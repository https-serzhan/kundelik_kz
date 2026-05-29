# Күнделік Fullstack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить статический SPA-мокап «Күнделік» в полноценное веб-приложение с Node/Express бэкендом, SQLite, авторизацией и сохранением данных.

**Architecture:** Один Node-процесс (Express) отдаёт статику из `public/` и REST API под `/api/*`. Данные в SQLite через `better-sqlite3`. Сессия — cookie через `express-session` + `connect-sqlite3`. Пароли — `bcrypt`. Файлы (ДЗ, фото) — `multer` на диск в `uploads/`. API возвращает текстовые поля в виде `{kz, ru}` — чтобы существующие рендер-функции фронта (использующие `tr()`) менялись минимально.

**Tech Stack:** Node.js, Express, better-sqlite3, express-session, connect-sqlite3, bcrypt, multer, supertest + node:test (тесты).

---

## File Structure

```
kundelik/
├─ server/
│  ├─ index.js              # express app, статика, сессия, монтаж роутов
│  ├─ db.js                 # better-sqlite3 connection (singleton)
│  ├─ schema.sql            # CREATE TABLE ...
│  ├─ seed.js               # наполнение общих таблиц + функция seedUser()
│  ├─ auth.js               # hashPassword, verifyPassword, requireAuth
│  ├─ data/
│  │  └─ template.js        # демо-данные (бывший DB из js/data.js)
│  └─ routes/
│     ├─ auth.routes.js     # register/login/logout/me
│     ├─ data.routes.js     # home/profile/grades/schedule/attendance/exams/news/announcements
│     ├─ homework.routes.js # list + submit (multipart)
│     ├─ files.routes.js    # list + download
│     └─ chat.routes.js     # list + post message
├─ public/                  # бывший фронт (index.html, css/, js/)
│  └─ js/
│     ├─ api.js             # NEW: fetch-обёртки
│     ├─ data.js            # только helper'ы (GRADE_SCALE, gradeFor, ...)
│     ├─ i18n.js            # + строки auth
│     └─ app.js             # async views + auth-экраны
├─ uploads/                 # gitignore
├─ kundelik.db              # gitignore
├─ sessions.db              # gitignore
├─ test/
│  ├─ auth.test.js
│  ├─ data.test.js
│  └─ isolation.test.js
├─ .gitignore
└─ package.json
```

**Responsibilities:**
- `db.js` — единственное место открытия БД; экспортирует `db`.
- `schema.sql` — вся DDL; применяется при старте, если таблиц нет.
- `data/template.js` — статичные демо-данные (общие + личный шаблон).
- `seed.js` — `seedCommon()` (один раз) и `seedUser(userId)` (при регистрации).
- `auth.js` — хеши + middleware `requireAuth`.
- `routes/*` — каждый файл = один экран/группа эндпоинтов.
- API-слой собирает `name_kz/name_ru` → `{kz, ru}` через хелпер `bi()`.

---

## Task 1: Scaffold проекта

**Files:**
- Create: `package.json`, `.gitignore`
- Move: `index.html`, `css/`, `js/` → `public/`

- [ ] **Step 1: git init (репозиторий ещё не создан)**

```bash
cd /Users/ierus/Documents/outsorse/kundelik
git init
git add -A
git commit -m "chore: snapshot static prototype before fullstack"
```

- [ ] **Step 2: Перенести фронт в public/**

```bash
mkdir -p public
git mv index.html public/index.html
git mv css public/css
git mv js public/js
```

- [ ] **Step 3: Создать `.gitignore`**

```
node_modules/
uploads/
*.db
*.db-journal
.DS_Store
```

- [ ] **Step 4: Создать `package.json`**

```json
{
  "name": "kundelik",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node server/index.js",
    "seed": "node server/seed.js",
    "test": "node --test"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "connect-sqlite3": "^0.9.15",
    "bcrypt": "^5.1.1",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 5: Установить зависимости**

Run: `npm install`
Expected: `node_modules/` создан, без ошибок сборки `better-sqlite3`/`bcrypt`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold node/express project, move front to public"
```

---

## Task 2: Схема БД + соединение

**Files:**
- Create: `server/schema.sql`, `server/db.js`

- [ ] **Step 1: `server/schema.sql`**

```sql
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
CREATE TABLE IF NOT EXISTS attendance (
  user_id INTEGER NOT NULL,
  subject_kz TEXT, subject_ru TEXT,
  total INTEGER NOT NULL, attended INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hw_submissions (
  user_id INTEGER NOT NULL,
  homework_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT,
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
```

- [ ] **Step 2: `server/db.js`**

```js
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.KUNDELIK_DB || path.join(__dirname, "..", "kundelik.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

module.exports = db;
```

- [ ] **Step 3: Smoke-проверка**

Run: `node -e "require('./server/db.js'); console.log('db ok')"`
Expected: печатает `db ok`, создаётся `kundelik.db`.

- [ ] **Step 4: Commit**

```bash
git add server/schema.sql server/db.js
git commit -m "feat: sqlite schema and connection"
```

---

## Task 3: Демо-данные + seed

**Files:**
- Create: `server/data/template.js`, `server/seed.js`

- [ ] **Step 1: `server/data/template.js`**

Скопировать объект `DB` целиком из старого `public/js/data.js` (значения уже в репозитории) и экспортировать. Сохранить структуру `{kz, ru}` как есть.

```js
// Демо-данные: бывший DB из data.js. Используется для seedCommon и seedUser.
const TEMPLATE = {
  student: { /* ...скопировать из public/js/data.js DB.student... */ },
  subjects: [ /* ...DB.subjects... */ ],
  schedule: [ /* ...DB.schedule... */ ],
  homework: [ /* ...DB.homework (с полем status)... */ ],
  attendance: [ /* ...DB.attendance... */ ],
  chats: [ /* ...DB.chats... */ ],
  files: [ /* ...DB.files... */ ],
  exams: [ /* ...DB.exams (result оставить, разнесём в exam_results)... */ ],
  news: [ /* ...DB.news... */ ],
  announcements: [ /* ...DB.announcements... */ ],
};
module.exports = TEMPLATE;
```

- [ ] **Step 2: `server/seed.js`**

```js
const db = require("./db");
const T = require("./data/template");

// Идемпотентный seed общих таблиц (subjects, schedule, news, ...).
function seedCommon() {
  const count = db.prepare("SELECT COUNT(*) c FROM subjects").get().c;
  if (count > 0) return; // уже посеяно

  const tx = db.transaction(() => {
    const subj = db.prepare(
      `INSERT INTO subjects (id,name_kz,name_ru,teacher_kz,teacher_ru,credits)
       VALUES (@id,@name_kz,@name_ru,@teacher_kz,@teacher_ru,@credits)`
    );
    for (const s of T.subjects)
      subj.run({ id: s.id, name_kz: s.name.kz, name_ru: s.name.ru,
        teacher_kz: s.teacher.kz, teacher_ru: s.teacher.ru, credits: s.credits });

    const sch = db.prepare(
      `INSERT INTO schedule (day,time,subject_kz,subject_ru,teacher_kz,teacher_ru,room,mode)
       VALUES (@day,@time,@subject_kz,@subject_ru,@teacher_kz,@teacher_ru,@room,@mode)`
    );
    for (const l of T.schedule)
      sch.run({ day: l.day, time: l.time, subject_kz: l.subject.kz, subject_ru: l.subject.ru,
        teacher_kz: l.teacher.kz, teacher_ru: l.teacher.ru, room: l.room, mode: l.mode });

    const news = db.prepare(
      `INSERT INTO news (id,title_kz,title_ru,text_kz,text_ru,date,tag_kz,tag_ru)
       VALUES (@id,@title_kz,@title_ru,@text_kz,@text_ru,@date,@tag_kz,@tag_ru)`
    );
    for (const n of T.news)
      news.run({ id: n.id, title_kz: n.title.kz, title_ru: n.title.ru,
        text_kz: n.text.kz, text_ru: n.text.ru, date: n.date, tag_kz: n.tag.kz, tag_ru: n.tag.ru });

    const ann = db.prepare(
      `INSERT INTO announcements (id,text_kz,text_ru,date,type) VALUES (@id,@text_kz,@text_ru,@date,@type)`
    );
    for (const a of T.announcements)
      ann.run({ id: a.id, text_kz: a.text.kz, text_ru: a.text.ru, date: a.date, type: a.type });

    const ex = db.prepare(
      `INSERT INTO exams (subject_kz,subject_ru,date,time,room) VALUES (@subject_kz,@subject_ru,@date,@time,@room)`
    );
    for (const e of T.exams)
      ex.run({ subject_kz: e.subject.kz, subject_ru: e.subject.ru, date: e.date, time: e.time, room: e.room });

    const hw = db.prepare(
      `INSERT INTO homework (id,subject_kz,subject_ru,title_kz,title_ru,deadline)
       VALUES (@id,@subject_kz,@subject_ru,@title_kz,@title_ru,@deadline)`
    );
    for (const h of T.homework)
      hw.run({ id: h.id, subject_kz: h.subject.kz, subject_ru: h.subject.ru,
        title_kz: h.title.kz, title_ru: h.title.ru, deadline: h.deadline });

    const mat = db.prepare(
      `INSERT INTO materials (id,name,type,subject_kz,subject_ru,size,date,file_path)
       VALUES (@id,@name,@type,@subject_kz,@subject_ru,@size,@date,@file_path)`
    );
    for (const f of T.files)
      mat.run({ id: f.id, name: f.name, type: f.type, subject_kz: f.subject.kz,
        subject_ru: f.subject.ru, size: f.size, date: f.date, file_path: null });
  });
  tx();
}

// Личный seed нового пользователя: оценки, посещаемость, статусы ДЗ, экзамен-результаты, чаты.
function seedUser(userId) {
  const tx = db.transaction(() => {
    const g = db.prepare(`INSERT INTO grades (user_id,subject_id,midterm,final) VALUES (?,?,?,?)`);
    for (const s of T.subjects) g.run(userId, s.id, s.midterm, s.final);

    const a = db.prepare(
      `INSERT INTO attendance (user_id,subject_kz,subject_ru,total,attended) VALUES (?,?,?,?,?)`
    );
    for (const at of T.attendance) a.run(userId, at.subject.kz, at.subject.ru, at.total, at.attended);

    const hs = db.prepare(`INSERT INTO hw_submissions (user_id,homework_id,status,file_path) VALUES (?,?,?,?)`);
    for (const h of T.homework) hs.run(userId, h.id, h.status || "pending", null);

    // exam_results: связать по порядку seed-экзаменов
    const exRows = db.prepare("SELECT id FROM exams ORDER BY id").all();
    const er = db.prepare(`INSERT INTO exam_results (user_id,exam_id,result) VALUES (?,?,?)`);
    T.exams.forEach((e, i) => { if (exRows[i]) er.run(userId, exRows[i].id, e.result); });

    const c = db.prepare(`INSERT INTO chats (user_id,type,name_kz,name_ru) VALUES (?,?,?,?)`);
    const m = db.prepare(
      `INSERT INTO messages (chat_id,sender,author_kz,author_ru,text_kz,text_ru,time,created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    );
    for (const chat of T.chats) {
      const info = c.run(userId, chat.type, chat.name.kz, chat.name.ru);
      const chatId = info.lastInsertRowid;
      for (const msg of chat.messages)
        m.run(chatId, msg.from, msg.author.kz, msg.author.ru, msg.text.kz, msg.text.ru,
          msg.time, new Date().toISOString());
    }
  });
  tx();
}

module.exports = { seedCommon, seedUser };

if (require.main === module) { seedCommon(); console.log("common seeded"); }
```

- [ ] **Step 3: Проверка seedCommon**

Run: `npm run seed`
Expected: печатает `common seeded`; повторный запуск ничего не дублирует.

Run: `node -e "const db=require('./server/db');console.log(db.prepare('SELECT COUNT(*) c FROM subjects').get())"`
Expected: `{ c: 6 }`

- [ ] **Step 4: Commit**

```bash
git add server/data/template.js server/seed.js
git commit -m "feat: demo data template and seed functions"
```

---

## Task 4: Auth-модуль (хеши + requireAuth)

**Files:**
- Create: `server/auth.js`, `test/auth-unit.test.js`

- [ ] **Step 1: Тест `test/auth-unit.test.js`**

```js
const test = require("node:test");
const assert = require("node:assert");
const { hashPassword, verifyPassword } = require("../server/auth");

test("hash + verify round-trip", async () => {
  const h = await hashPassword("secret123");
  assert.notStrictEqual(h, "secret123");
  assert.strictEqual(await verifyPassword("secret123", h), true);
  assert.strictEqual(await verifyPassword("wrong", h), false);
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `node --test test/auth-unit.test.js`
Expected: FAIL — `Cannot find module '../server/auth'`.

- [ ] **Step 3: `server/auth.js`**

```js
const bcrypt = require("bcrypt");

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId)
    return res.status(401).json({ error: "unauthorized" });
  next();
}

module.exports = { hashPassword, verifyPassword, requireAuth };
```

- [ ] **Step 4: Запустить тест — проходит**

Run: `node --test test/auth-unit.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/auth.js test/auth-unit.test.js
git commit -m "feat: auth helpers (bcrypt hash/verify, requireAuth)"
```

---

## Task 5: Express-приложение + сессия

**Files:**
- Create: `server/index.js`
- Create: `server/app.js` (фабрика приложения — для тестов без `listen`)

- [ ] **Step 1: `server/app.js` (фабрика, без listen)**

```js
const path = require("path");
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const { seedCommon } = require("./seed");

function createApp() {
  seedCommon();
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    store: new SQLiteStore({ db: "sessions.db", dir: path.join(__dirname, "..") }),
    secret: process.env.SESSION_SECRET || "kundelik-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 7 },
  }));

  // Роуты монтируются в Task 6–9:
  app.use("/api/auth", require("./routes/auth.routes"));
  app.use("/api", require("./routes/data.routes"));
  app.use("/api", require("./routes/homework.routes"));
  app.use("/api", require("./routes/files.routes"));
  app.use("/api", require("./routes/chat.routes"));

  app.use(express.static(path.join(__dirname, "..", "public")));
  return app;
}
module.exports = createApp;
```

> Примечание: пока роуты не созданы (Task 6–9) — этот require упадёт. Создаём `server/index.js` сейчас, но первый запуск делаем после Task 6. Чтобы Task 5 коммитился зелёным, временно закомментируй строки `app.use(...require(...))` для несозданных роутов и раскомментируй по мере добавления.

- [ ] **Step 2: `server/index.js`**

```js
const createApp = require("./app");
const PORT = process.env.PORT || 3000;
createApp().listen(PORT, () => console.log(`Күнделік на http://localhost:${PORT}`));
```

- [ ] **Step 3: Commit**

```bash
git add server/app.js server/index.js
git commit -m "feat: express app factory with session store"
```

---

## Task 6: Auth-роуты + тесты

**Files:**
- Create: `server/routes/auth.routes.js`, `test/auth.test.js`

- [ ] **Step 1: Тест `test/auth.test.js`**

```js
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-auth.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

test("register → me → logout flow", async () => {
  const agent = request.agent(app);
  const reg = await agent.post("/api/auth/register")
    .send({ email: "a@x.kz", password: "pass1234", name: "Аян", group: "ИС-21-1" });
  assert.strictEqual(reg.status, 200);

  const me = await agent.get("/api/auth/me");
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.email, "a@x.kz");

  await agent.post("/api/auth/logout");
  const me2 = await agent.get("/api/auth/me");
  assert.strictEqual(me2.status, 401);
});

test("duplicate email → 409", async () => {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ email: "dup@x.kz", password: "pass1234", name: "B", group: "G" });
  const dup = await request(app).post("/api/auth/register")
    .send({ email: "dup@x.kz", password: "pass1234", name: "B", group: "G" });
  assert.strictEqual(dup.status, 409);
});

test("login wrong password → 401", async () => {
  await request(app).post("/api/auth/register").send({ email: "c@x.kz", password: "right123", name: "C", group: "G" });
  const bad = await request(app).post("/api/auth/login").send({ email: "c@x.kz", password: "nope" });
  assert.strictEqual(bad.status, 401);
});
```

- [ ] **Step 2: Запустить — упадёт (нет роутов)**

Run: `node --test test/auth.test.js`
Expected: FAIL — модуль роутов не найден / 404.

- [ ] **Step 3: `server/routes/auth.routes.js`**

```js
const express = require("express");
const db = require("../db");
const { hashPassword, verifyPassword, requireAuth } = require("../auth");
const { seedUser } = require("../seed");

const router = express.Router();

function publicUser(u) {
  return { id: u.id, email: u.email, name: { kz: u.name_kz, ru: u.name_ru },
    group: u.group, studentId: u.student_id, course: u.course };
}

router.post("/register", async (req, res) => {
  const { email, password, name, group } = req.body || {};
  if (!email || !password || password.length < 6 || !name || !group)
    return res.status(400).json({ error: "invalid_input" });

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return res.status(409).json({ error: "email_taken" });

  const hash = await hashPassword(password);
  const studentId = String(Math.floor(100000 + Math.random() * 900000));
  const info = db.prepare(
    `INSERT INTO users (email,password_hash,name_kz,name_ru,"group",student_id,course,faculty_kz,faculty_ru,phone,photo,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(email, hash, name, name, group, studentId, 1,
        "Ақпараттық технологиялар факультеті", "Факультет информационных технологий",
        "", name.slice(0, 2).toUpperCase(), new Date().toISOString());

  seedUser(info.lastInsertRowid);
  req.session.userId = info.lastInsertRowid;
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  res.json(publicUser(u));
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!u || !(await verifyPassword(password || "", u.password_hash)))
    return res.status(401).json({ error: "bad_credentials" });
  req.session.userId = u.id;
  res.json(publicUser(u));
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
```

- [ ] **Step 4: Раскомментировать монтаж auth-роутов в `server/app.js`** (если был закомментирован).

- [ ] **Step 5: Запустить тест — проходит**

Run: `node --test test/auth.test.js`
Expected: PASS (3 теста).

- [ ] **Step 6: Commit**

```bash
git add server/routes/auth.routes.js test/auth.test.js server/app.js
git commit -m "feat: auth routes (register/login/logout/me)"
```

---

## Task 7: Data-роуты (чтение)

**Files:**
- Create: `server/routes/data.routes.js`, `test/data.test.js`
- Create: `server/lib/gpa.js` (серверный расчёт GPA — переиспользует ту же шкалу)

- [ ] **Step 1: `server/lib/gpa.js`**

```js
const GRADE_SCALE = [
  { min: 95, point: 4.0 }, { min: 90, point: 3.67 }, { min: 85, point: 3.33 },
  { min: 80, point: 3.0 }, { min: 75, point: 2.67 }, { min: 70, point: 2.33 },
  { min: 65, point: 2.0 }, { min: 60, point: 1.67 }, { min: 55, point: 1.33 },
  { min: 50, point: 1.0 }, { min: 0, point: 0.0 },
];
const subjectTotal = (midterm, final) => Math.round(midterm * 0.4 + final * 0.6);
const pointFor = (total) => GRADE_SCALE.find((g) => total >= g.min).point;
function computeGPA(rows) { // rows: {midterm, final, credits}
  let pts = 0, cr = 0;
  for (const r of rows) { pts += pointFor(subjectTotal(r.midterm, r.final)) * r.credits; cr += r.credits; }
  return cr ? pts / cr : 0;
}
module.exports = { subjectTotal, computeGPA };
```

- [ ] **Step 2: Тест `test/data.test.js`**

```js
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-data.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

async function authed() {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ email: "d@x.kz", password: "pass1234", name: "Д", group: "G" });
  return agent;
}

test("unauthorized data access → 401", async () => {
  const r = await request(app).get("/api/home");
  assert.strictEqual(r.status, 401);
});

test("home aggregate shape", async () => {
  const agent = await authed();
  const r = await agent.get("/api/home");
  assert.strictEqual(r.status, 200);
  assert.ok("gpa" in r.body && "todayLessons" in r.body && "news" in r.body);
});

test("grades return bilingual subject names", async () => {
  const agent = await authed();
  const r = await agent.get("/api/grades");
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.subjects));
  assert.ok(r.body.subjects[0].name.kz && r.body.subjects[0].name.ru);
});
```

- [ ] **Step 3: Запустить — упадёт**

Run: `node --test test/data.test.js`
Expected: FAIL — нет роутов `/api/home`.

- [ ] **Step 4: `server/routes/data.routes.js`**

```js
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const { subjectTotal, computeGPA } = require("../lib/gpa");

const router = express.Router();
router.use(requireAuth);

const bi = (kz, ru) => ({ kz, ru });

function gradesRows(userId) {
  return db.prepare(
    `SELECT s.id, s.name_kz, s.name_ru, s.teacher_kz, s.teacher_ru, s.credits, g.midterm, g.final
     FROM grades g JOIN subjects s ON s.id = g.subject_id WHERE g.user_id = ? ORDER BY s.id`
  ).all(userId);
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
  const rows = db.prepare("SELECT * FROM schedule ORDER BY day, time").all();
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
    ? Math.round(att.reduce((s, a) => s + (a.attended / a.total) * 100, 0) / att.length) : 0;

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

  const schedule = db.prepare("SELECT * FROM schedule ORDER BY time").all()
    .map((l) => ({ day: l.day, time: l.time, room: l.room, mode: l.mode,
      subject: bi(l.subject_kz, l.subject_ru), teacher: bi(l.teacher_kz, l.teacher_ru) }));

  const news = db.prepare("SELECT * FROM news ORDER BY date DESC").all()
    .map((n) => ({ id: n.id, title: bi(n.title_kz, n.title_ru), text: bi(n.text_kz, n.text_ru), date: n.date, tag: bi(n.tag_kz, n.tag_ru) }));

  const announcements = db.prepare("SELECT * FROM announcements ORDER BY date DESC").all()
    .map((a) => ({ id: a.id, text: bi(a.text_kz, a.text_ru), date: a.date, type: a.type }));

  res.json({ gpa, avgAtt, pending, nextExam, todayLessons: schedule, upcomingHw, news, announcements });
});

module.exports = router;
```

> Примечание про «сегодняшние занятия»: фильтр по дню недели выполняет фронт (он знает `NOW`/таймзону клиента). API отдаёт полное расписание в `todayLessons`; фронт фильтрует по `l.day === NOW.getDay()`.

- [ ] **Step 5: Запустить тест — проходит**

Run: `node --test test/data.test.js`
Expected: PASS (3 теста).

- [ ] **Step 6: Commit**

```bash
git add server/routes/data.routes.js server/lib/gpa.js test/data.test.js
git commit -m "feat: read data routes (home/grades/schedule/attendance/exams/news/profile)"
```

---

## Task 8: Файлы и загрузки (homework + files + photo)

**Files:**
- Create: `server/lib/upload.js`, `server/routes/homework.routes.js`, `server/routes/files.routes.js`
- Modify: `server/routes/data.routes.js` (добавить отдачу фото профиля)
- Create: `test/upload.test.js`

- [ ] **Step 1: `server/lib/upload.js` (multer, лимиты, белый список)**

```js
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");

const ALLOWED = new Set([".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"]);
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
```

- [ ] **Step 2: `server/routes/homework.routes.js`**

```js
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const { upload } = require("../lib/upload");

const router = express.Router();
router.use(requireAuth);
const bi = (kz, ru) => ({ kz, ru });

router.get("/homework", (req, res) => {
  const rows = db.prepare(
    `SELECT h.*, hs.status, hs.file_path FROM hw_submissions hs
     JOIN homework h ON h.id = hs.homework_id WHERE hs.user_id = ? ORDER BY h.deadline`
  ).all(req.session.userId);
  res.json(rows.map((h) => ({
    id: h.id, subject: bi(h.subject_kz, h.subject_ru), title: bi(h.title_kz, h.title_ru),
    deadline: h.deadline, status: h.status, hasFile: !!h.file_path,
  })));
});

router.post("/homework/:id/submit", upload.single("file"), (req, res) => {
  const filePath = req.file ? req.file.path : null;
  const info = db.prepare(
    "UPDATE hw_submissions SET status = 'submitted', file_path = COALESCE(?, file_path) WHERE user_id = ? AND homework_id = ?"
  ).run(filePath, req.session.userId, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true, status: "submitted" });
});

module.exports = router;
```

- [ ] **Step 3: `server/routes/files.routes.js`**

```js
const express = require("express");
const fs = require("fs");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();
router.use(requireAuth);
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
```

- [ ] **Step 4: Добавить отдачу фото в `server/routes/data.routes.js`**

```js
// добавить multer для фото
const { upload } = require("../lib/upload");
const fs = require("fs");

router.post("/profile/photo", upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });
  db.prepare("UPDATE users SET photo_path = ? WHERE id = ?").run(req.file.path, req.session.userId);
  res.json({ ok: true, photoUrl: `/api/profile/photo/${req.session.userId}` });
});

router.get("/profile/photo/:id", (req, res) => {
  const u = db.prepare("SELECT photo_path FROM users WHERE id = ?").get(req.params.id);
  if (!u || !u.photo_path || !fs.existsSync(u.photo_path)) return res.status(404).end();
  res.sendFile(u.photo_path);
});
```

> `router.use(requireAuth)` уже стоит в начале `data.routes.js`, фото-эндпоинты тоже под защитой.

- [ ] **Step 5: Тест `test/upload.test.js`**

```js
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-upload.db");
process.env.KUNDELIK_UPLOADS = path.join(__dirname, "test-uploads");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
fs.rmSync(process.env.KUNDELIK_UPLOADS, { recursive: true, force: true });
const createApp = require("../server/app");
const app = createApp();

test("submit homework with file flips status", async () => {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ email: "u@x.kz", password: "pass1234", name: "U", group: "G" });
  const list = await agent.get("/api/homework");
  const pending = list.body.find((h) => h.status === "pending");

  const r = await agent.post(`/api/homework/${pending.id}/submit`)
    .attach("file", Buffer.from("hello"), "work.pdf");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, "submitted");

  const list2 = await agent.get("/api/homework");
  const same = list2.body.find((h) => h.id === pending.id);
  assert.strictEqual(same.status, "submitted");
  assert.strictEqual(same.hasFile, true);
});

test("file download returns attachment", async () => {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ email: "u2@x.kz", password: "pass1234", name: "U2", group: "G" });
  const files = await agent.get("/api/files");
  const r = await agent.get(`/api/files/${files.body[0].id}/download`);
  assert.strictEqual(r.status, 200);
  assert.match(r.headers["content-disposition"], /attachment/);
});
```

- [ ] **Step 6: Запустить — проходит**

Run: `node --test test/upload.test.js`
Expected: PASS (2 теста).

- [ ] **Step 7: Commit**

```bash
git add server/lib/upload.js server/routes/homework.routes.js server/routes/files.routes.js server/routes/data.routes.js test/upload.test.js
git commit -m "feat: file uploads (homework submit, profile photo, material download)"
```

---

## Task 9: Чат-роуты + тест

**Files:**
- Create: `server/routes/chat.routes.js`, `test/chat.test.js`

- [ ] **Step 1: Тест `test/chat.test.js`**

```js
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-chat.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

test("list chats then post message persists", async () => {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ email: "ch@x.kz", password: "pass1234", name: "Ч", group: "G" });
  const chats = await agent.get("/api/chats");
  assert.ok(chats.body.length >= 1);
  const id = chats.body[0].id;

  const before = chats.body[0].messages.length;
  const post = await agent.post(`/api/chats/${id}/messages`).send({ text: "Сәлем" });
  assert.strictEqual(post.status, 200);

  const chats2 = await agent.get("/api/chats");
  const same = chats2.body.find((c) => c.id === id);
  assert.strictEqual(same.messages.length, before + 1);
  assert.strictEqual(same.messages[same.messages.length - 1].text.kz, "Сәлем");
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `node --test test/chat.test.js`
Expected: FAIL — нет `/api/chats`.

- [ ] **Step 3: `server/routes/chat.routes.js`**

```js
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();
router.use(requireAuth);
const bi = (kz, ru) => ({ kz, ru });

router.get("/chats", (req, res) => {
  const chats = db.prepare("SELECT * FROM chats WHERE user_id = ? ORDER BY id").all(req.session.userId);
  const msgStmt = db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY id");
  res.json(chats.map((c) => ({
    id: c.id, type: c.type, name: bi(c.name_kz, c.name_ru),
    messages: msgStmt.all(c.id).map((m) => ({
      from: m.sender, author: bi(m.author_kz, m.author_ru), text: bi(m.text_kz, m.text_ru), time: m.time,
    })),
  })));
});

router.post("/chats/:id/messages", (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "empty" });
  const chat = db.prepare("SELECT id FROM chats WHERE id = ? AND user_id = ?").get(req.params.id, req.session.userId);
  if (!chat) return res.status(404).json({ error: "not_found" });

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  db.prepare(
    `INSERT INTO messages (chat_id,sender,author_kz,author_ru,text_kz,text_ru,time,created_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(chat.id, "me", "Сіз", "Вы", text.trim(), text.trim(), `${hh}:${mm}`, now.toISOString());
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] **Step 4: Запустить тест — проходит**

Run: `node --test test/chat.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/chat.routes.js test/chat.test.js
git commit -m "feat: chat routes (list + post message)"
```

---

## Task 10: Frontend — API-слой

**Files:**
- Create: `public/js/api.js`
- Modify: `public/index.html` (подключить `api.js` перед `app.js`)

- [ ] **Step 1: `public/js/api.js`**

```js
// fetch-обёртки. credentials:include — чтобы cookie-сессия ходила.
const API = {
  async req(method, url, body, isForm) {
    const opts = { method, credentials: "include", headers: {} };
    if (body && !isForm) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    if (body && isForm) opts.body = body;
    const res = await fetch(url, opts);
    if (res.status === 401) { window.__onUnauthorized && window.__onUnauthorized(); throw new Error("unauthorized"); }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    return res.status === 204 ? null : res.json();
  },
  get: (u) => API.req("GET", u),
  post: (u, b) => API.req("POST", u, b),
  patch: (u, b) => API.req("PATCH", u, b),
  postForm: (u, fd) => API.req("POST", u, fd, true),

  register: (d) => API.post("/api/auth/register", d),
  login: (d) => API.post("/api/auth/login", d),
  logout: () => API.post("/api/auth/logout"),
  me: () => API.get("/api/auth/me"),
  home: () => API.get("/api/home"),
  profile: () => API.get("/api/profile"),
  grades: () => API.get("/api/grades"),
  schedule: () => API.get("/api/schedule"),
  attendance: () => API.get("/api/attendance"),
  homework: () => API.get("/api/homework"),
  submitHw: (id, fd) => API.postForm(`/api/homework/${id}/submit`, fd),
  exams: () => API.get("/api/exams"),
  files: () => API.get("/api/files"),
  chats: () => API.get("/api/chats"),
  sendMsg: (id, text) => API.post(`/api/chats/${id}/messages`, { text }),
};
```

- [ ] **Step 2: Подключить в `public/index.html`** — добавить перед `app.js`:

```html
  <script src="js/api.js"></script>
```

(порядок: `data.js` → `i18n.js` → `api.js` → `app.js`)

- [ ] **Step 3: Commit**

```bash
git add public/js/api.js public/index.html
git commit -m "feat(front): API fetch layer"
```

---

## Task 11: Frontend — экраны login/register + auth-поток

**Files:**
- Modify: `public/js/app.js` (auth-экраны, gate, logout-кнопка)
- Modify: `public/css/styles.css` (стили auth-экрана)
- Modify: `public/js/i18n.js` (строки auth — см. Task 13)

- [ ] **Step 1: Стили auth — добавить в конец `public/css/styles.css`**

```css
/* ===== Auth screen ===== */
.auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.auth-card { width: 100%; max-width: 380px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 28px; }
.auth-card h1 { font-size: 22px; margin-bottom: 4px; }
.auth-card .li-sub { margin-bottom: 20px; }
.auth-field { margin-bottom: 14px; }
.auth-field label { display: block; font-size: 13px; color: var(--text-soft); margin-bottom: 6px; }
.auth-field input { width: 100%; padding: 10px 12px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text); font-size: 14px; }
.auth-card .btn { width: 100%; justify-content: center; margin-top: 6px; }
.auth-switch { text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-soft); }
.auth-switch a { color: var(--primary-text); cursor: pointer; }
.auth-error { color: var(--danger); font-size: 13px; margin-bottom: 12px; min-height: 18px; }
.logout-btn { margin-top: 8px; width: 100%; }
```

- [ ] **Step 2: Добавить auth-экраны и gate в `public/js/app.js`**

В начало (после `state`) добавить хранение текущего пользователя и обработчик 401:

```js
state.user = null;
window.__onUnauthorized = () => { state.user = null; renderAuth("login"); };
```

Функции экранов (добавить рядом с остальными view-функциями):

```js
function renderAuth(mode) {
  const isLogin = mode === "login";
  document.body.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1>${t("appName")}</h1>
        <div class="li-sub">${t(isLogin ? "auth_loginTitle" : "auth_registerTitle")}</div>
        <div class="auth-error" id="authError"></div>
        <form id="authForm">
          ${isLogin ? "" : `
          <div class="auth-field"><label>${t("auth_name")}</label><input id="f_name" required /></div>
          <div class="auth-field"><label>${t("auth_group")}</label><input id="f_group" required /></div>`}
          <div class="auth-field"><label>${t("auth_email")}</label><input id="f_email" type="email" required /></div>
          <div class="auth-field"><label>${t("auth_password")}</label><input id="f_password" type="password" minlength="6" required /></div>
          <button class="btn btn-primary" type="submit">${t(isLogin ? "auth_loginBtn" : "auth_registerBtn")}</button>
        </form>
        <div class="auth-switch">
          ${t(isLogin ? "auth_noAccount" : "auth_haveAccount")}
          <a id="authSwitch">${t(isLogin ? "auth_registerBtn" : "auth_loginBtn")}</a>
        </div>
      </div>
    </div>`;

  $("#authSwitch").addEventListener("click", () => renderAuth(isLogin ? "register" : "login"));
  $("#authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#authError"); err.textContent = "";
    try {
      const payload = { email: $("#f_email").value.trim(), password: $("#f_password").value };
      if (!isLogin) { payload.name = $("#f_name").value.trim(); payload.group = $("#f_group").value.trim(); }
      state.user = isLogin ? await API.login(payload) : await API.register(payload);
      bootApp();
    } catch (ex) {
      err.textContent = t("auth_error");
    }
  });
}
```

- [ ] **Step 3: Перестроить `init()` на проверку сессии**

Заменить тело `init()` так, чтобы сначала вызывался `bootApp()` после успешного `me`, иначе — `renderAuth`. Поскольку `renderAuth` перезаписывает `document.body`, нужно сохранить исходный HTML-каркас layout. Решение: вынести разметку layout в строковую константу `LAYOUT_HTML` (скопировать текущее содержимое `<body>` из `index.html` без `<script>`) и восстанавливать её в `bootApp()`.

```js
const LAYOUT_HTML = `... (содержимое <body> приложения: mobile-bar + layout + sidebar + main) ...`;

async function bootApp() {
  document.body.innerHTML = LAYOUT_HTML;
  applyTheme(); injectNavIcons(); applyLang();
  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#themeToggleMobile").addEventListener("click", toggleTheme);
  $("#menuToggle").addEventListener("click", openMenu);
  $("#backdrop").addEventListener("click", closeMenu);
  $$("#langSwitch button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
  $("#logoutBtn") && $("#logoutBtn").addEventListener("click", async () => { await API.logout(); state.user = null; renderAuth("login"); });
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#home";
  await render();
}

async function init() {
  try { state.user = await API.me(); await bootApp(); }
  catch { renderAuth("login"); }
}
document.addEventListener("DOMContentLoaded", init);
```

> В `LAYOUT_HTML` добавить кнопку логаута в `.sidebar-foot`:
> `<button class="btn logout-btn" id="logoutBtn">${'${t("auth_logout")}'}</button>` — собирается при `applyLang()` или статичной строкой; проще добавить пункт и проставить текст в `applyLang()` через `$("#logoutBtn").textContent = t("auth_logout")`.

- [ ] **Step 4: Commit**

```bash
git add public/js/app.js public/css/styles.css
git commit -m "feat(front): login/register screens and auth gate"
```

---

## Task 12: Frontend — async views + удаление mock DB

**Files:**
- Modify: `public/js/data.js` (удалить `DB`, оставить helper'ы)
- Modify: `public/js/app.js` (все `viewXxx` → async, данные из API, кэш в `state`)

- [ ] **Step 1: Урезать `public/js/data.js`**

Удалить весь объект `DB`. Оставить только: `GRADE_SCALE`, `gradeFor`, `subjectTotal`, `computeGPA`. (Эти helper'ы используются `viewGrades` на клиенте.)

- [ ] **Step 2: Ввести кэш данных в `state` и загрузчик**

```js
state.data = {}; // route -> payload

async function loadRoute(route) {
  switch (route) {
    case "home": state.data.home = await API.home(); break;
    case "profile": state.data.profile = await API.profile(); break;
    case "grades": state.data.grades = await API.grades(); break;
    case "schedule": state.data.schedule = await API.schedule(); break;
    case "homework": state.data.homework = await API.homework(); break;
    case "attendance": state.data.attendance = await API.attendance(); break;
    case "exams": state.data.exams = await API.exams(); break;
    case "files": state.data.files = await API.files(); break;
    case "chat":
      state.data.chats = await API.chats();
      if (!state.activeChat && state.data.chats[0]) state.activeChat = state.data.chats[0].id;
      break;
  }
}
```

- [ ] **Step 3: Сделать `render()` async и грузить данные перед рендером**

```js
async function render() {
  const route = currentRoute();
  const def = ROUTES[route];
  $("#view").innerHTML = `<div class="empty">${t("loading")}</div>`;
  try { await loadRoute(route); }
  catch (e) { if (e.message === "unauthorized") return; }
  $("#view").innerHTML = def.render();
  const title = t(def.title);
  $("#pageTitle").textContent = title;
  $("#mobileTitle").textContent = title;
  $$(".nav-item").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
  bindViewEvents(route);
  closeMenu();
}
```

- [ ] **Step 4: Переписать view-функции на чтение из `state.data` вместо `DB`**

Каждая `viewXxx` остаётся **синхронной** (рендер из уже загруженного `state.data`). Замены источника:
- `viewHome`: использовать `state.data.home` (поля `gpa, avgAtt, pending, nextExam, todayLessons, upcomingHw, news, announcements`). `gpa.toFixed(2)`; сегодняшние занятия = `todayLessons.filter(l => l.day === NOW.getDay())`.
- `viewProfile`: `state.data.profile`.
- `viewGrades`: `state.data.grades.subjects` + `state.data.grades.gpa` (GPA уже с сервера; для буквы — `gradeFor(s.total)` локально).
- `viewSchedule`: `state.data.schedule`.
- `viewHomework`: `state.data.homework` (поле `status`); фильтр `state.hwFilter` как раньше.
- `viewAttendance`: `state.data.attendance`.
- `viewChat`: `state.data.chats`, активный — `state.activeChat`.
- `viewFiles`: `state.data.files`.
- `viewExams`: `state.data.exams` (поле `result`).

Пример переписанного `viewGrades` (показывает паттерн для остальных):

```js
function viewGrades() {
  const { subjects, gpa } = state.data.grades;
  const rows = subjects.map((s) => {
    const g = gradeFor(s.total);
    return `<tr>
      <td><strong>${esc(tr(s.name))}</strong><div class="li-sub">${esc(tr(s.teacher))}</div></td>
      <td class="num">${s.credits}</td><td class="num">${s.midterm}</td>
      <td class="num">${s.final}</td><td class="num">${s.total}</td>
      <td><span class="badge badge-${g.point >= 3 ? "success" : g.point >= 2 ? "warn" : "danger"}">${g.letter}</span></td>
    </tr>`;
  }).join("");
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="ring-wrap"><div class="ring" style="--p:${(gpa / 4) * 100}"><span>${gpa.toFixed(2)}</span></div>
        <div><div class="section-title" style="margin:0">${t("home_gpa")}</div>
        <div class="li-sub">${t("grades_gpaNote")}</div></div></div>
    </div>
    <div class="card"><div class="card-head"><h2>${t("grades_title")}</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("subject")}</th><th>${t("credits")}</th><th>${t("grades_midterm")}</th>
        <th>${t("grades_final")}</th><th>${t("grades_total")}</th><th>${t("grades_letter")}</th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>`;
}
```

- [ ] **Step 5: Обновить `bindViewEvents` под API**

ДЗ-сабмит — реальный файл + перезагрузка:

```js
if (route === "homework") {
  $$("[data-hwfilter]").forEach((b) => b.addEventListener("click", () => { state.hwFilter = b.dataset.hwfilter; render(); }));
  $$("[data-hwsubmit]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.hwsubmit;
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
    inp.onchange = async () => {
      const fd = new FormData();
      if (inp.files[0]) fd.append("file", inp.files[0]);
      await API.submitHw(id, fd);
      toast(t("hw_submittedMsg"));
      await render();
    };
    inp.click();
  }));
}

if (route === "files") {
  $$("[data-download]").forEach((b) =>
    b.addEventListener("click", () => { window.location = `/api/files/${b.dataset.download}/download`; }));
  // в viewFiles заменить data-download на id файла
}

if (route === "chat") {
  $$("[data-chat]").forEach((c) => c.addEventListener("click", () => { state.activeChat = +c.dataset.chat; render(); }));
  const form = $("#chatForm");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#chatInput"); const text = input.value.trim();
    if (!text) return;
    await API.sendMsg(state.activeChat, text);
    await render();
    const box = $("#chatMsgs"); if (box) box.scrollTop = box.scrollHeight;
  });
  const box = $("#chatMsgs"); if (box) box.scrollTop = box.scrollHeight;
}
```

> В `viewFiles` поменять `data-download="${esc(f.name)}"` → `data-download="${f.id}"`. В `viewChat` каналы — `data-chat="${c.id}"` (число).

- [ ] **Step 6: Ручная проверка в браузере**

```bash
npm start
```
Открыть http://localhost:3000 → регистрация → дашборд грузится → проверить все разделы, тему, язык, сабмит ДЗ, чат, логаут.

- [ ] **Step 7: Commit**

```bash
git add public/js/data.js public/js/app.js
git commit -m "feat(front): async views from API, remove mock DB"
```

---

## Task 13: i18n строки auth + loading

**Files:**
- Modify: `public/js/i18n.js`

- [ ] **Step 1: Добавить в блок `kz`**

```js
    loading: "Жүктелуде...",
    auth_loginTitle: "Аккаунтқа кіру",
    auth_registerTitle: "Тіркелу",
    auth_name: "Аты-жөні",
    auth_group: "Тобы",
    auth_email: "Электрондық пошта",
    auth_password: "Құпиясөз",
    auth_loginBtn: "Кіру",
    auth_registerBtn: "Тіркелу",
    auth_noAccount: "Аккаунт жоқ па?",
    auth_haveAccount: "Аккаунт бар ма?",
    auth_logout: "Шығу",
    auth_error: "Қате. Деректерді тексеріңіз.",
```

- [ ] **Step 2: Добавить в блок `ru`**

```js
    loading: "Загрузка...",
    auth_loginTitle: "Вход в аккаунт",
    auth_registerTitle: "Регистрация",
    auth_name: "ФИО",
    auth_group: "Группа",
    auth_email: "Электронная почта",
    auth_password: "Пароль",
    auth_loginBtn: "Войти",
    auth_registerBtn: "Регистрация",
    auth_noAccount: "Нет аккаунта?",
    auth_haveAccount: "Есть аккаунт?",
    auth_logout: "Выйти",
    auth_error: "Ошибка. Проверьте данные.",
```

- [ ] **Step 3: Commit**

```bash
git add public/js/i18n.js
git commit -m "feat(i18n): auth and loading strings"
```

---

## Task 14: Изоляция пользователей + финальная проверка

**Files:**
- Create: `test/isolation.test.js`

- [ ] **Step 1: Тест `test/isolation.test.js`**

```js
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const fs = require("fs");
const path = require("path");

process.env.KUNDELIK_DB = path.join(__dirname, "test-iso.db");
fs.rmSync(process.env.KUNDELIK_DB, { force: true });
const createApp = require("../server/app");
const app = createApp();

test("user A submission does not affect user B", async () => {
  const A = request.agent(app), B = request.agent(app);
  await A.post("/api/auth/register").send({ email: "ia@x.kz", password: "pass1234", name: "A", group: "G" });
  await B.post("/api/auth/register").send({ email: "ib@x.kz", password: "pass1234", name: "B", group: "G" });

  const aList = await A.get("/api/homework");
  const aPending = aList.body.find((h) => h.status === "pending");
  await A.post(`/api/homework/${aPending.id}/submit`).attach("file", Buffer.from("x"), "a.pdf");

  const bList = await B.get("/api/homework");
  const bSame = bList.body.find((h) => h.id === aPending.id);
  assert.strictEqual(bSame.status, "pending"); // B не затронут
});

test("B cannot post to A chat", async () => {
  const A = request.agent(app), B = request.agent(app);
  await A.post("/api/auth/register").send({ email: "ia2@x.kz", password: "pass1234", name: "A", group: "G" });
  await B.post("/api/auth/register").send({ email: "ib2@x.kz", password: "pass1234", name: "B", group: "G" });
  const aChats = await A.get("/api/chats");
  const r = await B.post(`/api/chats/${aChats.body[0].id}/messages`).send({ text: "hack" });
  assert.strictEqual(r.status, 404);
});
```

- [ ] **Step 2: Запустить весь набор тестов**

Run: `npm test`
Expected: PASS — все файлы (`auth-unit`, `auth`, `data`, `upload`, `chat`, `isolation`).

- [ ] **Step 3: Очистить тестовые артефакты (если не в gitignore)**

`test-*.db`, `test-uploads/` — уже покрыты `*.db` и не коммитятся; `test-uploads/` добавить в `.gitignore` при необходимости.

- [ ] **Step 4: Финальная ручная проверка двух аккаунтов**

`npm start` → зарегистрировать 2 разных юзера в разных вкладках → убедиться, что данные не пересекаются.

- [ ] **Step 5: Commit**

```bash
git add test/isolation.test.js .gitignore
git commit -m "test: user data isolation"
```

---

## Self-Review (выполнено при написании плана)

**Spec coverage:**
- Архитектура (spec §1) → Task 5. ✓
- Модель данных (§2) → Task 2 (схема), Task 3 (seed). ✓
- API (§3) → Task 6 (auth), 7 (data), 8 (hw/files/photo), 9 (chat). ✓
- Auth flow (§4) → Task 6 + Task 11 (gate). ✓
- Изменения фронта (§5) → Task 10–12. ✓
- Файлы (§6) → Task 8. ✓
- Структура проекта (§7) → Task 1. ✓
- Тесты (§8) → Task 4,6,7,8,9,14. ✓

**Out of scope соблюдён:** нет ролей, нет Postgres/Docker, чат через POST (не WebSocket), нет восстановления пароля.

**Замечания для исполнителя:**
- Task 5 require несозданных роутов — комментировать/раскомментировать по мере появления (отмечено в задаче).
- `data/template.js` — копия существующих данных из `public/js/data.js` (DRY: данные уже в репозитории, не выдумывать новые).
- API намеренно отдаёт `{kz,ru}` — минимизирует правки фронта (`tr()` остаётся).
```
