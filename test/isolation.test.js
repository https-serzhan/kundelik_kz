const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-iso.db");
process.env.KUNDELIK_UPLOADS = path.join(__dirname, "test-iso-uploads");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
fs.rmSync(process.env.KUNDELIK_UPLOADS, { recursive: true, force: true });
const createApp = require("../server/app");
const app = createApp();

test("user A submission does not affect user B", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" });
  await admin.post("/api/admin/students").send({ email: "ia@x.kz", password: "pass1234", name: "A", group: "G", studentId: "ISO-1", course: 1 });
  await admin.post("/api/admin/students").send({ email: "ib@x.kz", password: "pass1234", name: "B", group: "G", studentId: "ISO-2", course: 1 });
  const A = request.agent(app), B = request.agent(app);
  await A.post("/api/auth/login").send({ email: "ia@x.kz", password: "pass1234" });
  await B.post("/api/auth/login").send({ email: "ib@x.kz", password: "pass1234" });

  const aList = await A.get("/api/homework");
  const aPending = aList.body.find((h) => h.status === "pending");
  await A.post(`/api/homework/${aPending.id}/submit`).attach("file", Buffer.from("x"), "a.pdf");

  const bList = await B.get("/api/homework");
  const bSame = bList.body.find((h) => h.id === aPending.id);
  assert.strictEqual(bSame.status, "pending"); // B не затронут
});

test("B cannot post to A chat", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@kundelik.local", password: "admin12345" });
  await admin.post("/api/admin/students").send({ email: "ia2@x.kz", password: "pass1234", name: "A", group: "G", studentId: "ISO-3", course: 1 });
  await admin.post("/api/admin/students").send({ email: "ib2@x.kz", password: "pass1234", name: "B", group: "G", studentId: "ISO-4", course: 1 });
  const A = request.agent(app), B = request.agent(app);
  await A.post("/api/auth/login").send({ email: "ia2@x.kz", password: "pass1234" });
  await B.post("/api/auth/login").send({ email: "ib2@x.kz", password: "pass1234" });
  const aChats = await A.get("/api/chats");
  const r = await B.post(`/api/chats/${aChats.body[0].id}/messages`).send({ text: "hack" });
  assert.strictEqual(r.status, 404);
});
