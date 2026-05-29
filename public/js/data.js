// GPA grading scale (KZ 4.0 system)
const GRADE_SCALE = [
  { min: 95, letter: "A",  point: 4.0 },
  { min: 90, letter: "A-", point: 3.67 },
  { min: 85, letter: "B+", point: 3.33 },
  { min: 80, letter: "B",  point: 3.0 },
  { min: 75, letter: "B-", point: 2.67 },
  { min: 70, letter: "C+", point: 2.33 },
  { min: 65, letter: "C",  point: 2.0 },
  { min: 60, letter: "C-", point: 1.67 },
  { min: 55, letter: "D+", point: 1.33 },
  { min: 50, letter: "D",  point: 1.0 },
  { min: 0,  letter: "F",  point: 0.0 },
];

function gradeFor(total) {
  return GRADE_SCALE.find((g) => total >= g.min);
}

function subjectTotal(s) {
  return Math.round(s.midterm * 0.4 + s.final * 0.6);
}

function computeGPA(subjects) {
  let pts = 0, cr = 0;
  subjects.forEach((s) => {
    const g = gradeFor(subjectTotal(s));
    pts += g.point * s.credits;
    cr += s.credits;
  });
  return cr ? (pts / cr) : 0;
}
