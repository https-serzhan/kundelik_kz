const express = require("express");
const db = require("../db");
const { requireStudent } = require("../auth");
const { ask, analyzePerformance, checkRateLimit } = require("../lib/gemini");
const { studentContext } = require("../lib/student-context");

const router = express.Router();
router.use(requireStudent);
const bi = (kz, ru) => ({ kz, ru });

const MAX_INPUT = 1000;
const HISTORY_LIMIT = 20;

function rowMsg(m) {
  return { id: m.id, role: m.role, text: m.text, createdAt: m.created_at };
}

function insertMsg(userId, role, text) {
  const info = db.prepare(
    "INSERT INTO ai_messages (user_id, role, text, created_at) VALUES (?,?,?,?)"
  ).run(userId, role, text, new Date().toISOString());
  return db.prepare("SELECT * FROM ai_messages WHERE id = ?").get(info.lastInsertRowid);
}

// ---- Эндпоинты ----

// История переписки студента с ИИ
router.get("/history", (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?`
  ).all(req.session.userId, HISTORY_LIMIT).reverse();
  res.json(rows.map(rowMsg));
});

// Отправить сообщение -> получить ответ ИИ
router.post("/chat", async (req, res, next) => {
  try {
    const text = String((req.body && req.body.text) || "").trim();
    if (!text || text.length > MAX_INPUT) {
      return res.status(400).json({ error: "invalid_input" });
    }
    if (!checkRateLimit(req.session.userId)) {
      return res.status(429).json({ error: "rate_limited" });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
    const lang = (req.body && req.body.lang) || "kz";
    const ctx = studentContext(req.session.userId);

    // История для контекста диалога (берём последние сообщения до текущего запроса)
    const history = db.prepare(
      `SELECT * FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 10`
    ).all(req.session.userId).reverse().map(rowMsg);

    const userMsg = rowMsg(insertMsg(req.session.userId, "user", text));

    let reply;
    try {
      reply = await ask({ user, ctx, history, userText: text, lang });
    } catch (e) {
      if (e && e.code === "ai_rate_limited") return res.status(429).json({ error: "rate_limited" });
      if (e && e.code === "ai_auth") return res.status(503).json({ error: "ai_unavailable" });
      // На прочие ошибки Gemini — ответ не теряем: сохраняем понятное сообщение студенту.
      reply = lang === "ru"
        ? "ИИ сейчас недоступен. Попробуйте чуть позже."
        : "ЖИ қазір қолжетімсіз. Сәл кейін қайталап көріңіз.";
    }

    const assistantMsg = rowMsg(insertMsg(req.session.userId, "assistant", reply));
    res.json({ userMsg, assistantMsg });
  } catch (e) {
    next(e);
  }
});

// Короткий анализ успеваемости для дашборда
router.post("/analyze", async (req, res, next) => {
  try {
    if (!checkRateLimit(req.session.userId)) {
      return res.status(429).json({ error: "rate_limited" });
    }
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
    const lang = (req.body && req.body.lang) || "kz";
    const ctx = studentContext(req.session.userId);
    let summary = "";
    try {
      summary = await analyzePerformance({ user, ctx, lang });
    } catch (e) {
      // Дашборд не должен падать из-за временной недоступности ИИ.
      summary = "";
    }
    res.json({ summary });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
