const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const { requireAdmin, hashPassword } = require("../auth");
const { seedUser } = require("../seed");
const { subjectTotal, computeGPA } = require("../lib/gpa");
const { upload } = require("../lib/upload");

const router = express.Router();
router.use(requireAdmin);

const bi = (kz, ru) => ({ kz, ru });

function rowUser(u) {
  return {
    id: u.id,
    role: u.role,
    email: u.email,
    name: bi(u.name_kz, u.name_ru),
    group: u.group,
    studentId: u.student_id,
    course: u.course,
    createdAt: u.created_at,
  };
}

function getStudentByExternalId(studentId) {
  return db.prepare(
    "SELECT * FROM users WHERE student_id = ? AND role = 'student'"
  ).get(studentId);
}

function requireStudentByExternalId(req, res, next) {
  const user = getStudentByExternalId(req.params.studentId);
  if (!user) return res.status(404).json({ error: "student_not_found" });
  req.targetStudent = user;
  next();
}

function requireSubject(subjectId) {
  return db.prepare("SELECT * FROM subjects WHERE id = ?").get(subjectId);
}

function ensureAdminChat(userId) {
  const existing = db.prepare(
    "SELECT * FROM chats WHERE user_id = ? AND type = 'admin' ORDER BY id LIMIT 1"
  ).get(userId);
  if (existing) return existing;
  const info = db.prepare(
    "INSERT INTO chats (user_id,type,name_kz,name_ru) VALUES (?,?,?,?)"
  ).run(userId, "admin", "Әкімшілік хабарламалары", "Сообщения администрации");
  return db.prepare("SELECT * FROM chats WHERE id = ?").get(info.lastInsertRowid);
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function materialType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".doc" || ext === ".docx") return "doc";
  if (ext === ".ppt" || ext === ".pptx") return "ppt";
  return "img";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isPastDate(value) {
  return isIsoDate(value) && value < todayIsoDate();
}

function deleteStoredFile(filePath) {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function canGradeExam(date) {
  return isIsoDate(date) && date <= todayIsoDate();
}

router.get("/overview", (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  const studentCount = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'student'").get().c;
  const adminCount = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'admin'").get().c;
  const newsCount = db.prepare("SELECT COUNT(*) c FROM news").get().c;
  const announcementCount = db.prepare("SELECT COUNT(*) c FROM announcements").get().c;
  const homeworkCount = db.prepare("SELECT COUNT(*) c FROM homework").get().c;
  const fileCount = db.prepare("SELECT COUNT(*) c FROM materials").get().c;
  const examCount = db.prepare("SELECT COUNT(*) c FROM exams").get().c;

  const recentUsers = db.prepare(
    "SELECT * FROM users WHERE role = 'student' ORDER BY datetime(created_at) DESC, id DESC LIMIT 6"
  ).all().map(rowUser);

  res.json({
    totalUsers,
    studentCount,
    adminCount,
    newsCount,
    announcementCount,
    homeworkCount,
    fileCount,
    examCount,
    recentUsers,
  });
});

router.get("/subjects", (req, res) => {
  const subjects = db.prepare("SELECT * FROM subjects ORDER BY name_ru").all().map((s) => ({
    id: s.id,
    name: bi(s.name_kz, s.name_ru),
    teacher: bi(s.teacher_kz, s.teacher_ru),
    credits: s.credits,
  }));
  res.json({ subjects });
});

function sendStudents(res) {
  const users = db.prepare(
    "SELECT * FROM users WHERE role = 'student' ORDER BY datetime(created_at) DESC, id DESC"
  ).all().map(rowUser);
  res.json({ users });
}

router.get("/students", (_req, res) => {
  sendStudents(res);
});

router.get("/users", (_req, res) => {
  sendStudents(res);
});

router.post("/students", async (req, res, next) => {
  try {
    const email = String(req.body && req.body.email || "").trim().toLowerCase();
    const password = String(req.body && req.body.password || "");
    const name = String(req.body && req.body.name || "").trim();
    const group = String(req.body && req.body.group || "").trim();
    const studentId = String(req.body && req.body.studentId || "").trim();
    const course = Number(req.body && req.body.course) || 1;

    if (!email || !password || password.length < 6 || !name || !group || !studentId)
      return res.status(400).json({ error: "invalid_input" });
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email))
      return res.status(409).json({ error: "email_taken" });
    if (db.prepare("SELECT 1 FROM users WHERE student_id = ?").get(studentId))
      return res.status(409).json({ error: "student_id_taken" });

    const hash = await hashPassword(password);
    const info = db.prepare(
      `INSERT INTO users (email,password_hash,role,name_kz,name_ru,"group",student_id,course,faculty_kz,faculty_ru,phone,photo,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      email,
      hash,
      "student",
      name,
      name,
      group,
      studentId,
      course,
      "Ақпараттық технологиялар факультеті",
      "Факультет информационных технологий",
      "",
      name.slice(0, 2).toUpperCase(),
      new Date().toISOString()
    );

    seedUser(info.lastInsertRowid);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    res.json({ ok: true, user: rowUser(user) });
  } catch (e) {
    next(e);
  }
});

router.get("/students/:studentId", requireStudentByExternalId, (req, res) => {
  res.json({ user: rowUser(req.targetStudent) });
});

router.get("/students/:studentId/grades", requireStudentByExternalId, (req, res) => {
  const rows = db.prepare(
    `SELECT s.id, s.name_kz, s.name_ru, s.teacher_kz, s.teacher_ru, s.credits, g.midterm, g.final
     FROM grades g JOIN subjects s ON s.id = g.subject_id WHERE g.user_id = ? ORDER BY s.name_ru`
  ).all(req.targetStudent.id);
  res.json({
    user: rowUser(req.targetStudent),
    subjects: rows.map((r) => ({
      id: r.id,
      name: bi(r.name_kz, r.name_ru),
      teacher: bi(r.teacher_kz, r.teacher_ru),
      credits: r.credits,
      midterm: r.midterm,
      final: r.final,
      total: subjectTotal(r.midterm, r.final),
    })),
    gpa: computeGPA(rows),
  });
});

router.patch("/students/:studentId/grades/:subjectId", requireStudentByExternalId, (req, res) => {
  const midterm = Number(req.body && req.body.midterm);
  const final = Number(req.body && req.body.final);
  if (
    !Number.isFinite(midterm) ||
    !Number.isFinite(final) ||
    midterm < 0 ||
    midterm > 100 ||
    final < 0 ||
    final > 100
  )
    return res.status(400).json({ error: "invalid_input" });
  const info = db.prepare(
    "UPDATE grades SET midterm = ?, final = ? WHERE user_id = ? AND subject_id = ?"
  ).run(midterm, final, req.targetStudent.id, req.params.subjectId);
  if (!info.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

router.get("/students/:studentId/schedule", requireStudentByExternalId, (req, res) => {
  const lessons = db.prepare(
    "SELECT * FROM student_schedule WHERE user_id = ? ORDER BY day, time, id"
  ).all(req.targetStudent.id).map((l) => ({
    id: l.id,
    day: l.day,
    time: l.time,
    room: l.room,
    mode: l.mode,
    subjectId: l.subject_id,
    subject: bi(l.subject_kz, l.subject_ru),
    teacher: bi(l.teacher_kz, l.teacher_ru),
  }));
  res.json({ user: rowUser(req.targetStudent), lessons });
});

router.post("/students/:studentId/schedule", requireStudentByExternalId, (req, res) => {
  const subject = requireSubject(req.body && req.body.subjectId);
  const day = Number(req.body && req.body.day);
  const time = String(req.body && req.body.time || "").trim();
  const room = String(req.body && req.body.room || "").trim();
  const mode = String(req.body && req.body.mode || "offline").trim();
  if (!subject || !day || !time || !room || !["offline", "online"].includes(mode))
    return res.status(400).json({ error: "invalid_input" });

  const info = db.prepare(
    `INSERT INTO student_schedule
     (user_id,day,time,subject_id,subject_kz,subject_ru,teacher_kz,teacher_ru,room,mode)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    req.targetStudent.id,
    day,
    time,
    subject.id,
    subject.name_kz,
    subject.name_ru,
    subject.teacher_kz,
    subject.teacher_ru,
    room,
    mode
  );
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.delete("/students/:studentId/schedule/:lessonId", requireStudentByExternalId, (req, res) => {
  const info = db.prepare(
    "DELETE FROM student_schedule WHERE id = ? AND user_id = ?"
  ).run(req.params.lessonId, req.targetStudent.id);
  if (!info.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

router.get("/students/:studentId/attendance", requireStudentByExternalId, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM attendance WHERE user_id = ? ORDER BY subject_ru"
  ).all(req.targetStudent.id).map((a) => ({
    subjectId: a.subject_id,
    subject: bi(a.subject_kz, a.subject_ru),
    total: a.total,
    attended: a.attended,
  }));
  res.json({ user: rowUser(req.targetStudent), attendance: rows });
});

router.patch("/students/:studentId/attendance/:subjectId", requireStudentByExternalId, (req, res) => {
  const total = Number(req.body && req.body.total);
  const attended = Number(req.body && req.body.attended);
  if (
    !Number.isFinite(total) ||
    !Number.isFinite(attended) ||
    total < 0 ||
    attended < 0 ||
    attended > total
  )
    return res.status(400).json({ error: "invalid_input" });
  const info = db.prepare(
    "UPDATE attendance SET total = ?, attended = ? WHERE user_id = ? AND subject_id = ?"
  ).run(total, attended, req.targetStudent.id, req.params.subjectId);
  if (!info.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

router.get("/students/:studentId/homework", requireStudentByExternalId, (req, res) => {
  const rows = db.prepare(
    `SELECT h.*, hs.status, hs.file_path, hs.score
     FROM hw_submissions hs
     JOIN homework h ON h.id = hs.homework_id
     WHERE hs.user_id = ?
     ORDER BY h.deadline, h.id`
  ).all(req.targetStudent.id).map((h) => ({
    id: h.id,
    subjectId: h.subject_id,
    subject: bi(h.subject_kz, h.subject_ru),
    title: bi(h.title_kz, h.title_ru),
    deadline: h.deadline,
    status: h.status,
    score: h.score,
    hasFile: !!h.file_path,
  }));
  res.json({ user: rowUser(req.targetStudent), homework: rows });
});

router.get("/students/:studentId/exams", requireStudentByExternalId, (req, res) => {
  const exams = db.prepare(
    `SELECT e.*, r.result
     FROM exams e
     LEFT JOIN exam_results r ON r.exam_id = e.id AND r.user_id = ?
     ORDER BY e.date, e.time, e.id`
  ).all(req.targetStudent.id).map((e) => ({
    id: e.id,
    subject: bi(e.subject_kz, e.subject_ru),
    date: e.date,
    time: e.time,
    room: e.room,
    result: e.result === undefined ? null : e.result,
    canGrade: canGradeExam(e.date),
  }));
  res.json({ user: rowUser(req.targetStudent), exams });
});

router.patch("/students/:studentId/exams/:examId", requireStudentByExternalId, (req, res) => {
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(req.params.examId);
  if (!exam) return res.status(404).json({ error: "not_found" });
  if (!canGradeExam(exam.date)) return res.status(400).json({ error: "exam_not_completed" });

  const raw = req.body ? req.body.result : undefined;
  const result = raw === null || raw === "" ? null : Number(raw);
  if (result !== null && (!Number.isFinite(result) || result < 0 || result > 100)) {
    return res.status(400).json({ error: "invalid_input" });
  }

  db.prepare(
    "INSERT OR IGNORE INTO exam_results (user_id, exam_id, result) VALUES (?, ?, NULL)"
  ).run(req.targetStudent.id, exam.id);
  db.prepare(
    "UPDATE exam_results SET result = ? WHERE user_id = ? AND exam_id = ?"
  ).run(result, req.targetStudent.id, exam.id);
  res.json({ ok: true });
});

router.get("/homework", (req, res) => {
  const rows = db.prepare(
    `SELECT h.*,
      (SELECT COUNT(*) FROM hw_submissions hs WHERE hs.homework_id = h.id) submission_count
     FROM homework h ORDER BY h.deadline, h.id`
  ).all().map((h) => ({
    id: h.id,
    subjectId: h.subject_id,
    subject: bi(h.subject_kz, h.subject_ru),
    title: bi(h.title_kz, h.title_ru),
    deadline: h.deadline,
    submissionCount: h.submission_count,
  }));
  res.json({ homework: rows });
});

router.post("/homework", (req, res) => {
  const subject = requireSubject(req.body && req.body.subjectId);
  const title = String(req.body && req.body.title || "").trim();
  const deadline = String(req.body && req.body.deadline || "").trim();
  if (!subject || !title || !isIsoDate(deadline) || isPastDate(deadline)) {
    return res.status(400).json({ error: "invalid_input" });
  }

  const id = `hw-${Date.now().toString(36)}`;
  db.prepare(
    `INSERT INTO homework (id,subject_id,subject_kz,subject_ru,title_kz,title_ru,deadline)
     VALUES (?,?,?,?,?,?,?)`
  ).run(id, subject.id, subject.name_kz, subject.name_ru, title, title, deadline);

  const students = db.prepare("SELECT id FROM users WHERE role = 'student'").all();
  const ins = db.prepare(
    "INSERT INTO hw_submissions (user_id,homework_id,status,file_path,score) VALUES (?,?,?,?,?)"
  );
  const tx = db.transaction(() => {
    for (const student of students) ins.run(student.id, id, "pending", null, 0);
  });
  tx();
  res.json({ ok: true, id });
});

router.get("/homework/:id/submissions", (req, res) => {
  const rows = db.prepare(
    `SELECT u.name_kz, u.name_ru, u.student_id, hs.status, hs.score, hs.file_path
     FROM hw_submissions hs
     JOIN users u ON u.id = hs.user_id
     WHERE hs.homework_id = ? AND u.role = 'student'
     ORDER BY u.student_id`
  ).all(req.params.id).map((r) => ({
    studentId: r.student_id,
    name: bi(r.name_kz, r.name_ru),
    status: r.status,
    score: r.score,
    hasFile: !!r.file_path,
  }));
  res.json({ submissions: rows });
});

router.patch("/homework/:id/submissions/:studentId", (req, res) => {
  const student = getStudentByExternalId(req.params.studentId);
  if (!student) return res.status(404).json({ error: "student_not_found" });
  const status = req.body && req.body.status ? String(req.body.status) : null;
  const score = req.body && req.body.score !== undefined ? Number(req.body.score) : null;
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const current = db.prepare(
    "SELECT * FROM hw_submissions WHERE user_id = ? AND homework_id = ?"
  ).get(student.id, req.params.id);
  if (!current) return res.status(404).json({ error: "not_found" });

  const nextStatus = status || current.status;
  const nextScore = score === null || !Number.isFinite(score) ? current.score : score;
  db.prepare(
    "UPDATE hw_submissions SET status = ?, score = ? WHERE user_id = ? AND homework_id = ?"
  ).run(nextStatus, nextScore, student.id, req.params.id);
  res.json({ ok: true });
});

router.get("/homework/:id/submissions/:studentId/download", (req, res) => {
  const student = getStudentByExternalId(req.params.studentId);
  if (!student) return res.status(404).json({ error: "student_not_found" });
  const row = db.prepare(
    "SELECT file_path FROM hw_submissions WHERE user_id = ? AND homework_id = ?"
  ).get(student.id, req.params.id);
  if (!row || !row.file_path || !fs.existsSync(row.file_path))
    return res.status(404).json({ error: "not_found" });
  res.download(row.file_path);
});

router.get("/files", (req, res) => {
  const rows = db.prepare("SELECT * FROM materials ORDER BY date DESC, id DESC").all().map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    subject: bi(f.subject_kz, f.subject_ru),
    size: f.size,
    date: f.date,
    hasFile: !!f.file_path,
  }));
  res.json({ files: rows });
});

router.post("/files", upload.single("file"), (req, res) => {
  const subject = requireSubject(req.body && req.body.subjectId);
  if (!req.file || !subject) return res.status(400).json({ error: "invalid_input" });
  const id = `mat-${Date.now().toString(36)}`;
  db.prepare(
    `INSERT INTO materials (id,name,type,subject_kz,subject_ru,size,date,file_path)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    id,
    req.file.originalname,
    materialType(req.file.originalname),
    subject.name_kz,
    subject.name_ru,
    formatSize(req.file.size),
    new Date().toISOString().slice(0, 10),
    req.file.path
  );
  res.json({ ok: true, id });
});

router.delete("/files/:id", (req, res) => {
  const file = db.prepare("SELECT * FROM materials WHERE id = ?").get(req.params.id);
  if (!file) return res.status(404).json({ error: "not_found" });
  deleteStoredFile(file.file_path);
  db.prepare("DELETE FROM materials WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/files/:id/download", (req, res) => {
  const file = db.prepare("SELECT * FROM materials WHERE id = ?").get(req.params.id);
  if (!file || !file.file_path || !fs.existsSync(file.file_path))
    return res.status(404).json({ error: "not_found" });
  res.download(file.file_path, file.name);
});

router.get("/exams", (req, res) => {
  const exams = db.prepare("SELECT * FROM exams ORDER BY date, time, id").all().map((e) => ({
    id: e.id,
    subject: bi(e.subject_kz, e.subject_ru),
    date: e.date,
    time: e.time,
    room: e.room,
  }));
  res.json({ exams });
});

router.post("/exams", (req, res) => {
  const subject = requireSubject(req.body && req.body.subjectId);
  const date = String(req.body && req.body.date || "").trim();
  const time = String(req.body && req.body.time || "").trim();
  const room = String(req.body && req.body.room || "").trim();
  if (!subject || !isIsoDate(date) || isPastDate(date) || !time || !room) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const info = db.prepare(
    "INSERT INTO exams (subject_kz,subject_ru,date,time,room) VALUES (?,?,?,?,?)"
  ).run(subject.name_kz, subject.name_ru, date, time, room);
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.patch("/exams/:id", (req, res) => {
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(req.params.id);
  if (!exam) return res.status(404).json({ error: "not_found" });
  const subject = req.body && req.body.subjectId ? requireSubject(req.body.subjectId) : null;
  const next = {
    subject_kz: subject ? subject.name_kz : exam.subject_kz,
    subject_ru: subject ? subject.name_ru : exam.subject_ru,
    date: String(req.body && req.body.date || exam.date).trim(),
    time: String(req.body && req.body.time || exam.time).trim(),
    room: String(req.body && req.body.room || exam.room).trim(),
  };
  if (!isIsoDate(next.date) || isPastDate(next.date) || !next.time || !next.room) {
    return res.status(400).json({ error: "invalid_input" });
  }
  db.prepare(
    "UPDATE exams SET subject_kz = ?, subject_ru = ?, date = ?, time = ?, room = ? WHERE id = ?"
  ).run(next.subject_kz, next.subject_ru, next.date, next.time, next.room, req.params.id);
  res.json({ ok: true });
});

router.delete("/exams/:id", (req, res) => {
  db.prepare("DELETE FROM exam_results WHERE exam_id = ?").run(req.params.id);
  const info = db.prepare("DELETE FROM exams WHERE id = ?").run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

router.get("/chats", (req, res) => {
  const students = db.prepare(
    "SELECT * FROM users WHERE role = 'student' ORDER BY student_id"
  ).all();
  const msgStmt = db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY id");
  const chats = students.map((student) => {
    const chat = ensureAdminChat(student.id);
    return {
      user: rowUser(student),
      chatId: chat.id,
      messages: msgStmt.all(chat.id).map((m) => ({
        from: m.sender === "me" ? "student" : "admin",
        author: bi(m.author_kz, m.author_ru),
        text: bi(m.text_kz, m.text_ru),
        time: m.time,
      })),
    };
  });
  res.json({ chats });
});

router.post("/chats/:studentId/messages", requireStudentByExternalId, (req, res) => {
  const text = String(req.body && req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "empty" });
  const chat = ensureAdminChat(req.targetStudent.id);
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  db.prepare(
    `INSERT INTO messages (chat_id,sender,author_kz,author_ru,text_kz,text_ru,time,created_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    chat.id,
    "them",
    "Администратор",
    "Администратор",
    text,
    text,
    `${hh}:${mm}`,
    now.toISOString()
  );
  res.json({ ok: true });
});

router.get("/content", (req, res) => {
  const news = db.prepare("SELECT * FROM news ORDER BY date DESC, id DESC").all().map((n) => ({
    id: n.id,
    title: bi(n.title_kz, n.title_ru),
    text: bi(n.text_kz, n.text_ru),
    date: n.date,
    tag: bi(n.tag_kz, n.tag_ru),
  }));
  const announcements = db.prepare(
    "SELECT * FROM announcements ORDER BY date DESC, id DESC"
  ).all().map((a) => ({
    id: a.id,
    text: bi(a.text_kz, a.text_ru),
    date: a.date,
    type: a.type,
  }));
  res.json({ news, announcements });
});

router.post("/news", (req, res) => {
  const title = String(req.body && req.body.title || "").trim();
  const text = String(req.body && req.body.text || "").trim();
  const tag = String(req.body && req.body.tag || "").trim();
  const date = String(req.body && req.body.date || "").trim();
  if (!title || !text || !tag || !isIsoDate(date) || isPastDate(date)) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const id = `news-${Date.now().toString(36)}`;
  db.prepare(
    `INSERT INTO news (id,title_kz,title_ru,text_kz,text_ru,date,tag_kz,tag_ru)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(id, title, title, text, text, date, tag, tag);
  res.json({ ok: true, id });
});

router.delete("/news/:id", (req, res) => {
  const info = db.prepare("DELETE FROM news WHERE id = ?").run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

router.post("/announcements", (req, res) => {
  const text = String(req.body && req.body.text || "").trim();
  const type = String(req.body && req.body.type || "").trim();
  const date = String(req.body && req.body.date || "").trim();
  if (!text || !isIsoDate(date) || isPastDate(date) || !["info", "warning"].includes(type))
    return res.status(400).json({ error: "invalid_input" });
  const id = `ann-${Date.now().toString(36)}`;
  db.prepare(
    "INSERT INTO announcements (id,text_kz,text_ru,date,type) VALUES (?,?,?,?,?)"
  ).run(id, text, text, date, type);
  res.json({ ok: true, id });
});

router.delete("/announcements/:id", (req, res) => {
  const info = db.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

module.exports = router;
