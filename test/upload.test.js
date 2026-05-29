const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-upload.db");
process.env.KUNDELIK_UPLOADS = path.join(__dirname, "test-uploads");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
fs.rmSync(process.env.KUNDELIK_UPLOADS, { recursive: true, force: true });
const createApp = require("../server/app");
const app = createApp();

test("homework draft can be uploaded, deleted, and confirmed", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" });
  await admin.post("/api/admin/students").send({
    email: "u@x.kz", password: "pass1234", name: "U", group: "G", studentId: "UP-1", course: 1,
  });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: "u@x.kz", password: "pass1234" });
  const list = await agent.get("/api/homework");
  const pending = list.body.find((h) => h.status === "pending");

  const upload = await agent.post(`/api/homework/${pending.id}/file`)
    .attach("file", Buffer.from("hello"), "work.pdf");
  assert.strictEqual(upload.status, 200);
  assert.strictEqual(upload.body.status, "pending");

  const withDraft = await agent.get("/api/homework");
  const draft = withDraft.body.find((h) => h.id === pending.id);
  assert.strictEqual(draft.status, "pending");
  assert.strictEqual(draft.hasFile, true);

  const remove = await agent.delete(`/api/homework/${pending.id}/file`);
  assert.strictEqual(remove.status, 200);
  const removedList = await agent.get("/api/homework");
  const removed = removedList.body.find((h) => h.id === pending.id);
  assert.strictEqual(removed.hasFile, false);

  const uploadAgain = await agent.post(`/api/homework/${pending.id}/file`)
    .attach("file", Buffer.from("hello again"), "work.pdf");
  assert.strictEqual(uploadAgain.status, 200);

  const r = await agent.post(`/api/homework/${pending.id}/submit`).send({});
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, "submitted");

  const list2 = await agent.get("/api/homework");
  const same = list2.body.find((h) => h.id === pending.id);
  assert.strictEqual(same.status, "submitted");
  assert.strictEqual(same.hasFile, true);
});

test("file download returns attachment", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" });
  await admin.post("/api/admin/students").send({
    email: "u2@x.kz", password: "pass1234", name: "U2", group: "G", studentId: "UP-2", course: 1,
  });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: "u2@x.kz", password: "pass1234" });
  const files = await agent.get("/api/files");
  const r = await agent.get(`/api/files/${files.body[0].id}/download`);
  assert.strictEqual(r.status, 200);
  assert.match(r.headers["content-disposition"], /attachment/);
});
