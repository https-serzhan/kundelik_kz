const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

// Ключ Gemini НЕ выставляем → server/lib/gemini.js работает в режиме-заглушке.
process.env.KUNDELIK_DB = path.join(__dirname, "test-ai-admin.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

function adminAgent() {
  const a = request.agent(app);
  return a.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" }).then(() => a);
}

async function makeStudent(email, studentId) {
  const admin = await adminAgent();
  await admin.post("/api/admin/students").send({
    email, password: "pass1234", name: "Admin AI Student", group: "G", studentId, course: 2,
  });
}

test("admin AI endpoints require admin role", async () => {
  // без сессии → 401
  const r0 = await request(app).get("/api/admin/ai/history");
  assert.strictEqual(r0.status, 401);

  // студенту → 403 (роль не та)
  const admin = await adminAgent();
  await admin.post("/api/admin/students").send({
    email: "adm-ai-stu@x.kz", password: "pass1234", name: "S", group: "G", studentId: "ADM-AI-1", course: 1,
  });
  const student = request.agent(app);
  await student.post("/api/auth/login").send({ email: "adm-ai-stu@x.kz", password: "pass1234" });
  const r1 = await student.get("/api/admin/ai/history");
  assert.strictEqual(r1.status, 403);
  const r2 = await student.post("/api/admin/ai/chat").send({ text: "hi" });
  assert.strictEqual(r2.status, 403);
});

test("admin AI chat roundtrip with all-students scope", async () => {
  await makeStudent("adm-ai-a@x.kz", "ADM-AI-A");
  await makeStudent("adm-ai-b@x.kz", "ADM-AI-B");
  const admin = await adminAgent();

  const before = await admin.get("/api/admin/ai/history");
  assert.strictEqual(before.status, 200);
  assert.strictEqual(before.body.length, 0);

  const r = await admin.post("/api/admin/ai/chat").send({ text: "Кто в зоне риска?", lang: "ru" });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.userMsg.role, "user");
  assert.strictEqual(r.body.userMsg.text, "Кто в зоне риска?");
  assert.strictEqual(r.body.assistantMsg.role, "assistant");
  assert.ok(r.body.assistantMsg.text.length > 0);

  const after = await admin.get("/api/admin/ai/history");
  assert.strictEqual(after.body.length, 2);
});

test("admin AI chat with specific studentId scope", async () => {
  await makeStudent("adm-ai-c@x.kz", "ADM-AI-C");
  const admin = await adminAgent();
  const r = await admin.post("/api/admin/ai/chat").send({ text: "Как дела у студента?", lang: "ru", studentId: "ADM-AI-C" });
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.assistantMsg.text.length > 0);
});

test("admin AI chat rejects empty text", async () => {
  const admin = await adminAgent();
  const r = await admin.post("/api/admin/ai/chat").send({ text: "  " });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.error, "invalid_input");
});
