const express = require("express");
const db = require("../db");
const { requireStudent } = require("../auth");

const router = express.Router();
router.use(requireStudent);
const bi = (kz, ru) => ({ kz, ru });

router.get("/chats", (req, res) => {
  const chats = db.prepare("SELECT * FROM chats WHERE user_id = ? ORDER BY id").all(req.session.userId);
  const msgStmt = db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY id");
  res.json(chats.map((c) => ({
    id: c.id, type: c.type, name: bi(c.name_kz, c.name_ru),
    messages: msgStmt.all(c.id).map((m) => ({
      from: m.sender, author: bi(m.author_kz, m.author_ru), text: bi(m.text_kz, m.text_ru), time: m.time,
    })),
  })));
});

router.post("/chats/:id/messages", (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "empty" });
  const chat = db.prepare("SELECT id FROM chats WHERE id = ? AND user_id = ?").get(req.params.id, req.session.userId);
  if (!chat) return res.status(404).json({ error: "not_found" });

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  db.prepare(
    `INSERT INTO messages (chat_id,sender,author_kz,author_ru,text_kz,text_ru,time,created_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(chat.id, "me", "Сіз", "Вы", text.trim(), text.trim(), `${hh}:${mm}`, now.toISOString());
  res.json({ ok: true });
});

module.exports = router;
