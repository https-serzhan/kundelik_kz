const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-admin.db");
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "adminpass123";
process.env.KUNDELIK_UPLOADS = path.join(__dirname, "test-admin-uploads");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
fs.rmSync(process.env.KUNDELIK_UPLOADS, { recursive: true, force: true });

const createApp = require("../server/app");
const { backfillUsers } = require("../server/seed");
const app = createApp();

function dateShift(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

test("student cannot access admin endpoints", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  await admin.post("/api/admin/students").send({
    email: "student@test.local", password: "pass1234", name: "Student", group: "G-1", studentId: "ADM-ST-1", course: 1,
  });
  const agent = request.agent(app);
  await agent.post("/api/auth/login")
    .send({ email: "student@test.local", password: "pass1234" });

  const r = await agent.get("/api/admin/overview");
  assert.strictEqual(r.status, 403);
});

test("admin can login and manage content", async () => {
  const agent = request.agent(app);
  const login = await agent.post("/api/auth/login")
    .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  assert.strictEqual(login.status, 200);
  assert.strictEqual(login.body.role, "admin");

  const overview = await agent.get("/api/admin/overview");
  assert.strictEqual(overview.status, 200);
  assert.ok(overview.body.totalUsers >= 1);

  const createNews = await agent.post("/api/admin/news").send({
    title: "Admin update",
    tag: "System",
    date: dateShift(1),
    text: "Panel update deployed",
  });
  assert.strictEqual(createNews.status, 200);

  const content = await agent.get("/api/admin/content");
  assert.strictEqual(content.status, 200);
  assert.ok(content.body.news.some((item) => item.id === createNews.body.id));

  const del = await agent.delete(`/api/admin/news/${createNews.body.id}`);
  assert.strictEqual(del.status, 200);
});

test("admin creates student and student logs in with zeroed grades", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

  const create = await admin.post("/api/admin/students").send({
    email: "new.student@test.local",
    password: "student123",
    name: "New Student",
    group: "SE-101",
    studentId: "ST-9001",
    course: 2,
  });
  assert.strictEqual(create.status, 200);
  assert.strictEqual(create.body.user.studentId, "ST-9001");

  const student = request.agent(app);
  const login = await student.post("/api/auth/login").send({ email: "new.student@test.local", password: "student123" });
  assert.strictEqual(login.status, 200);

  const grades = await admin.get("/api/admin/students/ST-9001/grades");
  assert.strictEqual(grades.status, 200);
  assert.ok(grades.body.subjects.every((s) => s.midterm === 0 && s.final === 0));
});

test("admin manages grades, schedule, homework, files, exams, attendance and chat", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

  await admin.post("/api/admin/students").send({
    email: "ops.student@test.local",
    password: "student123",
    name: "Ops Student",
    group: "OPS-1",
    studentId: "ST-9002",
    course: 1,
  });

  const gradesBefore = await admin.get("/api/admin/students/ST-9002/grades");
  const subjectId = gradesBefore.body.subjects[0].id;
  const gradeUpdate = await admin.patch(`/api/admin/students/ST-9002/grades/${subjectId}`).send({ midterm: 35, final: 45 });
  assert.strictEqual(gradeUpdate.status, 200);
  const gradeInvalid = await admin.patch(`/api/admin/students/ST-9002/grades/${subjectId}`).send({ midterm: -1, final: 101 });
  assert.strictEqual(gradeInvalid.status, 400);

  const attendanceBefore = await admin.get("/api/admin/students/ST-9002/attendance");
  assert.strictEqual(
    new Set(attendanceBefore.body.attendance.map((row) => row.subjectId)).size,
    attendanceBefore.body.attendance.length
  );
  backfillUsers();
  const attendanceAfterBackfill = await admin.get("/api/admin/students/ST-9002/attendance");
  assert.strictEqual(
    new Set(attendanceAfterBackfill.body.attendance.map((row) => row.subjectId)).size,
    attendanceAfterBackfill.body.attendance.length
  );
  const attendanceSubjectId = attendanceBefore.body.attendance[0].subjectId;
  const attendanceUpdate = await admin.patch(`/api/admin/students/ST-9002/attendance/${attendanceSubjectId}`).send({ attended: 5, total: 12 });
  assert.strictEqual(attendanceUpdate.status, 200);

  const lessonCreate = await admin.post("/api/admin/students/ST-9002/schedule").send({
    subjectId,
    day: 6,
    time: "15:00-16:00",
    room: "B-12",
    mode: "offline",
  });
  assert.strictEqual(lessonCreate.status, 200);
  const lessonDelete = await admin.delete(`/api/admin/students/ST-9002/schedule/${lessonCreate.body.id}`);
  assert.strictEqual(lessonDelete.status, 200);

  const hwCreate = await admin.post("/api/admin/homework").send({
    subjectId,
    title: "Admin assigned homework",
    deadline: dateShift(10),
  });
  assert.strictEqual(hwCreate.status, 200);
  const hwGrade = await admin.patch(`/api/admin/homework/${hwCreate.body.id}/submissions/ST-9002`).send({ status: "graded", score: 92 });
  assert.strictEqual(hwGrade.status, 200);
  const hwGradeInvalid = await admin.patch(`/api/admin/homework/${hwCreate.body.id}/submissions/ST-9002`).send({ status: "graded", score: 101 });
  assert.strictEqual(hwGradeInvalid.status, 400);

  const upload = await admin.post("/api/admin/files")
    .field("subjectId", subjectId)
    .attach("file", Buffer.from("hello file"), "syllabus.pdf");
  assert.strictEqual(upload.status, 200);
  const fileDelete = await admin.delete(`/api/admin/files/${upload.body.id}`);
  assert.strictEqual(fileDelete.status, 200);

  const examCreate = await admin.post("/api/admin/exams").send({
    subjectId,
    date: dateShift(15),
    time: "10:00",
    room: "A-1",
  });
  assert.strictEqual(examCreate.status, 200);
  const examUpdate = await admin.patch(`/api/admin/exams/${examCreate.body.id}`).send({
    date: dateShift(17),
    time: "12:00",
    room: "A-2",
  });
  assert.strictEqual(examUpdate.status, 200);
  const examDelete = await admin.delete(`/api/admin/exams/${examCreate.body.id}`);
  assert.strictEqual(examDelete.status, 200);

  const examPastDate = await admin.post("/api/admin/exams").send({
    subjectId,
    date: dateShift(-1),
    time: "10:00",
    room: "A-1",
  });
  assert.strictEqual(examPastDate.status, 400);

  const pastExamCreate = await admin.post("/api/admin/exams").send({
    subjectId,
    date: dateShift(0),
    time: "09:00",
    room: "A-3",
  });
  assert.strictEqual(pastExamCreate.status, 200);
  const pastExamForce = await admin.patch(`/api/admin/exams/${pastExamCreate.body.id}`).send({
    date: dateShift(0),
    time: "09:30",
    room: "A-4",
  });
  assert.strictEqual(pastExamForce.status, 200);
  const gradePastExam = await admin.patch(`/api/admin/students/ST-9002/exams/${pastExamCreate.body.id}`).send({ result: 87 });
  assert.strictEqual(gradePastExam.status, 200);
  const studentExams = await admin.get("/api/admin/students/ST-9002/exams");
  assert.strictEqual(studentExams.status, 200);
  assert.strictEqual(studentExams.body.exams.find((e) => e.id === pastExamCreate.body.id).result, 87);

  const futureExamCreate = await admin.post("/api/admin/exams").send({
    subjectId,
    date: dateShift(25),
    time: "10:00",
    room: "A-5",
  });
  assert.strictEqual(futureExamCreate.status, 200);
  const gradeFutureExam = await admin.patch(`/api/admin/students/ST-9002/exams/${futureExamCreate.body.id}`).send({ result: 91 });
  assert.strictEqual(gradeFutureExam.status, 400);

  const chatSend = await admin.post("/api/admin/chats/ST-9002/messages").send({ text: "Please check updates." });
  assert.strictEqual(chatSend.status, 200);
  const chats = await admin.get("/api/admin/chats");
  assert.strictEqual(chats.status, 200);
  assert.ok(chats.body.chats.find((c) => c.user.studentId === "ST-9002").messages.length >= 1);
});

test("admin rejects past-dated content and homework", async () => {
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

  const subjects = await admin.get("/api/admin/subjects");
  const subjectId = subjects.body.subjects[0].id;

  const homeworkPast = await admin.post("/api/admin/homework").send({
    subjectId,
    title: "Past homework",
    deadline: dateShift(-1),
  });
  assert.strictEqual(homeworkPast.status, 400);

  const newsPast = await admin.post("/api/admin/news").send({
    title: "Old news",
    tag: "System",
    date: dateShift(-1),
    text: "Old item",
  });
  assert.strictEqual(newsPast.status, 400);

  const announcementPast = await admin.post("/api/admin/announcements").send({
    date: dateShift(-1),
    type: "info",
    text: "Old announcement",
  });
  assert.strictEqual(announcementPast.status, 400);
});
