const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

// В тестах ключ Gemini НЕ выставляем → server/lib/gemini.js работает в режиме-заглушки
// (реальный API не вызывается, ответы детерминированы).
process.env.KUNDELIK_DB = path.join(__dirname, "test-ai.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

async function makeStudent(email, studentId) {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" });
  await admin.post("/api/admin/students").send({
    email, password: "pass1234", name: "Test Student", group: "G", studentId, course: 1,
  });
  const s = request.agent(app);
  await s.post("/api/auth/login").send({ email, password: "pass1234" });
  return s;
}

test("AI endpoints require auth", async () => {
  const r1 = await request(app).get("/api/ai/history");
  assert.strictEqual(r1.status, 401);
  const r2 = await request(app).post("/api/ai/chat").send({ text: "hi" });
  assert.strictEqual(r2.status, 401);
});

test("empty chat text → 400 invalid_input", async () => {
  const s = await makeStudent("ai-empty@x.kz", "AI-EMPTY");
  const r = await s.post("/api/ai/chat").send({ text: "   " });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.error, "invalid_input");
});

test("student chat roundtrip persists both messages", async () => {
  const s = await makeStudent("ai-chat@x.kz", "AI-CHAT");
  const before = await s.get("/api/ai/history");
  assert.strictEqual(before.status, 200);
  assert.strictEqual(before.body.length, 0);

  const r = await s.post("/api/ai/chat").send({ text: "Как у меня с оценками?", lang: "ru" });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.userMsg.role, "user");
  assert.strictEqual(r.body.userMsg.text, "Как у меня с оценками?");
  assert.strictEqual(r.body.assistantMsg.role, "assistant");
  assert.ok(r.body.assistantMsg.text.length > 0);
  assert.ok(r.body.assistantMsg.id > 0);

  const after = await s.get("/api/ai/history");
  assert.strictEqual(after.body.length, 2);
  assert.strictEqual(after.body[0].role, "user");
  assert.strictEqual(after.body[1].role, "assistant");
});

test("history isolation between students", async () => {
  const a = await makeStudent("ai-iso-a@x.kz", "AI-ISO-A");
  const b = await makeStudent("ai-iso-b@x.kz", "AI-ISO-B");
  await a.post("/api/ai/chat").send({ text: "secret question", lang: "kz" });

  const bHistory = await b.get("/api/ai/history");
  assert.strictEqual(bHistory.body.length, 0, "B must not see A's AI history");
});

test("analyze returns { summary } string", async () => {
  const s = await makeStudent("ai-analyze@x.kz", "AI-ANALYZE");
  const r = await s.post("/api/ai/analyze").send({ lang: "ru" });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(typeof r.body.summary, "string");
  assert.ok(r.body.summary.length > 0);
});
