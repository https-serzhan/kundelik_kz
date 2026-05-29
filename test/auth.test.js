const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-auth.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

async function createStudent(email, password, name, group, studentId = `ID-${Date.now()}`) {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" });
  return admin.post("/api/admin/students").send({ email, password, name, group, studentId, course: 1 });
}

test("admin-created student → me → logout flow", async () => {
  await createStudent("a@x.kz", "pass1234", "Аян", "ИС-21-1", "AUTH-1");
  const agent = request.agent(app);
  const reg = await agent.post("/api/auth/login")
    .send({ email: "a@x.kz", password: "pass1234" });
  assert.strictEqual(reg.status, 200);

  const me = await agent.get("/api/auth/me");
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.email, "a@x.kz");

  await agent.post("/api/auth/logout");
  const me2 = await agent.get("/api/auth/me");
  assert.strictEqual(me2.status, 401);
});

test("duplicate email → 409", async () => {
  await createStudent("dup@x.kz", "pass1234", "B", "G", "AUTH-2");
  const dup = await createStudent("dup@x.kz", "pass1234", "B", "G", "AUTH-3");
  assert.strictEqual(dup.status, 409);
});

test("login wrong password → 401", async () => {
  await createStudent("c@x.kz", "right123", "C", "G", "AUTH-4");
  const bad = await request(app).post("/api/auth/login").send({ email: "c@x.kz", password: "nope" });
  assert.strictEqual(bad.status, 401);
});
