const db = require("./db");
const T = require("./data/template");
const { hashPasswordSync } = require("./auth");

const SUBJECT_ALIASES = {
  alg: ["Алгоритмдер", "Алгоритмы"],
  db: ["Дерекқорлар", "Базы данных"],
  web: ["Веб-технологиялар", "Веб-технологии"],
  os: ["Операциялық жүйелер", "Операционные системы"],
  math: ["Дискретті математика", "Дискретная математика"],
  eng: ["Ағылшын", "Английский", "Кәсіби ағылшын", "Профессиональный английский"],
};

function subjectIdFromLabels(kz, ru) {
  for (const [id, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some((alias) => (kz && kz.includes(alias)) || (ru && ru.includes(alias)))) return id;
  }
  return null;
}

function seedCommon() {
  const count = db.prepare("SELECT COUNT(*) c FROM subjects").get().c;
  if (count > 0) return;

  const tx = db.transaction(() => {
    const subj = db.prepare(
      `INSERT INTO subjects (id,name_kz,name_ru,teacher_kz,teacher_ru,credits)
       VALUES (@id,@name_kz,@name_ru,@teacher_kz,@teacher_ru,@credits)`
    );
    for (const s of T.subjects)
      subj.run({
        id: s.id,
        name_kz: s.name.kz,
        name_ru: s.name.ru,
        teacher_kz: s.teacher.kz,
        teacher_ru: s.teacher.ru,
        credits: s.credits,
      });

    const sch = db.prepare(
      `INSERT INTO schedule (day,time,subject_kz,subject_ru,teacher_kz,teacher_ru,room,mode)
       VALUES (@day,@time,@subject_kz,@subject_ru,@teacher_kz,@teacher_ru,@room,@mode)`
    );
    for (const l of T.schedule)
      sch.run({
        day: l.day,
        time: l.time,
        subject_kz: l.subject.kz,
        subject_ru: l.subject.ru,
        teacher_kz: l.teacher.kz,
        teacher_ru: l.teacher.ru,
        room: l.room,
        mode: l.mode,
      });

    const news = db.prepare(
      `INSERT INTO news (id,title_kz,title_ru,text_kz,text_ru,date,tag_kz,tag_ru)
       VALUES (@id,@title_kz,@title_ru,@text_kz,@text_ru,@date,@tag_kz,@tag_ru)`
    );
    for (const n of T.news)
      news.run({
        id: n.id,
        title_kz: n.title.kz,
        title_ru: n.title.ru,
        text_kz: n.text.kz,
        text_ru: n.text.ru,
        date: n.date,
        tag_kz: n.tag.kz,
        tag_ru: n.tag.ru,
      });

    const ann = db.prepare(
      `INSERT INTO announcements (id,text_kz,text_ru,date,type) VALUES (@id,@text_kz,@text_ru,@date,@type)`
    );
    for (const a of T.announcements)
      ann.run({ id: a.id, text_kz: a.text.kz, text_ru: a.text.ru, date: a.date, type: a.type });

    const ex = db.prepare(
      `INSERT INTO exams (subject_kz,subject_ru,date,time,room) VALUES (@subject_kz,@subject_ru,@date,@time,@room)`
    );
    for (const e of T.exams)
      ex.run({
        subject_kz: e.subject.kz,
        subject_ru: e.subject.ru,
        date: e.date,
        time: e.time,
        room: e.room,
      });

    const hw = db.prepare(
      `INSERT INTO homework (id,subject_id,subject_kz,subject_ru,title_kz,title_ru,deadline)
       VALUES (@id,@subject_id,@subject_kz,@subject_ru,@title_kz,@title_ru,@deadline)`
    );
    for (const h of T.homework)
      hw.run({
        id: h.id,
        subject_id: subjectIdFromLabels(h.subject.kz, h.subject.ru),
        subject_kz: h.subject.kz,
        subject_ru: h.subject.ru,
        title_kz: h.title.kz,
        title_ru: h.title.ru,
        deadline: h.deadline,
      });

    const mat = db.prepare(
      `INSERT INTO materials (id,name,type,subject_kz,subject_ru,size,date,file_path)
       VALUES (@id,@name,@type,@subject_kz,@subject_ru,@size,@date,@file_path)`
    );
    for (const f of T.files)
      mat.run({
        id: f.id,
        name: f.name,
        type: f.type,
        subject_kz: f.subject.kz,
        subject_ru: f.subject.ru,
        size: f.size,
        date: f.date,
        file_path: null,
      });
  });
  tx();
}

function seedUser(userId) {
  const tx = db.transaction(() => {
    const gradeStmt = db.prepare(
      `INSERT OR IGNORE INTO grades (user_id,subject_id,midterm,final) VALUES (?,?,?,?)`
    );
    for (const s of T.subjects) gradeStmt.run(userId, s.id, 0, 0);

    const findAttendance = db.prepare(
      "SELECT rowid, total, attended FROM attendance WHERE user_id = ? AND subject_id = ?"
    );
    const updateAttendance = db.prepare(
      `UPDATE attendance
       SET subject_kz = ?, subject_ru = ?, attended = CASE WHEN attended > total THEN total ELSE attended END
       WHERE rowid = ?`
    );
    const insertAttendance = db.prepare(
      `INSERT INTO attendance (user_id,subject_id,subject_kz,subject_ru,total,attended)
       VALUES (?,?,?,?,?,?)`
    );
    for (const at of T.attendance) {
      const subjectId = subjectIdFromLabels(at.subject.kz, at.subject.ru);
      if (!subjectId) continue;
      const existing = findAttendance.get(userId, subjectId);
      if (existing) {
        updateAttendance.run(at.subject.kz, at.subject.ru, existing.rowid);
      } else {
        insertAttendance.run(userId, subjectId, at.subject.kz, at.subject.ru, at.total, 0);
      }
    }

    const scheduleStmt = db.prepare(
      `INSERT OR IGNORE INTO student_schedule
       (id,user_id,day,time,subject_id,subject_kz,subject_ru,teacher_kz,teacher_ru,room,mode)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    );
    let scheduleSeedId = Number(userId) * 1000;
    for (const l of T.schedule) {
      scheduleSeedId += 1;
      scheduleStmt.run(
        scheduleSeedId,
        userId,
        l.day,
        l.time,
        subjectIdFromLabels(l.subject.kz, l.subject.ru),
        l.subject.kz,
        l.subject.ru,
        l.teacher.kz,
        l.teacher.ru,
        l.room,
        l.mode
      );
    }

    const hs = db.prepare(
      `INSERT OR IGNORE INTO hw_submissions (user_id,homework_id,status,file_path,score)
       VALUES (?,?,?,?,?)`
    );
    for (const h of T.homework) hs.run(userId, h.id, "pending", null, 0);

    const exRows = db.prepare("SELECT id FROM exams ORDER BY id").all();
    const er = db.prepare(`INSERT OR IGNORE INTO exam_results (user_id,exam_id,result) VALUES (?,?,?)`);
    for (const exRow of exRows) er.run(userId, exRow.id, null);

    const c = db.prepare(`INSERT INTO chats (user_id,type,name_kz,name_ru) VALUES (?,?,?,?)`);
    const hasChats = db.prepare("SELECT COUNT(*) c FROM chats WHERE user_id = ?").get(userId).c;
    if (!hasChats) {
      const m = db.prepare(
        `INSERT INTO messages (chat_id,sender,author_kz,author_ru,text_kz,text_ru,time,created_at)
         VALUES (?,?,?,?,?,?,?,?)`
      );
      for (const chat of T.chats) {
        const info = c.run(userId, chat.type, chat.name.kz, chat.name.ru);
        const chatId = info.lastInsertRowid;
        for (const msg of chat.messages) {
          m.run(
            chatId,
            msg.from,
            msg.author.kz,
            msg.author.ru,
            msg.text.kz,
            msg.text.ru,
            msg.time,
            new Date().toISOString()
          );
        }
      }
    }
  });
  tx();
}

function normalizeAttendanceRows() {
  const duplicates = db.prepare(
    `SELECT user_id, subject_id, MAX(total) AS total, MAX(attended) AS attended, MAX(rowid) AS keep_rowid
     FROM attendance
     WHERE subject_id IS NOT NULL
     GROUP BY user_id, subject_id
     HAVING COUNT(*) > 1`
  ).all();

  const updateKeep = db.prepare(
    "UPDATE attendance SET total = ?, attended = ? WHERE rowid = ?"
  );
  const deleteDupes = db.prepare(
    "DELETE FROM attendance WHERE user_id = ? AND subject_id = ? AND rowid <> ?"
  );

  for (const row of duplicates) {
    updateKeep.run(row.total, Math.min(row.attended, row.total), row.keep_rowid);
    deleteDupes.run(row.user_id, row.subject_id, row.keep_rowid);
  }

  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS attendance_user_subject_idx ON attendance(user_id, subject_id) WHERE subject_id IS NOT NULL"
  );
}

function backfillUsers() {
  const legacyHomework = db.prepare(
    "SELECT id, subject_kz, subject_ru FROM homework WHERE subject_id IS NULL"
  ).all();
  const updateHomework = db.prepare("UPDATE homework SET subject_id = ? WHERE id = ?");
  for (const row of legacyHomework) {
    updateHomework.run(subjectIdFromLabels(row.subject_kz, row.subject_ru), row.id);
  }

  const legacyAttendance = db.prepare(
    "SELECT rowid, subject_kz, subject_ru FROM attendance WHERE subject_id IS NULL"
  ).all();
  const updateAttendance = db.prepare("UPDATE attendance SET subject_id = ? WHERE rowid = ?");
  for (const row of legacyAttendance) {
    updateAttendance.run(subjectIdFromLabels(row.subject_kz, row.subject_ru), row.rowid);
  }

  normalizeAttendanceRows();

  const users = db.prepare("SELECT id, role FROM users WHERE role = 'student'").all();
  for (const user of users) seedUser(user.id);
}

function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "admin@kundelik.local").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  const name = process.env.ADMIN_NAME || "Администратор";
  if (!email || !password) return;

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
    return;
  }

  db.prepare(
    `INSERT INTO users (email,password_hash,role,name_kz,name_ru,"group",student_id,course,faculty_kz,faculty_ru,phone,photo,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    email,
    hashPasswordSync(password),
    "admin",
    name,
    name,
    "ADMIN",
    "ADM-001",
    0,
    "Әкімшілік",
    "Администрация",
    "",
    name.slice(0, 2).toUpperCase(),
    new Date().toISOString()
  );
}

module.exports = { seedCommon, seedUser, backfillUsers, ensureAdminUser, subjectIdFromLabels };

if (require.main === module) {
  seedCommon();
  ensureAdminUser();
  backfillUsers();
  console.log("common seeded");
}
