const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.KUNDELIK_DB || path.join(__dirname, "..", "kundelik.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some((col) => col.name === "role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");
}

const homeworkColumns = db.prepare("PRAGMA table_info(homework)").all();
if (!homeworkColumns.some((col) => col.name === "subject_id")) {
  db.exec("ALTER TABLE homework ADD COLUMN subject_id TEXT");
}

const attendanceColumns = db.prepare("PRAGMA table_info(attendance)").all();
if (!attendanceColumns.some((col) => col.name === "subject_id")) {
  db.exec("ALTER TABLE attendance ADD COLUMN subject_id TEXT");
}

const hwSubmissionColumns = db.prepare("PRAGMA table_info(hw_submissions)").all();
if (!hwSubmissionColumns.some((col) => col.name === "score")) {
  db.exec("ALTER TABLE hw_submissions ADD COLUMN score INTEGER NOT NULL DEFAULT 0");
}

module.exports = db;
