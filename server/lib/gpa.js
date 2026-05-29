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
