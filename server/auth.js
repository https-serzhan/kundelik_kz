const bcrypt = require("bcrypt");
const db = require("./db");

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
function hashPasswordSync(plain) {
  return bcrypt.hashSync(plain, 10);
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function sessionUser(req) {
  if (!req.session || !req.session.userId) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId) || null;
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId)
    return res.status(401).json({ error: "unauthorized" });
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId)
      return res.status(401).json({ error: "unauthorized" });
    const user = sessionUser(req);
    if (!user) return res.status(401).json({ error: "unauthorized" });
    req.user = user;
    if (user.role !== role) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

const requireAdmin = requireRole("admin");
const requireStudent = requireRole("student");

module.exports = {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  sessionUser,
  requireAuth,
  requireAdmin,
  requireStudent,
};
