const express = require("express");
const fs = require("fs");
const db = require("../db");
const { requireStudent } = require("../auth");
const { upload } = require("../lib/upload");

const router = express.Router();
router.use(requireStudent);
const bi = (kz, ru) => ({ kz, ru });

function deleteStoredFile(filePath) {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

router.get("/homework", (req, res) => {
  const rows = db.prepare(
    `SELECT h.*, hs.status, hs.file_path, hs.score FROM hw_submissions hs
     JOIN homework h ON h.id = hs.homework_id WHERE hs.user_id = ? ORDER BY h.deadline`
  ).all(req.session.userId);
  res.json(rows.map((h) => ({
    id: h.id, subject: bi(h.subject_kz, h.subject_ru), title: bi(h.title_kz, h.title_ru),
    deadline: h.deadline, status: h.status, hasFile: !!h.file_path, score: h.score,
  })));
});

router.post("/homework/:id/file", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });
  const current = db.prepare(
    "SELECT status, file_path FROM hw_submissions WHERE user_id = ? AND homework_id = ?"
  ).get(req.session.userId, req.params.id);
  if (!current) return res.status(404).json({ error: "not_found" });
  if (current.status !== "pending") {
    deleteStoredFile(req.file.path);
    return res.status(409).json({ error: "already_submitted" });
  }
  deleteStoredFile(current.file_path);
  db.prepare(
    "UPDATE hw_submissions SET file_path = ? WHERE user_id = ? AND homework_id = ?"
  ).run(req.file.path, req.session.userId, req.params.id);
  res.json({ ok: true, hasFile: true, status: "pending" });
});

router.delete("/homework/:id/file", (req, res) => {
  const current = db.prepare(
    "SELECT status, file_path FROM hw_submissions WHERE user_id = ? AND homework_id = ?"
  ).get(req.session.userId, req.params.id);
  if (!current) return res.status(404).json({ error: "not_found" });
  if (current.status !== "pending") return res.status(409).json({ error: "already_submitted" });
  deleteStoredFile(current.file_path);
  db.prepare(
    "UPDATE hw_submissions SET file_path = NULL WHERE user_id = ? AND homework_id = ?"
  ).run(req.session.userId, req.params.id);
  res.json({ ok: true, hasFile: false, status: "pending" });
});

router.post("/homework/:id/submit", upload.single("file"), (req, res) => {
  const current = db.prepare(
    "SELECT status, file_path FROM hw_submissions WHERE user_id = ? AND homework_id = ?"
  ).get(req.session.userId, req.params.id);
  if (!current) {
    if (req.file) deleteStoredFile(req.file.path);
    return res.status(404).json({ error: "not_found" });
  }
  if (current.status !== "pending") {
    if (req.file) deleteStoredFile(req.file.path);
    return res.status(409).json({ error: "already_submitted" });
  }
  const filePath = req.file ? req.file.path : current.file_path;
  if (!filePath) return res.status(400).json({ error: "no_file" });
  if (req.file) deleteStoredFile(current.file_path);
  db.prepare(
    "UPDATE hw_submissions SET status = 'submitted', file_path = ? WHERE user_id = ? AND homework_id = ?"
  ).run(filePath, req.session.userId, req.params.id);
  res.json({ ok: true, status: "submitted", hasFile: true });
});

module.exports = router;
