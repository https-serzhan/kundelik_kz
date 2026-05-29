// fetch-обёртки. credentials:include — чтобы cookie-сессия ходила.
const API = {
  async req(method, url, body, isForm) {
    const opts = { method, credentials: "include", headers: {} };
    if (body && !isForm) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    if (body && isForm) opts.body = body;
    const res = await fetch(url, opts);
    if (res.status === 401) {
      if (url !== "/api/auth/login") {
        window.__onUnauthorized && window.__onUnauthorized();
        throw new Error("unauthorized");
      }
    }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    return res.status === 204 ? null : res.json();
  },
  get: (u) => API.req("GET", u),
  post: (u, b) => API.req("POST", u, b),
  patch: (u, b) => API.req("PATCH", u, b),
  delete: (u) => API.req("DELETE", u),
  postForm: (u, fd) => API.req("POST", u, fd, true),

  register: (d) => API.post("/api/auth/register", d),
  login: (d) => API.post("/api/auth/login", d),
  logout: () => API.post("/api/auth/logout"),
  me: () => API.get("/api/auth/me"),
  home: () => API.get("/api/home"),
  profile: () => API.get("/api/profile"),
  uploadPhoto: (fd) => API.postForm("/api/profile/photo", fd),
  updateProfile: (d) => API.patch("/api/profile", d),
  grades: () => API.get("/api/grades"),
  schedule: () => API.get("/api/schedule"),
  attendance: () => API.get("/api/attendance"),
  homework: () => API.get("/api/homework"),
  uploadHwDraft: (id, fd) => API.postForm(`/api/homework/${id}/file`, fd),
  deleteHwDraft: (id) => API.delete(`/api/homework/${id}/file`),
  confirmHwSubmit: (id) => API.post(`/api/homework/${id}/submit`, {}),
  submitHw: (id, fd) => API.postForm(`/api/homework/${id}/submit`, fd),
  exams: () => API.get("/api/exams"),
  files: () => API.get("/api/files"),
  chats: () => API.get("/api/chats"),
  sendMsg: (id, text) => API.post(`/api/chats/${id}/messages`, { text }),
  adminOverview: () => API.get("/api/admin/overview"),
  adminSubjects: () => API.get("/api/admin/subjects"),
  adminUsers: () => API.get("/api/admin/users"),
  createStudent: (d) => API.post("/api/admin/students", d),
  adminStudent: (studentId) => API.get(`/api/admin/students/${encodeURIComponent(studentId)}`),
  adminStudentGrades: (studentId) => API.get(`/api/admin/students/${encodeURIComponent(studentId)}/grades`),
  updateStudentGrade: (studentId, subjectId, d) => API.patch(`/api/admin/students/${encodeURIComponent(studentId)}/grades/${subjectId}`, d),
  adminStudentSchedule: (studentId) => API.get(`/api/admin/students/${encodeURIComponent(studentId)}/schedule`),
  addStudentLesson: (studentId, d) => API.post(`/api/admin/students/${encodeURIComponent(studentId)}/schedule`, d),
  deleteStudentLesson: (studentId, lessonId) => API.delete(`/api/admin/students/${encodeURIComponent(studentId)}/schedule/${lessonId}`),
  adminStudentAttendance: (studentId) => API.get(`/api/admin/students/${encodeURIComponent(studentId)}/attendance`),
  updateStudentAttendance: (studentId, subjectId, d) => API.patch(`/api/admin/students/${encodeURIComponent(studentId)}/attendance/${subjectId}`, d),
  adminStudentHomework: (studentId) => API.get(`/api/admin/students/${encodeURIComponent(studentId)}/homework`),
  adminHomework: () => API.get("/api/admin/homework"),
  createHomework: (d) => API.post("/api/admin/homework", d),
  adminHomeworkSubmissions: (id) => API.get(`/api/admin/homework/${id}/submissions`),
  updateHomeworkSubmission: (id, studentId, d) => API.patch(`/api/admin/homework/${id}/submissions/${encodeURIComponent(studentId)}`, d),
  adminFiles: () => API.get("/api/admin/files"),
  uploadAdminFile: (fd) => API.postForm("/api/admin/files", fd),
  deleteAdminFile: (id) => API.delete(`/api/admin/files/${id}`),
  adminExams: () => API.get("/api/admin/exams"),
  adminStudentExams: (studentId) => API.get(`/api/admin/students/${encodeURIComponent(studentId)}/exams`),
  updateStudentExamResult: (studentId, examId, d) => API.patch(`/api/admin/students/${encodeURIComponent(studentId)}/exams/${examId}`, d),
  createExam: (d) => API.post("/api/admin/exams", d),
  updateExam: (id, d) => API.patch(`/api/admin/exams/${id}`, d),
  deleteExam: (id) => API.delete(`/api/admin/exams/${id}`),
  adminChats: () => API.get("/api/admin/chats"),
  sendAdminMsg: (studentId, text) => API.post(`/api/admin/chats/${encodeURIComponent(studentId)}/messages`, { text }),
  adminContent: () => API.get("/api/admin/content"),
  createNews: (d) => API.post("/api/admin/news", d),
  deleteNews: (id) => API.delete(`/api/admin/news/${id}`),
  createAnnouncement: (d) => API.post("/api/admin/announcements", d),
  deleteAnnouncement: (id) => API.delete(`/api/admin/announcements/${id}`),
};
