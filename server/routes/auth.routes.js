const express = require("express");
const db = require("../db");
const { verifyPassword, requireAuth } = require("../auth");

const router = express.Router();

function publicUser(u) {
  return { id: u.id, email: u.email, role: u.role, name: { kz: u.name_kz, ru: u.name_ru },
    group: u.group, studentId: u.student_id, course: u.course };
}

const normEmail = (e) => String(e || "").trim().toLowerCase();

// Регенерируем сессию перед записью userId (защита от session fixation), затем сохраняем.
function establishSession(req, res, userId, payload) {
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "session" });
    req.session.userId = userId;
    req.session.role = payload.role;
    req.session.save((err2) => {
      if (err2) return res.status(500).json({ error: "session" });
      res.json(payload);
    });
  });
}

router.post("/register", (_req, res) => {
  res.status(403).json({ error: "registration_disabled" });
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normEmail(req.body && req.body.email);
    const { password } = req.body || {};
    const u = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!u || !(await verifyPassword(password || "", u.password_hash)))
      return res.status(401).json({ error: "bad_credentials" });
    establishSession(req, res, u.id, publicUser(u));
  } catch (e) { next(e); }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", requireAuth, (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  if (!u) return res.status(401).json({ error: "unauthorized" });
  res.json(publicUser(u));
});

module.exports = router;
