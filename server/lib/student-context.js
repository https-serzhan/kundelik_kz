// Подготовка контекста об успеваемости для ИИ-промптов.
// Используется и student-ассистентом (ai.routes), и admin-ассистентом (admin.routes),
// чтобы ИИ отвечал про РЕАЛЬНЫЕ данные, а не абстрактно.

const db = require("../db");
const { subjectTotal, computeGPA } = require("./gpa");

function bi(kz, ru) {
  return { kz, ru };
}

/**
 * Контекст одного студента: предметы/оценки, GPA, посещаемость, ближайший экзамен, невыполненные ДЗ.
 */
function studentContext(userId) {
  const gradeRows = db.prepare(
    `SELECT s.id, s.name_kz, s.name_ru, s.teacher_kz, s.teacher_ru, s.credits, g.midterm, g.final
     FROM grades g JOIN subjects s ON s.id = g.subject_id WHERE g.user_id = ? ORDER BY s.id`
  ).all(userId);

  const subjects = gradeRows.map((r) => ({
    id: r.id,
    name: bi(r.name_kz, r.name_ru),
    teacher: bi(r.teacher_kz, r.teacher_ru),
    credits: r.credits,
    midterm: r.midterm,
    final: r.final,
    total: subjectTotal(r.midterm, r.final),
  }));

  const att = db.prepare(
    "SELECT subject_kz, subject_ru, total, attended FROM attendance WHERE user_id = ?"
  ).all(userId);

  const pending = db.prepare(
    "SELECT COUNT(*) c FROM hw_submissions WHERE user_id = ? AND status = 'pending'"
  ).get(userId).c;

  const nextExamRow = db.prepare(
    `SELECT e.subject_kz, e.subject_ru, e.date
     FROM exams e
     LEFT JOIN exam_results r ON r.exam_id = e.id AND r.user_id = ?
     WHERE r.result IS NULL ORDER BY e.date LIMIT 1`
  ).get(userId);
  const nextExam = nextExamRow
    ? { subject: bi(nextExamRow.subject_kz, nextExamRow.subject_ru), date: nextExamRow.date }
    : null;

  return {
    subjects,
    gpa: computeGPA(gradeRows),
    attendance: att.map((a) => ({
      subject: bi(a.subject_kz, a.subject_ru),
      total: a.total,
      attended: a.attended,
    })),
    pendingHw: pending,
    nextExam,
  };
}

/**
 * Сводка по всем студентам для контекста преподавателя/админа.
 * Возвращает массив: { studentId, name, group, course, gpa, attendancePct, atRisk }.
 * atRisk = true при GPA < 2.0 или средней посещаемости < 70%.
 */
function adminRoster() {
  const students = db.prepare(
    "SELECT id, name_kz, name_ru, \"group\", student_id, course FROM users WHERE role = 'student' ORDER BY student_id"
  ).all();

  return students.map((u) => {
    const ctx = studentContext(u.id);
    const attPct = ctx.attendance.length
      ? Math.round(
          ctx.attendance.reduce((s, a) => s + (a.total ? (a.attended / a.total) * 100 : 0), 0) /
            ctx.attendance.length
        )
      : 0;
    return {
      studentId: u.student_id,
      name: bi(u.name_kz, u.name_ru),
      group: u.group,
      course: u.course,
      gpa: Number(ctx.gpa.toFixed(2)),
      attendancePct: attPct,
      pendingHw: ctx.pendingHw,
      atRisk: ctx.gpa < 2.0 || attPct < 70,
    };
  });
}

module.exports = { studentContext, adminRoster, bi };
