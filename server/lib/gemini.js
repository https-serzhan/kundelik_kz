// Обёртка над Google Gemini SDK. Весь прямой контакт с API изолирован здесь.
// Ключ берётся из process.env.GEMINI_API_KEY (загружается в server/index.js через process.loadEnvFile()).
// Если ключа нет — работает режим-заглушка: методы возвращают детерминированный текст,
// чтобы приложение и тесты не падали без сети/ключа.

const { GoogleGenAI } = require("@google/genai");
const { subjectTotal, computeGPA } = require("./gpa");

const MODEL = "gemini-2.5-flash";
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Простой in-memory rate-limit на пользователя: окно + лимит запросов.
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 минут
const RATE_MAX = 15;                   // максимум сообщений за окно
const rateBuckets = new Map();         // userId -> { count, windowStart }

/**
 * @returns {boolean} true, если запрос разрешён; false — лимит исчерпан.
 */
function checkRateLimit(userId) {
  const now = Date.now();
  let b = rateBuckets.get(userId);
  if (!b || now - b.windowStart > RATE_WINDOW_MS) {
    b = { count: 0, windowStart: now };
    rateBuckets.set(userId, b);
  }
  b.count += 1;
  return b.count <= RATE_MAX;
}

function pickLang(lang) {
  return lang === "ru" ? "ru" : "kz";
}

function langName(lang) {
  return lang === "ru" ? "русском" : "казахском";
}

/**
 * Собирает системную инструкцию с реальными данными студента,
 * чтобы ИИ отвечал про ЕГО учёбу, а не абстрактно.
 * ctx: { subjects: [{name, midterm, final, credits, total}], gpa,
 *        attendance: [{subject, total, attended}], pendingHw, nextExam }
 */
function buildStudentContext(user, ctx, lang) {
  const name = (user && (user.name_ru || user.name_kz)) || "студент";
  const course = user && user.course ? user.course : "—";
  const group = user && user.group ? user.group : "—";

  const subjects = (ctx.subjects || [])
    .map((s) => {
      const nm = (s.name && (s.name.ru || s.name.kz)) || "?";
      return `  • ${nm}: midterm=${s.midterm}, final=${s.final}, total=${s.total}, credits=${s.credits}`;
    })
    .join("\n");

  const attendance = (ctx.attendance || [])
    .map((a) => {
      const nm = (a.subject && (a.subject.ru || a.subject.kz)) || "?";
      const pct = a.total ? Math.round((a.attended / a.total) * 100) : 0;
      return `  • ${nm}: ${a.attended}/${a.total} (${pct}%)`;
    })
    .join("\n");

  const gpa = ctx.gpa != null ? ctx.gpa.toFixed(2) : "—";
  const nextExam = ctx.nextExam
    ? `${ctx.nextExam.subject ? (ctx.nextExam.subject.ru || ctx.nextExam.subject.kz) : "?"} — ${ctx.nextExam.date}`
    : "нет данных";
  const pendingHw = ctx.pendingHw != null ? ctx.pendingHw : "—";

  return [
    `Ты — дружелюбный учебный ИИ-ассистент студенческого портала «Күнделік».`,
    `Отвечай кратко, по делу и на ${langName(lang)} языке.`,
    `Если вопроса касается учёбы — опирайся на данные ниже; если нет — всё равно помоги (учеба, мотивация, общие вопросы).`,
    `Не выдумывай оценки или расписание, которых нет в данных.`,
    ``,
    `Студент: ${name}, курс ${course}, группа ${group}.`,
    `GPA: ${gpa} (из 4.00).`,
    `Невыполненных заданий: ${pendingHw}.`,
    `Ближайший экзамен: ${nextExam}.`,
    `Предметы и оценки (midterm/final/total в 100-балльной шкале, credits):`,
    subjects || "  • данных нет",
    `Посещаемость:`,
    attendance || "  • данных нет",
  ].join("\n");
}

function toContents(history, userText) {
  // SDK принимает contents как массив {role, parts:[{text}]}. role: 'user'|'model'.
  const items = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
  items.push({ role: "user", parts: [{ text: userText }] });
  return items;
}

async function generate(systemInstruction, contents, temperature) {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { systemInstruction, temperature },
  });
  const text = res && res.text ? res.text : "";
  return String(text || "").trim();
}

/**
 * Чат с учётом истории. history: [{role:'user'|'assistant', text}].
 * Возвращает текст ответа ассистента.
 */
async function ask({ user, ctx, history, userText, lang }) {
  if (!ai) {
    return stubReply(userText, lang);
  }
  const systemInstruction = buildStudentContext(user, ctx || {}, pickLang(lang));
  const contents = toContents(history.slice(-10), userText);
  try {
    return await generate(systemInstruction, contents, 0.5);
  } catch (err) {
    throw wrapError(err);
  }
}

/**
 * One-shot анализ успеваемости для дашборда: 2–3 предложения рекомендаций.
 * ctx тот же, что и для ask.
 */
async function analyzePerformance({ user, ctx, lang }) {
  if (!ai) {
    return stubAnalysis(lang);
  }
  const langDir = lang === "ru" ? "по-русски" : "қазақша";
  const sys = [
    buildStudentContext(user, ctx || {}, pickLang(lang)),
    ``,
    `Задача: дай короткий (2–3 предложения) персональный анализ успеваемости.`,
    `Укажи сильные предметы, предметы под риском (total < 60 или низкая посещаемость) и 1 конкретный совет.`,
    `Отвечай ${langDir}. Без вступлений вроде «конечно», сразу по делу.`,
  ].join("\n");
  try {
    const text = await generate(sys, "Дай анализ моей успеваемости.", 0.5);
    return text || stubAnalysis(lang);
  } catch (err) {
    throw wrapError(err);
  }
}

// ---- Заглушки (без ключа/сети): приложение остаётся рабочим и тестируемым ----

function stubReply(userText, lang) {
  if (lang === "ru") {
    return "ИИ-ассистент работает в демо-режиме (ключ Gemini не задан). Введите GEMINI_API_KEY в .env, чтобы получить реальные ответы. Ваш вопрос принят: «" + userText.slice(0, 80) + "».";
  }
  return "ЖИ көмекші демо-режимде жұмыс істейді (Gemini кілті берілмеген). Нақты жауап алу үшін .env файлына GEMINI_API_KEY енгізіңіз. Сіздің сұрағыңыз қабылданды: «" + userText.slice(0, 80) + "».";
}

function stubAnalysis(lang) {
  if (lang === "ru") {
    return "Демо-анализ: задайте GEMINI_API_KEY, чтобы получить персональные рекомендации по вашей успеваемости и посещаемости.";
  }
  return "Демо-талдау: өзіңіздің оқу жетістіктеріңіз бойынша жеке ұсыныстар алу үшін GEMINI_API_KEY кілтін енгізіңіз.";
}

// ---- Ассистент преподавателя/админа ----

/**
 * Системная инструкция для преподавателя. Подставляет либо контекст одного студента,
 * либо сводку по всем (roster). Говорит модели: ты помогаешь преподавателю.
 */
function buildAdminContext({ admin, student, ctx, roster, lang }) {
  const langDir = lang === "ru" ? "по-русски" : "қазақша";
  const base = [
    `Ты — ИИ-ассистент преподавателя/администратора студенческого портала «Күнделік».`,
    `Помогай педагогу анализировать успеваемость, отвечать на вопросы про студентов, давать рекомендации.`,
    `Отвечай ${langDir}, кратко и по делу. Опирайся на приведённые данные; не выдумывай несуществующих студентов и оценок.`,
    `Если выбран конкретный студент — отвечай про него; если выбрана вся группа — давай сводный взгляд.`,
  ];

  if (student && ctx) {
    const subjLines = (ctx.subjects || [])
      .map((s) => `  • ${(s.name && (s.name.ru || s.name.kz)) || "?"}: midterm=${s.midterm}, final=${s.final}, total=${s.total} (кредиты ${s.credits})`)
      .join("\n");
    const attLines = (ctx.attendance || [])
      .map((a) => {
        const pct = a.total ? Math.round((a.attended / a.total) * 100) : 0;
        return `  • ${(a.subject && (a.subject.ru || a.subject.kz)) || "?"}: ${a.attended}/${a.total} (${pct}%)`;
      })
      .join("\n");
    base.push(
      ``,
      `Выбранный студент: ${(student.name && (student.name.ru || student.name.kz)) || "?"}, ` +
        `ID ${student.studentId || "?"}, группа ${student.group || "?"}, курс ${student.course || "?"}.`,
      `GPA: ${(ctx.gpa || 0).toFixed(2)} (из 4.00). Невыполненных заданий: ${ctx.pendingHw != null ? ctx.pendingHw : "—"}.`,
      `Предметы и оценки:`,
      subjLines || "  • данных нет",
      `Посещаемость:`,
      attLines || "  • данных нет"
    );
  } else if (roster && roster.length) {
    const lines = roster
      .map(
        (r) =>
          `  • ${r.studentId} | ${(r.name && (r.name.ru || r.name.kz)) || "?"} | группа ${r.group || "?"} | курс ${r.course} | GPA ${r.gpa} | посещ. ${r.attendancePct}%${r.atRisk ? " | ⚠ зона риска" : ""}`
      )
      .join("\n");
    const atRiskCount = roster.filter((r) => r.atRisk).length;
    base.push(
      ``,
      `Всего студентов: ${roster.length}. В зоне риска (GPA < 2.0 или посещаемость < 70%): ${atRiskCount}.`,
      `Сводка по студентам:`,
      lines
    );
  } else {
    base.push("", "Студентов пока нет.");
  }
  return base.join("\n");
}

/**
 * Чат преподавателя с учётом истории. roster/student/ctx — что передал роут.
 */
async function askAsAdmin({ admin, student, ctx, roster, history, userText, lang }) {
  if (!ai) return stubAdminReply(userText, lang);
  const systemInstruction = buildAdminContext({ admin, student, ctx, roster, lang });
  const contents = toContents(history.slice(-10), userText);
  try {
    return await generate(systemInstruction, contents, 0.4);
  } catch (err) {
    throw wrapError(err);
  }
}

function stubAdminReply(userText, lang) {
  if (lang === "ru") {
    return "ИИ-ассистент преподавателя работает в демо-режиме (ключ Gemini не задан). Задайте GEMINI_API_KEY в .env для реальных ответов. Ваш вопрос: «" + userText.slice(0, 80) + "».";
  }
  return "Оқытушының ЖИ-көмекшісі демо-режимде жұмыс істейді (Gemini кілті берілмеген). Нақты жауап алу үшін .env файлына GEMINI_API_KEY енгізіңіз. Сіздің сұрағыңыз: «" + userText.slice(0, 80) + "».";
}

// ---- Нормализация ошибок SDK в понятные коды ----

function wrapError(err) {
  const status = err && err.status;
  if (status === 429) return Object.assign(new Error("rate_limited"), { code: "ai_rate_limited" });
  if (status === 401 || status === 403) return Object.assign(new Error("auth"), { code: "ai_auth" });
  if (status && status >= 500) return Object.assign(new Error("unavailable"), { code: "ai_unavailable" });
  if (err && (err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND")) {
    return Object.assign(new Error("unavailable"), { code: "ai_unavailable" });
  }
  console.error("[gemini] generation error:", err && err.stack ? err.stack : err);
  return Object.assign(new Error("error"), { code: "ai_error" });
}

module.exports = {
  ai,
  MODEL,
  hasKey: !!ai,
  checkRateLimit,
  buildStudentContext,
  buildAdminContext,
  ask,
  askAsAdmin,
  analyzePerformance,
  // вспомогательные — переиспользуем формулу GPA из lib/gpa
  subjectTotal,
  computeGPA,
};
