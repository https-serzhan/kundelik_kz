const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-data.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

let userSeq = 0;
async function authed() {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" });
  const agent = request.agent(app);
  const email = `d${++userSeq}@x.kz`;
  await admin.post("/api/admin/students").send({
    email, password: "pass1234", name: "Д", group: "G", studentId: `DATA-${userSeq}`, course: 1,
  });
  await agent.post("/api/auth/login").send({ email, password: "pass1234" });
  return agent;
}

test("unauthorized data access → 401", async () => {
  const r = await request(app).get("/api/home");
  assert.strictEqual(r.status, 401);
});

test("home aggregate shape", async () => {
  const agent = await authed();
  const r = await agent.get("/api/home");
  assert.strictEqual(r.status, 200);
  assert.ok("gpa" in r.body && "todayLessons" in r.body && "news" in r.body);
});

test("grades return bilingual subject names", async () => {
  const agent = await authed();
  const r = await agent.get("/api/grades");
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.subjects));
  assert.ok(r.body.subjects[0].name.kz && r.body.subjects[0].name.ru);
});
