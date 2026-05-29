const express = require("express");
const fs = require("fs");
const db = require("../db");
const { requireStudent } = require("../auth");
const { subjectTotal, computeGPA } = require("../lib/gpa");
const { upload } = require("../lib/upload");

const router = express.Router();
router.use(requireStudent);

const bi = (kz, ru) => ({ kz, ru });

function gradesRows(userId) {
  return db.prepare(
    `SELECT s.id, s.name_kz, s.name_ru, s.teacher_kz, s.teacher_ru, s.credits, g.midterm, g.final
     FROM grades g JOIN subjects s ON s.id = g.subject_id WHERE g.user_id = ? ORDER BY s.id`
  ).all(userId);
}

function scheduleRows(userId) {
  const personal = db.prepare(
    "SELECT * FROM student_schedule WHERE user_id = ? ORDER BY day, time, id"
  ).all(userId);
  if (personal.length) return personal;
  return db.prepare("SELECT * FROM schedule ORDER BY day, time, id").all();
}

router.get("/grades", (req, res) => {
  const rows = gradesRows(req.session.userId);
  const subjects = rows.map((r) => ({
    id: r.id, name: bi(r.name_kz, r.name_ru), teacher: bi(r.teacher_kz, r.teacher_ru),
    credits: r.credits, midterm: r.midterm, final: r.final, total: subjectTotal(r.midterm, r.final),
  }));
  res.json({ subjects, gpa: computeGPA(rows) });
});

router.get("/schedule", (req, res) => {
  const rows = scheduleRows(req.session.userId);
  res.json(rows.map((l) => ({
    day: l.day, time: l.time, room: l.room, mode: l.mode,
    subject: bi(l.subject_kz, l.subject_ru), teacher: bi(l.teacher_kz, l.teacher_ru),
  })));
});

router.get("/attendance", (req, res) => {
  const rows = db.prepare("SELECT * FROM attendance WHERE user_id = ?").all(req.session.userId);
  res.json(rows.map((a) => ({ subject: bi(a.subject_kz, a.subject_ru), total: a.total, attended: a.attended })));
});

router.get("/exams", (req, res) => {
  const rows = db.prepare(
    `SELECT e.*, r.result FROM exams e
     LEFT JOIN exam_results r ON r.exam_id = e.id AND r.user_id = ? ORDER BY e.date`
  ).all(req.session.userId);
  res.json(rows.map((e) => ({
    id: e.id, subject: bi(e.subject_kz, e.subject_ru), date: e.date, time: e.time, room: e.room,
    result: e.result === undefined ? null : e.result,
  })));
});

router.get("/news", (req, res) => {
  const rows = db.prepare("SELECT * FROM news ORDER BY date DESC").all();
  res.json(rows.map((n) => ({
    id: n.id, title: bi(n.title_kz, n.title_ru), text: bi(n.text_kz, n.text_ru),
    date: n.date, tag: bi(n.tag_kz, n.tag_ru),
  })));
});

router.get("/announcements", (req, res) => {
  const rows = db.prepare("SELECT * FROM announcements ORDER BY date DESC").all();
  res.json(rows.map((a) => ({ id: a.id, text: bi(a.text_kz, a.text_ru), date: a.date, type: a.type })));
});

router.get("/profile", (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  res.json({
    name: bi(u.name_kz, u.name_ru), group: u.group, studentId: u.student_id, course: u.course,
    faculty: bi(u.faculty_kz, u.faculty_ru), email: u.email, phone: u.phone,
    photo: u.photo, photoUrl: u.photo_path ? `/api/profile/photo/${u.id}` : null,
  });
});

router.patch("/profile", (req, res) => {
  const { phone } = req.body || {};
  if (typeof phone === "string")
    db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(phone, req.session.userId);
  res.json({ ok: true });
});

router.get("/home", (req, res) => {
  const uid = req.session.userId;
  const rows = gradesRows(uid);
  const gpa = computeGPA(rows);

  const att = db.prepare("SELECT total, attended FROM attendance WHERE user_id = ?").all(uid);
  const avgAtt = att.length
    ? Math.round(att.reduce((s, a) => s + (a.total ? (a.attended / a.total) * 100 : 0), 0) / att.length) : 0;

  const pending = db.prepare(
    "SELECT COUNT(*) c FROM hw_submissions WHERE user_id = ? AND status = 'pending'"
  ).get(uid).c;

  const upcomingHw = db.prepare(
    `SELECT h.id, h.subject_kz, h.subject_ru, h.title_kz, h.title_ru, h.deadline
     FROM hw_submissions hs JOIN homework h ON h.id = hs.homework_id
     WHERE hs.user_id = ? AND hs.status = 'pending' ORDER BY h.deadline LIMIT 4`
  ).all(uid).map((h) => ({
    id: h.id, subject: bi(h.subject_kz, h.subject_ru), title: bi(h.title_kz, h.title_ru), deadline: h.deadline,
  }));

  const nextExamRow = db.prepare(
    `SELECT e.*, r.result FROM exams e
     LEFT JOIN exam_results r ON r.exam_id = e.id AND r.user_id = ?
     WHERE r.result IS NULL ORDER BY e.date LIMIT 1`
  ).get(uid);
  const nextExam = nextExamRow
    ? { subject: bi(nextExamRow.subject_kz, nextExamRow.subject_ru), date: nextExamRow.date } : null;

  const schedule = scheduleRows(uid)
    .map((l) => ({ day: l.day, time: l.time, room: l.room, mode: l.mode,
      subject: bi(l.subject_kz, l.subject_ru), teacher: bi(l.teacher_kz, l.teacher_ru) }));

  const news = db.prepare("SELECT * FROM news ORDER BY date DESC").all()
    .map((n) => ({ id: n.id, title: bi(n.title_kz, n.title_ru), text: bi(n.text_kz, n.text_ru), date: n.date, tag: bi(n.tag_kz, n.tag_ru) }));

  const announcements = db.prepare("SELECT * FROM announcements ORDER BY date DESC").all()
    .map((a) => ({ id: a.id, text: bi(a.text_kz, a.text_ru), date: a.date, type: a.type }));

  res.json({ gpa, avgAtt, pending, nextExam, todayLessons: schedule, upcomingHw, news, announcements });
});

router.post("/profile/photo", upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });
  db.prepare("UPDATE users SET photo_path = ? WHERE id = ?").run(req.file.path, req.session.userId);
  res.json({ ok: true, photoUrl: `/api/profile/photo/${req.session.userId}` });
});

router.get("/profile/photo/:id", (req, res) => {
  // Только своё фото (защита от перебора чужих id — IDOR).
  if (Number(req.params.id) !== req.session.userId) return res.status(403).end();
  const u = db.prepare("SELECT photo_path FROM users WHERE id = ?").get(req.session.userId);
  if (!u || !u.photo_path || !fs.existsSync(u.photo_path)) return res.status(404).end();
  res.sendFile(u.photo_path);
});

module.exports = router;
