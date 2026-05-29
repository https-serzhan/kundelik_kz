const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-chat.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

test("list chats then post message persists", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" });
  await admin.post("/api/admin/students").send({
    email: "ch@x.kz", password: "pass1234", name: "Ч", group: "G", studentId: "CHAT-1", course: 1,
  });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: "ch@x.kz", password: "pass1234" });
  const chats = await agent.get("/api/chats");
  assert.ok(chats.body.length >= 1);
  const id = chats.body[0].id;

  const before = chats.body[0].messages.length;
  const post = await agent.post(`/api/chats/${id}/messages`).send({ text: "Сәлем" });
  assert.strictEqual(post.status, 200);

  const chats2 = await agent.get("/api/chats");
  const same = chats2.body.find((c) => c.id === id);
  assert.strictEqual(same.messages.length, before + 1);
  assert.strictEqual(same.messages[same.messages.length - 1].text.kz, "Сәлем");
});
