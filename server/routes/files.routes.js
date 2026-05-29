const express = require("express");
const fs = require("fs");
const db = require("../db");
const { requireStudent } = require("../auth");

const router = express.Router();
router.use(requireStudent);
const bi = (kz, ru) => ({ kz, ru });

router.get("/files", (req, res) => {
  const rows = db.prepare("SELECT * FROM materials ORDER BY date DESC").all();
  res.json(rows.map((f) => ({
    id: f.id, name: f.name, type: f.type, subject: bi(f.subject_kz, f.subject_ru),
    size: f.size, date: f.date,
  })));
});

router.get("/files/:id/download", (req, res) => {
  const f = db.prepare("SELECT * FROM materials WHERE id = ?").get(req.params.id);
  if (!f) return res.status(404).json({ error: "not_found" });
  if (f.file_path && fs.existsSync(f.file_path)) return res.download(f.file_path, f.name);
  // seed-материалы без реального файла: отдать заглушку-текст
  res.setHeader("Content-Disposition", `attachment; filename="${f.name}"`);
  res.type("text/plain").send(`Демо-файл: ${f.name}\n(заглушка материала «${f.subject_kz}»)`);
});

module.exports = router;
