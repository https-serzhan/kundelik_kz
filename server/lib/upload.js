const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");

const ALLOWED = new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg"]);
const UPLOAD_ROOT = process.env.KUNDELIK_UPLOADS || path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_ROOT, String(req.session.userId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(12).toString("hex") + ext); // защита от path traversal
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, ALLOWED.has(ext));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
module.exports = { upload, UPLOAD_ROOT };
