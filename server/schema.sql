-- Общие таблицы (уровень вуза)
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name_kz TEXT NOT NULL, name_ru TEXT NOT NULL,
  teacher_kz TEXT NOT NULL, teacher_ru TEXT NOT NULL,
  credits INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day INTEGER NOT NULL, time TEXT NOT NULL,
  subject_kz TEXT NOT NULL, subject_ru TEXT NOT NULL,
  teacher_kz TEXT NOT NULL, teacher_ru TEXT NOT NULL,
  room TEXT NOT NULL, mode TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title_kz TEXT, title_ru TEXT, text_kz TEXT, text_ru TEXT,
  date TEXT, tag_kz TEXT, tag_ru TEXT
);
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  text_kz TEXT, text_ru TEXT, date TEXT, type TEXT
);
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_kz TEXT NOT NULL, subject_ru TEXT NOT NULL,
  date TEXT NOT NULL, time TEXT NOT NULL, room TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS homework (
  id TEXT PRIMARY KEY,
  subject_id TEXT,
  subject_kz TEXT, subject_ru TEXT,
  title_kz TEXT, title_ru TEXT, deadline TEXT
);
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, type TEXT NOT NULL,
  subject_kz TEXT, subject_ru TEXT,
  size TEXT, date TEXT, file_path TEXT
);

-- Личные таблицы
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  name_kz TEXT NOT NULL, name_ru TEXT NOT NULL,
  "group" TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course INTEGER NOT NULL DEFAULT 1,
  faculty_kz TEXT, faculty_ru TEXT,
  phone TEXT, photo TEXT, photo_path TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS grades (
  user_id INTEGER NOT NULL,
  subject_id TEXT NOT NULL,
  midterm INTEGER NOT NULL, final INTEGER NOT NULL,
  PRIMARY KEY (user_id, subject_id)
);
CREATE TABLE IF NOT EXISTS student_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day INTEGER NOT NULL, time TEXT NOT NULL,
  subject_id TEXT,
  subject_kz TEXT NOT NULL, subject_ru TEXT NOT NULL,
  teacher_kz TEXT NOT NULL, teacher_ru TEXT NOT NULL,
  room TEXT NOT NULL, mode TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance (
  user_id INTEGER NOT NULL,
  subject_id TEXT,
  subject_kz TEXT, subject_ru TEXT,
  total INTEGER NOT NULL, attended INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hw_submissions (
  user_id INTEGER NOT NULL,
  homework_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, homework_id)
);
CREATE TABLE IF NOT EXISTS exam_results (
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  result INTEGER,
  PRIMARY KEY (user_id, exam_id)
);
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  name_kz TEXT, name_ru TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  author_kz TEXT, author_ru TEXT,
  text_kz TEXT, text_ru TEXT,
  time TEXT,
  created_at TEXT NOT NULL
);
