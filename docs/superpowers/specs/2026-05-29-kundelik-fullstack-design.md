# Күнделік — Fullstack Design Spec

**Date:** 2026-05-29
**Status:** Approved (pending spec review)

## Goal

Превратить текущий статический SPA-мокап студенческого портала «Күнделік» в полноценное веб-приложение с реальным бэкендом, базой данных, авторизацией и сохранением данных.

## Decisions (locked)

| Вопрос | Решение |
|--------|---------|
| Уровень | Реальный бэкенд + БД |
| Стек бэкенда | Node + Express + SQLite (`better-sqlite3`) |
| Фронтенд | Текущий vanilla SPA, подключённый к API (без переписывания) |
| Авторизация | Регистрация + логин, bcrypt, cookie-сессия |
| Роли | Одна: студент |
| Данные нового юзера | Общие данные (расписание/новости/файлы/экзамены) + личный seed (оценки/посещаемость/ДЗ/чаты) |

## 1. Архитектура

```
Браузер (vanilla SPA)
   │  fetch JSON + cookie-сессия
   ▼
Express API  ──►  SQLite (better-sqlite3, kundelik.db)
   │
   └─►  /uploads (файлы на диске: ДЗ, фото профиля)
```

- Один Node-процесс отдаёт статику (`public/`) и API (`/api/*`).
- Сессия в cookie через `express-session` + `connect-sqlite3` (переживает рестарт).
- Пароли — `bcrypt`. Загрузка файлов — `multer`.

## 2. Модель данных (SQLite)

### Общие таблицы (уровень вуза, одни для всех)
- `subjects` — id, name_kz, name_ru, teacher_kz, teacher_ru, credits
- `schedule` — id, day (1–6), time, subject_id, room, mode (online/offline)
- `news` — id, title_kz/ru, text_kz/ru, date, tag_kz/ru
- `announcements` — id, text_kz/ru, date, type (info/warning)
- `exams` — id, subject_id, date, time, room
- `homework` — id, subject_id, title_kz/ru, deadline
- `materials` — id, name, type (pdf/ppt/doc), subject_id, size, date, file_path

### Личные таблицы (per-user, FK user_id)
- `users` — id, email (unique), password_hash, name_kz, name_ru, "group", student_id, course, faculty_kz/ru, phone, photo_path, created_at
- `grades` — user_id, subject_id, midterm, final  *(total = midterm*0.4 + final*0.6, GPA — на лету)*
- `attendance` — user_id, subject_id, total, attended
- `hw_submissions` — user_id, homework_id, status (pending/submitted), file_path
- `exam_results` — user_id, exam_id, result (nullable)
- `chats` — id, user_id, type (teacher/group/admin), name_kz/ru
- `messages` — id, chat_id, sender (me/them), author_kz/ru, text_kz/ru, time, created_at

### Seed при регистрации
Создаётся `users`-запись; копируется демо-набор в `grades`, `attendance`, `hw_submissions`, `exam_results`, `chats`+`messages` из шаблона (текущие данные Айданы из старого `data.js`).

## 3. API (REST, JSON)

**Auth (открытые):**
- `POST /api/auth/register` — {email, password, name, group}
- `POST /api/auth/login` — {email, password}
- `POST /api/auth/logout`
- `GET  /api/auth/me`

**Защищённые (`requireAuth`):**
- `GET  /api/home` — агрегат дашборда (GPA, средняя посещаемость, кол-во pending ДЗ, ближайший экзамен, сегодняшние занятия, ближайшие ДЗ, новости, объявления)
- `GET  /api/profile` · `PATCH /api/profile` · `POST /api/profile/photo` (multipart)
- `GET  /api/grades`
- `GET  /api/schedule`
- `GET  /api/attendance`
- `GET  /api/homework` · `POST /api/homework/:id/submit` (multipart, файл)
- `GET  /api/exams`
- `GET  /api/news` · `GET /api/announcements`
- `GET  /api/files` · `GET /api/files/:id/download`
- `GET  /api/chats` · `POST /api/chats/:id/messages` — {text}

## 4. Auth flow

1. Регистрация: валидация → bcrypt-хеш → INSERT user → seed личных таблиц → `req.session.userId` → 200.
2. Логин: найти по email → `bcrypt.compare` → сессия → 200; иначе 401.
3. `requireAuth`: нет `req.session.userId` → 401.
4. Фронт: при старте `GET /api/auth/me`; 401 → экран login. Логаут чистит сессию.

## 5. Изменения фронтенда

- Удалить mock `DB` из `js/data.js`; оставить чистые helper'ы (`GRADE_SCALE`, `gradeFor`, `subjectTotal`, `computeGPA`) — они переиспользуются.
- Новый `js/api.js` — обёртки `fetch` с `credentials: "include"`, обработка 401.
- Рендер-функции в `app.js` (`viewHome`, `viewGrades`, …) → `async`, данные из API; кэш в `state` чтобы не дёргать API на каждый перерендер.
- Новые экраны: `viewLogin`, `viewRegister` (вне основного layout, до авторизации).
- ДЗ-сабмит и фото профиля — реальный `<input type="file">` + FormData.
- `i18n.js` — добавить строки для login/register/ошибок. `styles.css`, существующая вёрстка — без изменений.

## 6. Файлы

- ДЗ/фото: `multer` → `uploads/<user_id>/`, путь в БД. Лимит размера (напр. 10 МБ), белый список расширений (pdf, doc, docx, png, jpg).
- Скачивание материалов: `res.download(file_path)`. Для seed-материалов при `seed.js` создаются маленькие placeholder-файлы на диске.
- Валидация имени файла (защита от path traversal): хранить под сгенерированным именем, отдавать оригинальное через `Content-Disposition`.

## 7. Структура проекта

```
kundelik/
├─ server/
│  ├─ index.js          # express app, статика, монтаж роутов
│  ├─ db.js             # better-sqlite3 connection
│  ├─ schema.sql        # CREATE TABLE
│  ├─ seed.js           # общие данные + шаблон личного seed
│  ├─ auth.js           # requireAuth, хеш-хелперы
│  └─ routes/           # auth.js, home.js, grades.js, ...
├─ public/              # бывший фронт: index.html, css/, js/
├─ uploads/             # загруженные файлы (gitignore)
├─ kundelik.db          # SQLite (gitignore)
├─ package.json
```

## 8. Тесты

- API-тесты (`supertest` + node test runner / vitest):
  - регистрация → логин → `GET /api/home` 200
  - доступ без сессии → 401
  - сабмит ДЗ меняет статус на submitted, файл сохранён
  - изоляция: юзер A не видит данные юзера B
  - повторная регистрация того же email → 409
- Запуск: `npm start` (сервер), `npm test` (тесты).

## Out of scope (YAGNI)

- Роли преподавателя/админа.
- Postgres, Docker, CI/CD.
- Реал-тайм чат (WebSocket) — сообщения через обычный POST + перерисовка.
- Восстановление пароля по email, 2FA.
