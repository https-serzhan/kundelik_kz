// App: hash router, role-aware layouts, theme/lang/menu wiring.

function now() { return new Date(); }

const COLLEGE_LOGO = "assets/college-logo.svg";

const state = {
  lang: localStorage.getItem("lang") || "kz",
  theme: localStorage.getItem("theme") || "light",
  hwFilter: "all",
  activeChat: null,
  adminStudentId: localStorage.getItem("adminStudentId") || "",
  adminHomeworkId: localStorage.getItem("adminHomeworkId") || "",
  adminChatStudentId: localStorage.getItem("adminChatStudentId") || "",
  user: null,
  data: {},
  editProfile: false,
  sidebarCollapsed: localStorage.getItem("sidebarCollapsed") === "1",
};

window.__onUnauthorized = () => {
  state.user = null;
  state.data = {};
  renderAuth("login");
};

const LAYOUT_HTML = `
  <header class="mobile-bar">
    <button class="icon-btn" id="menuToggle" aria-label="menu">
      <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
    <span class="mobile-title" id="mobileTitle">Күнделік</span>
    <button class="icon-btn" id="themeToggleMobile" aria-label="theme">
      <svg viewBox="0 0 24 24" class="i-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>
    </button>
  </header>

  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-logo"><img src="${COLLEGE_LOGO}" alt="College logo" /></div>
        <div class="brand-text">
          <strong data-i18n="appName">Күнделік</strong>
          <span id="appSub" data-i18n="appSub">Студенттік портал</span>
        </div>
      </div>

      <nav class="nav" id="nav"></nav>

      <div class="sidebar-foot">
        <div class="mini-profile">
          <div class="avatar" id="sideAvatar">АС</div>
          <div class="mini-profile-text">
            <strong id="sideName">—</strong>
            <span id="sideMeta">—</span>
          </div>
        </div>
        <button class="btn logout-btn" id="logoutBtn"></button>
      </div>
    </aside>

    <div class="backdrop" id="backdrop"></div>

    <main class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-btn sidebar-toggle" id="sidebarToggle" aria-label="toggle sidebar">
            <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <h1 class="page-title" id="pageTitle">—</h1>
        </div>
        <div class="topbar-actions">
          <div class="lang-switch" id="langSwitch">
            <button data-lang="kz" class="active">KZ</button>
            <button data-lang="ru">RU</button>
          </div>
          <button class="icon-btn theme-btn" id="themeToggle" aria-label="theme">
            <svg viewBox="0 0 24 24" class="i-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>
            <svg viewBox="0 0 24 24" class="i-moon"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          </button>
        </div>
      </header>

      <div class="view" id="view"></div>
    </main>
  </div>
`;

const ICONS = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  grades: '<path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 7h6M8 11h6M8 15h4"/>',
  schedule: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  homework: '<path d="M14 3v5h5M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5z"/><path d="M9 13l2 2 4-4"/>',
  attendance: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  files: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  exams: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  shield: '<path d="M12 3l7 4v5c0 5-3.5 8.7-7 9-3.5-.3-7-4-7-9V7l7-4z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const t = (key) => I18N[state.lang][key];
const tr = (val) => (val && typeof val === "object" ? val[state.lang] : val);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function icon(name, cls = "") {
  return `<svg viewBox="0 0 24 24" class="${cls}">${ICONS[name] || ""}</svg>`;
}

function isAdmin() {
  return state.user && state.user.role === "admin";
}

function roleLabel(role) {
  return role === "admin" ? t("role_admin") : t("role_student");
}

function rememberAdminState() {
  localStorage.setItem("adminStudentId", state.adminStudentId || "");
  localStorage.setItem("adminHomeworkId", state.adminHomeworkId || "");
  localStorage.setItem("adminChatStudentId", state.adminChatStudentId || "");
}

function ensureAdminStudent(users) {
  if (!users || !users.length) {
    state.adminStudentId = "";
    rememberAdminState();
    return "";
  }
  if (!users.some((u) => u.studentId === state.adminStudentId)) {
    state.adminStudentId = users[0].studentId;
    rememberAdminState();
  }
  return state.adminStudentId;
}

function ensureAdminHomework(homework) {
  if (!homework || !homework.length) {
    state.adminHomeworkId = "";
    rememberAdminState();
    return "";
  }
  if (!homework.some((h) => h.id === state.adminHomeworkId)) {
    state.adminHomeworkId = homework[0].id;
    rememberAdminState();
  }
  return state.adminHomeworkId;
}

function ensureAdminChat(chats) {
  if (!chats || !chats.length) {
    state.adminChatStudentId = "";
    rememberAdminState();
    return "";
  }
  if (!chats.some((c) => c.user.studentId === state.adminChatStudentId)) {
    state.adminChatStudentId = chats[0].user.studentId;
    rememberAdminState();
  }
  return state.adminChatStudentId;
}

function studentSelectHTML(id = "adminStudentSelect") {
  const users = state.data.adminUsers ? state.data.adminUsers.users : [];
  if (!users.length) return `<div class="empty">${t("noData")}</div>`;
  return `<select id="${id}">${users.map((u) =>
    `<option value="${esc(u.studentId)}"${u.studentId === state.adminStudentId ? " selected" : ""}>${esc(u.studentId)} · ${esc(tr(u.name))}</option>`
  ).join("")}</select>`;
}

const KZ_MONTHS = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
const KZ_WEEKDAYS = ["Жексенбі", "Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма", "Сенбі"];

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  if (state.lang === "kz") return `${d.getDate()} ${KZ_MONTHS[d.getMonth()]}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(state.lang === "kz" ? "kk-KZ" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isoToday() {
  return now().toISOString().slice(0, 10);
}

function isPastDateValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value < isoToday();
}

function daysUntil(iso) {
  const d = new Date(iso + "T00:00:00");
  const today = now();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function attendancePct(a) {
  if (!a.total) return 0;
  return Math.round((a.attended / a.total) * 100);
}

function todayStr() {
  const d = now();
  if (state.lang === "kz") return `${KZ_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${KZ_MONTHS[d.getMonth()]}`;
  return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

function toast(msg) {
  let el = $(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function showConfirm(title, body) {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.className = "modal-backdrop";
    host.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h3 id="confirmTitle">${esc(title)}</h3>
        <p>${esc(body)}</p>
        <div class="modal-actions">
          <button class="btn btn-sm" data-confirm-no>${t("cancel")}</button>
          <button class="btn btn-primary btn-sm" data-confirm-yes>${t("confirm")}</button>
        </div>
      </div>
    `;
    const close = (value) => {
      host.remove();
      resolve(value);
    };
    host.addEventListener("click", (e) => {
      if (e.target === host) close(false);
    });
    host.querySelector("[data-confirm-no]").addEventListener("click", () => close(false));
    host.querySelector("[data-confirm-yes]").addEventListener("click", () => close(true));
    document.body.appendChild(host);
  });
}

function layoutSubKey() {
  return isAdmin() ? "appSub_admin" : "appSub";
}

function statCard(label, value, foot, ico, route, count) {
  const tag = route ? "a" : "div";
  const href = route ? ` href="#${route}"` : "";
  const valHtml = count
    ? `<div class="stat-value" data-count="${count.to}" data-suffix="${count.suffix || ""}" data-dec="${count.dec || 0}">0${count.suffix || ""}</div>`
    : `<div class="stat-value">${esc(value)}</div>`;
  return `<${tag}${href} class="card stat${route ? " stat-link" : ""}">
    <div class="stat-top">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-icon">${icon(ico)}</div>
    </div>
    ${valHtml}
    <div class="stat-foot">${esc(foot)}</div>
  </${tag}>`;
}

function gradeFor(total) {
  if (total >= 95) return { letter: "A", point: 4.0 };
  if (total >= 90) return { letter: "A-", point: 3.67 };
  if (total >= 85) return { letter: "B+", point: 3.33 };
  if (total >= 80) return { letter: "B", point: 3.0 };
  if (total >= 75) return { letter: "B-", point: 2.67 };
  if (total >= 70) return { letter: "C+", point: 2.33 };
  if (total >= 65) return { letter: "C", point: 2.0 };
  if (total >= 60) return { letter: "C-", point: 1.67 };
  if (total >= 50) return { letter: "D", point: 1.0 };
  return { letter: "F", point: 0 };
}

function renderAuth() {
  document.body.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-brand">
          <div class="brand-logo brand-logo-auth"><img src="${COLLEGE_LOGO}" alt="College logo" /></div>
        </div>
        <h1>${t("appName")}</h1>
        <div class="li-sub">${t("auth_loginTitle")}</div>
        <div class="auth-error" id="authError"></div>
        <form id="authForm" novalidate>
          <div class="auth-field"><label>${t("auth_email")}</label><input id="f_email" type="text" autocomplete="username" required /></div>
          <div class="auth-field"><label>${t("auth_password")}</label><input id="f_password" type="password" autocomplete="current-password" required /></div>
          <button class="btn btn-primary" type="submit">${t("auth_loginBtn")}</button>
        </form>
      </div>
    </div>`;
  $("#authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#authError");
    err.textContent = "";
    try {
      const payload = { email: $("#f_email").value.trim(), password: $("#f_password").value };
      if (!payload.email || !payload.password) {
        err.textContent = t("auth_fillFields");
        return;
      }
      state.user = await API.login(payload);
      await bootApp();
    } catch (ex) {
      err.textContent = ex.message === "bad_credentials" ? t("auth_badCredentials") : t("auth_error");
    }
  });
}

function viewHome() {
  const h = state.data.home;
  const avgAtt = Math.round(h.avgAtt);
  const pending = h.pending;
  const nextExam = h.nextExam;
  const firstName = (tr(state.user && state.user.name) || "").split(" ")[0];
  const todayDay = now().getDay();
  const todayLessons = h.todayLessons
    .filter((l) => l.day === todayDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  return `
    <div class="hello">
      <h2>${t("home_greeting")}${firstName ? ", " + esc(firstName) : ""}!</h2>
      <p>${esc(todayStr())}</p>
    </div>

    <div class="grid cols-4" style="margin-bottom:16px">
      ${statCard(t("home_gpa"), h.gpa.toFixed(2), "/ 4.00", "grades", "grades", { to: h.gpa, dec: 2 })}
      ${statCard(t("home_attendanceAvg"), avgAtt + "%", t("att_percent"), "attendance", "attendance", { to: avgAtt, suffix: "%" })}
      ${statCard(t("home_pendingHw"), pending, t("hw_pending"), "homework", "homework", { to: pending })}
      ${statCard(
        t("home_nextExam"),
        nextExam ? fmtDate(nextExam.date) : "—",
        nextExam ? tr(nextExam.subject) : t("noData"),
        "exams",
        "exams"
      )}
    </div>

    <div class="grid cols-2">
      <div class="card">
        <div class="card-head"><h2>${t("home_today")}</h2><span class="card-sub">${t("today")}</span></div>
        ${
          todayLessons.length
            ? todayLessons.map((l) => `<div class="lesson today-lesson" data-nav="schedule" tabindex="0" role="link">
                <div class="lesson-time">${esc(l.time)}</div>
                <div class="lesson-body">
                  <div class="li-title">${esc(tr(l.subject))}</div>
                  <div class="li-sub">${esc(tr(l.teacher))} · ${esc(l.room)}</div>
                </div>
                <span class="badge badge-${l.mode === "online" ? "primary" : "muted"}">${l.mode === "online" ? t("online") : t("offline")}</span>
              </div>`).join("")
            : `<div class="empty">${t("noData")}</div>`
        }
      </div>

      <div class="card">
        <div class="card-head"><h2>${t("home_upcoming")}</h2></div>
        <div class="list">
          ${h.upcomingHw.map((item) => {
            const dl = daysUntil(item.deadline);
            const badge =
              dl < 0 ? `badge-danger">${t("hw_overdue")}`
              : dl <= 2 ? `badge-warn">${dl} ${t("hw_daysLeft")}`
              : `badge-success">${dl} ${t("hw_daysLeft")}`;
            return `<div class="list-item" data-nav="homework" tabindex="0" role="link">
              <div class="li-main">
                <div class="li-title">${esc(tr(item.title))}</div>
                <div class="li-sub">${esc(tr(item.subject))} · ${fmtDate(item.deadline)}</div>
              </div>
              <span class="badge ${badge}</span>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>

    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <div class="card-head"><h2>${t("home_news")}</h2></div>
        ${h.news.map((n) => `<div class="news-item">
            <div class="news-meta">
              <span class="badge badge-primary">${esc(tr(n.tag))}</span>
              <span>${fmtDate(n.date)}</span>
            </div>
            <h3>${esc(tr(n.title))}</h3>
            <p>${esc(tr(n.text))}</p>
          </div>`).join("")}
      </div>

      <div class="card">
        <div class="card-head"><h2>${t("home_announce")}</h2></div>
        <div class="list">
          ${h.announcements.map((a) => `<div class="announce ${a.type}">
              <span class="announce-ico">${icon(a.type === "warning" ? "warn" : "info")}</span>
              <div class="li-main">
                <div class="li-title">${esc(tr(a.text))}</div>
                <div class="li-sub">${fmtDate(a.date)}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function viewProfile() {
  const s = state.data.profile;
  const photoSrc = s.photoUrl ? `${s.photoUrl}?v=${state.photoVer || 0}` : null;
  const photoInner = photoSrc
    ? `<img src="${esc(photoSrc)}" alt="" />`
    : `<span>${esc((s.name && s.name.kz || "").slice(0, 2).toUpperCase())}</span>`;

  const contactsBody = state.editProfile
    ? `<form id="contactForm" class="contact-edit">
        <label class="auth-field">
          <span>${t("profile_phone")}</span>
          <input id="f_phone" value="${esc(s.phone || "")}" placeholder="${esc(t("profile_phonePlaceholder"))}" />
        </label>
        <div class="contact-edit-actions">
          <button type="button" class="btn btn-sm" id="contactCancel">${t("cancel")}</button>
          <button type="submit" class="btn btn-primary btn-sm">${t("save")}</button>
        </div>
      </form>`
    : `<dl class="kv">
        <dt>${t("profile_group")}</dt><dd>${esc(s.group)}</dd>
        <dt>${t("profile_id")}</dt><dd>${esc(s.studentId)}</dd>
        <dt>${t("profile_course")}</dt><dd>${s.course}</dd>
        <dt>${t("profile_faculty")}</dt><dd>${esc(tr(s.faculty))}</dd>
        <dt>${t("profile_email")}</dt><dd>${esc(s.email)}</dd>
        <dt>${t("profile_phone")}</dt><dd>${esc(s.phone) || "—"}</dd>
      </dl>`;

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="profile-hero">
        <button class="avatar avatar-lg avatar-edit" id="photoBtn" type="button" title="${esc(t("profile_changePhoto"))}">
          ${photoInner}
          <span class="avatar-cam">${icon("camera")}</span>
        </button>
        <div>
          <h2>${esc(tr(s.name))}</h2>
          <div class="li-sub">${esc(tr(s.faculty))}</div>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            <span class="badge badge-primary">${esc(s.group)}</span>
            <span class="badge badge-muted">${t("profile_course")}: ${s.course}</span>
            <span class="badge badge-muted">ID: ${esc(s.studentId)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h2>${t("profile_contacts")}</h2>
        ${state.editProfile ? "" : `<button class="btn btn-sm" id="editContactBtn">${icon("edit")}${t("profile_edit")}</button>`}
      </div>
      ${contactsBody}
    </div>
  `;
}

function viewGrades() {
  const rows = state.data.grades.subjects.map((s) => {
    const g = gradeFor(s.total);
    return `<tr>
      <td><strong>${esc(tr(s.name))}</strong><div class="li-sub">${esc(tr(s.teacher))}</div></td>
      <td class="num">${s.credits}</td>
      <td class="num">${s.midterm}</td>
      <td class="num">${s.final}</td>
      <td class="num">${s.total}</td>
      <td><span class="badge badge-${g.point >= 3 ? "success" : g.point >= 2 ? "warn" : "danger"}">${g.letter}</span></td>
    </tr>`;
  }).join("");

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="ring-wrap">
        <div class="ring" style="--p:0" data-p="${(state.data.grades.gpa / 4) * 100}">
          <span>${state.data.grades.gpa.toFixed(2)}</span>
        </div>
        <div>
          <div class="section-title" style="margin:0">${t("home_gpa")}</div>
          <div class="li-sub">${t("grades_gpaNote")}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>${t("grades_title")}</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>${t("subject")}</th>
            <th>${t("credits")}</th>
            <th>${t("grades_midterm")}</th>
            <th>${t("grades_final")}</th>
            <th>${t("grades_total")}</th>
            <th>${t("grades_letter")}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function viewSchedule() {
  const days = I18N[state.lang].days;
  const todayDay = now().getDay();
  let html = '<div class="grid cols-2">';
  for (let d = 1; d <= 6; d++) {
    const lessons = state.data.schedule.filter((l) => l.day === d).sort((a, b) => a.time.localeCompare(b.time));
    if (!lessons.length) continue;
    html += `<div class="card day-card">
      <div class="day-head">
        <h3>${esc(days[d - 1])}</h3>
        ${d === todayDay ? `<span class="badge badge-primary">${t("today")}</span>` : ""}
      </div>
      ${lessons.map((l) => `<div class="lesson${d === todayDay ? " today-lesson" : ""}">
          <div class="lesson-time">${esc(l.time)}</div>
          <div class="lesson-body">
            <div class="li-title">${esc(tr(l.subject))}</div>
            <div class="li-sub">${esc(tr(l.teacher))} · ${esc(l.room)}</div>
          </div>
          <span class="badge badge-${l.mode === "online" ? "primary" : "muted"}">${l.mode === "online" ? t("online") : t("offline")}</span>
        </div>`).join("")}
    </div>`;
  }
  html += "</div>";
  return html;
}

function viewHomework() {
  const filters = [
    { id: "all", label: t("all") },
    { id: "pending", label: t("hw_pending") },
    { id: "submitted", label: t("hw_submitted") },
  ];
  const list = state.data.homework.filter((h) => state.hwFilter === "all" || h.status === state.hwFilter);

  return `
    <div class="chips" style="margin-bottom:16px">
      ${filters.map((f) => `<button class="chip${state.hwFilter === f.id ? " active" : ""}" data-hwfilter="${f.id}">${esc(f.label)}</button>`).join("")}
    </div>
    <div class="list">
      ${
        list.length
          ? list.map((h) => {
              const dl = daysUntil(h.deadline);
              let dlBadge = `<span class="badge badge-warn">${dl} ${t("hw_daysLeft")}</span>`;
              if (h.status === "submitted") dlBadge = `<span class="badge badge-success"><span class="dot"></span>${t("hw_submitted")}</span>`;
              else if (h.status === "graded") dlBadge = `<span class="badge badge-success"><span class="dot"></span>${t("admin_graded")}: ${h.score || 0}</span>`;
              else if (dl < 0) dlBadge = `<span class="badge badge-danger">${t("hw_overdue")}</span>`;
              const actions = h.status !== "pending"
                ? ""
                : h.hasFile
                  ? `<div class="row-actions">
                      <button class="btn btn-sm" data-hw-upload="${h.id}">${t("hw_replaceFile")}</button>
                      <button class="btn btn-sm" data-hw-delete="${h.id}">${t("hw_deleteFile")}</button>
                      <button class="btn btn-primary btn-sm" data-hw-confirm="${h.id}">${t("hw_submitNow")}</button>
                    </div>`
                  : `<button class="btn btn-primary btn-sm" data-hw-upload="${h.id}">${t("upload")}</button>`;
              return `<div class="list-item">
                <div class="li-main">
                  <div class="li-title">${esc(tr(h.title))}</div>
                  <div class="li-sub">${esc(tr(h.subject))} · ${t("deadline")}: ${fmtDate(h.deadline)}</div>
                  ${h.status === "pending" && h.hasFile ? `<div class="li-sub">${t("hw_fileReady")}</div>` : ""}
                </div>
                ${dlBadge}
                ${actions}
              </div>`;
            }).join("")
          : `<div class="empty">${t("noData")}</div>`
      }
    </div>
  `;
}

function viewAttendance() {
  return `<div class="grid cols-2">${state.data.attendance.map((a) => {
      const pct = attendancePct(a);
      const cls = pct >= 85 ? "" : pct >= 70 ? " warn" : " danger";
      return `<div class="card" style="padding:16px">
        <div class="card-head" style="margin-bottom:10px">
          <strong>${esc(tr(a.subject))}</strong>
          <span class="badge badge-${pct >= 85 ? "success" : pct >= 70 ? "warn" : "danger"}">${pct}%</span>
        </div>
        <div class="progress${cls}"><span style="width:0" data-pct="${pct}"></span></div>
        <div class="li-sub" style="margin-top:8px">
          ${t("att_attended")}: ${a.attended} ${t("att_of")} ${a.total} ·
          ${t("att_missed")}: ${a.total - a.attended}
        </div>
      </div>`;
    }).join("")}</div>`;
}

function viewChat() {
  const chats = state.data.chats;
  const channels = chats.map((c) => {
    const last = c.messages[c.messages.length - 1];
    const label = c.type === "teacher" ? t("chat_teacher") : c.type === "group" ? t("chat_group") : t("chat_admin");
    return `<div class="chat-channel${state.activeChat === c.id ? " active" : ""}" data-chat="${c.id}">
      <div class="avatar">${esc(label[0])}</div>
      <div class="mini-profile-text">
        <strong>${esc(tr(c.name))}</strong>
        <span>${last ? esc(tr(last.text)).slice(0, 28) : ""}</span>
      </div>
    </div>`;
  }).join("");

  const active = chats.find((c) => c.id === state.activeChat);
  const msgs = active ? active.messages.map((m) => `<div class="msg ${m.from}">
      ${m.from === "them" ? `<div class="msg-author">${esc(tr(m.author))}</div>` : ""}
      <div>${esc(tr(m.text))}</div>
      <div class="msg-time">${esc(m.time)}</div>
    </div>`).join("") : "";

  return `
    <div class="chat-layout">
      <div class="chat-list">${channels}</div>
      <div class="card chat-window">
        <div class="card-head"><h2>${active ? esc(tr(active.name)) : ""}</h2></div>
        <div class="chat-msgs" id="chatMsgs">${msgs}</div>
        <form class="chat-input" id="chatForm">
          <input type="text" id="chatInput" placeholder="${t("chat_placeholder")}" autocomplete="off" />
          <button type="submit" class="btn btn-primary">${t("send")}</button>
        </form>
      </div>
    </div>
  `;
}

function viewFiles() {
  const rows = state.data.files.map((f) => `<div class="file-row">
      <div class="file-ico ${f.type}">${f.type.toUpperCase()}</div>
      <div class="li-main">
        <div class="li-title">${esc(f.name)}</div>
        <div class="li-sub">${esc(tr(f.subject))} · ${esc(f.size)} · ${fmtDate(f.date)}</div>
      </div>
      <button class="btn btn-sm" data-download="${f.id}">${icon("download")}${t("download")}</button>
    </div>`).join("");
  return `<div class="card"><div class="card-head"><h2>${t("files_all")}</h2></div>${rows}</div>`;
}

function viewExams() {
  const upcoming = state.data.exams.filter((e) => e.result === null).sort((a, b) => a.date.localeCompare(b.date));
  const results = state.data.exams.filter((e) => e.result !== null);

  const examCard = (e) => `<div class="card" style="padding:16px">
    <div class="card-head" style="margin-bottom:8px">
      <strong>${esc(tr(e.subject))}</strong>
      ${
        e.result !== null
          ? `<span class="badge badge-${e.result >= 85 ? "success" : e.result >= 60 ? "warn" : "danger"}">${e.result}</span>`
          : `<span class="badge badge-primary">${t("exams_pending")}</span>`
      }
    </div>
    <div class="li-sub li-sub-ico">${icon("clock")}<span>${fmtDate(e.date)} · ${esc(e.time)} · ${esc(e.room)}</span></div>
  </div>`;

  return `
    <div class="section-title">${t("exams_upcoming")}</div>
    <div class="grid cols-3" style="margin-bottom:24px">${upcoming.length ? upcoming.map(examCard).join("") : `<div class="empty">${t("noData")}</div>`}</div>
    <div class="section-title">${t("exams_results")}</div>
    <div class="grid cols-3">${results.length ? results.map(examCard).join("") : `<div class="empty">${t("noData")}</div>`}</div>
  `;
}

function viewAdminOverview() {
  const a = state.data.adminOverview;
  return `
    <div class="hello">
      <h2>${t("admin_welcome")}</h2>
      <p>${t("admin_summary")}</p>
    </div>

    <div class="grid cols-4" style="margin-bottom:16px">
      ${statCard(t("admin_totalUsers"), a.totalUsers, t("admin_usersTitle"), "users", "admin-users", { to: a.totalUsers })}
      ${statCard(t("admin_students"), a.studentCount, t("role_student"), "profile", "admin-users", { to: a.studentCount })}
      ${statCard(t("admin_admins"), a.adminCount, t("role_admin"), "shield", "admin-users", { to: a.adminCount })}
      ${statCard(t("admin_examCount"), a.examCount, t("nav_admin_exams"), "exams", "admin-exams", { to: a.examCount })}
    </div>

    <div class="grid cols-4" style="margin-bottom:16px">
      ${statCard(t("nav_admin_homework"), a.homeworkCount, t("nav_admin_homework"), "homework", "admin-homework", { to: a.homeworkCount })}
      ${statCard(t("nav_admin_files"), a.fileCount, t("nav_admin_files"), "files", "admin-files", { to: a.fileCount })}
      ${statCard(t("admin_news"), a.newsCount, t("admin_manageNews"), "bell", "admin-content", { to: a.newsCount })}
      ${statCard(t("admin_announcements"), a.announcementCount, t("admin_manageAnnouncements"), "info", "admin-content", { to: a.announcementCount })}
    </div>

    <div class="grid cols-2">
      <div class="card">
        <div class="card-head"><h2>${t("admin_recentUsers")}</h2></div>
        <div class="list">
          ${a.recentUsers.map((u) => `<div class="list-item">
              <div class="li-main">
                <div class="li-title">${esc(tr(u.name))}</div>
                <div class="li-sub">${esc(u.email)} · ${t("created")}: ${fmtDateTime(u.createdAt)}</div>
              </div>
              <span class="badge badge-${u.role === "admin" ? "primary" : "muted"}">${roleLabel(u.role)}</span>
            </div>`).join("")}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2>${t("admin_usersNote")}</h2></div>
        <div class="admin-stack">
          <a class="btn" href="#admin-grades">${t("nav_admin_grades")}</a>
          <a class="btn" href="#admin-schedule">${t("nav_admin_schedule")}</a>
          <a class="btn" href="#admin-attendance">${t("nav_admin_attendance")}</a>
          <a class="btn" href="#admin-chat">${t("nav_admin_chat")}</a>
        </div>
      </div>
    </div>
  `;
}

function viewAdminUsers() {
  const rows = state.data.adminUsers.users.map((u) => `<tr>
      <td><strong>${esc(tr(u.name))}</strong></td>
      <td>${esc(u.email)}</td>
      <td class="table-role"><span class="badge badge-${u.role === "admin" ? "primary" : "muted"}">${roleLabel(u.role)}</span></td>
      <td>${esc(u.group || "—")}</td>
      <td>${esc(u.studentId || "—")}</td>
      <td>${u.course || "—"}</td>
      <td>${fmtDateTime(u.createdAt)}</td>
    </tr>`).join("");

  return `
    <div class="compact-note" style="margin-bottom:16px">${t("admin_usersNote")}</div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><h2>${t("admin_addStudent")}</h2></div>
      <form id="studentForm" class="admin-form admin-form-grid">
        <label class="auth-field"><span>${t("auth_name")}</span><input id="studentName" required /></label>
        <label class="auth-field"><span>${t("auth_email")}</span><input id="studentEmail" type="email" required /></label>
        <label class="auth-field"><span>${t("auth_password")}</span><input id="studentPassword" type="password" minlength="6" required /></label>
        <label class="auth-field"><span>${t("profile_group")}</span><input id="studentGroup" required /></label>
        <label class="auth-field"><span>${t("profile_id")}</span><input id="studentExternalId" required /></label>
        <label class="auth-field"><span>${t("profile_course")}</span><input id="studentCourse" value="1" required /></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">${t("admin_addStudent")}</button></div>
      </form>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>${t("auth_name")}</th>
            <th>${t("auth_email")}</th>
            <th>${t("role")}</th>
            <th>${t("profile_group")}</th>
            <th>${t("profile_id")}</th>
            <th>${t("profile_course")}</th>
            <th>${t("created")}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function viewAdminGrades() {
  const users = state.data.adminUsers.users;
  const g = state.data.adminGrades;
  if (!users.length) return `<div class="card"><div class="empty">${t("noData")}</div></div>`;
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><h2>${t("nav_admin_grades")}</h2></div>
      <label class="auth-field"><span>${t("admin_pickStudent")}</span>${studentSelectHTML("gradeStudentSelect")}</label>
      <div class="li-sub">${esc(g.user.studentId)} · ${esc(tr(g.user.name))}</div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t("subject")}</th><th>${t("grades_midterm")}</th><th>${t("grades_final")}</th><th>${t("grades_total")}</th><th></th></tr></thead>
          <tbody>
            ${g.subjects.map((s) => `<tr>
                <td><strong>${esc(tr(s.name))}</strong><div class="li-sub">${esc(tr(s.teacher))}</div></td>
                <td><input data-grade-midterm="${s.id}" type="number" min="0" max="100" value="${s.midterm}" /></td>
                <td><input data-grade-final="${s.id}" type="number" min="0" max="100" value="${s.final}" /></td>
                <td>${s.total}</td>
                <td><button class="btn btn-sm" data-save-grade="${s.id}">${t("save")}</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function viewAdminSchedule() {
  const data = state.data.adminSchedule;
  if (!state.data.adminUsers.users.length) return `<div class="card"><div class="empty">${t("noData")}</div></div>`;
  return `
    <div class="grid cols-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-head"><h2>${t("nav_admin_schedule")}</h2></div>
        <label class="auth-field"><span>${t("admin_pickStudent")}</span>${studentSelectHTML("scheduleStudentSelect")}</label>
      </div>
      <div class="card">
        <div class="card-head"><h2>${t("admin_addLesson")}</h2></div>
        <form id="lessonForm" class="admin-form">
          <label class="auth-field"><span>${t("subject")}</span><select id="lessonSubject">${state.data.adminSubjects.subjects.map((s) => `<option value="${s.id}">${esc(tr(s.name))}</option>`).join("")}</select></label>
          <label class="auth-field"><span>${t("date")}</span><select id="lessonDay">${I18N[state.lang].days.map((d, idx) => `<option value="${idx + 1}">${esc(d)}</option>`).join("")}</select></label>
          <label class="auth-field"><span>${t("time")}</span><input id="lessonTime" placeholder="09:00-10:30" required /></label>
          <label class="auth-field"><span>${t("room")}</span><input id="lessonRoom" required /></label>
          <label class="auth-field"><span>${t("admin_mode")}</span><select id="lessonMode"><option value="offline">${t("offline")}</option><option value="online">${t("online")}</option></select></label>
          <button class="btn btn-primary" type="submit">${t("admin_addLesson")}</button>
        </form>
      </div>
    </div>
    <div class="card">
      <div class="list">
        ${data.lessons.map((l) => `<div class="lesson">
            <div class="lesson-time">${esc(l.time)}</div>
            <div class="lesson-body">
              <div class="li-title">${esc(tr(l.subject))}</div>
              <div class="li-sub">${esc(tr(l.teacher))} · ${esc(l.room)} · ${esc(I18N[state.lang].days[l.day - 1])}</div>
            </div>
            <button class="btn btn-sm" data-delete-lesson="${l.id}">${t("admin_delete")}</button>
          </div>`).join("")}
      </div>
    </div>
  `;
}

function viewAdminHomework() {
  const homework = state.data.adminHomework.homework;
  const current = homework.find((h) => h.id === state.adminHomeworkId);
  return `
    <div class="grid cols-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-head"><h2>${t("admin_addHomework")}</h2></div>
        <form id="adminHomeworkForm" class="admin-form">
          <label class="auth-field"><span>${t("subject")}</span><select id="adminHomeworkSubject">${state.data.adminSubjects.subjects.map((s) => `<option value="${s.id}">${esc(tr(s.name))}</option>`).join("")}</select></label>
          <label class="auth-field"><span>${t("admin_homeworkTitle")}</span><input id="adminHomeworkTitle" required /></label>
          <label class="auth-field"><span>${t("deadline")}</span><input id="adminHomeworkDeadline" type="date" min="${isoToday()}" required /></label>
          <button class="btn btn-primary" type="submit">${t("admin_addHomework")}</button>
        </form>
      </div>
      <div class="card">
        <div class="card-head"><h2>${t("admin_manageHomework")}</h2></div>
        <label class="auth-field"><span>${t("admin_pickHomework")}</span><select id="adminHomeworkSelect">${homework.map((h) => `<option value="${h.id}"${h.id === state.adminHomeworkId ? " selected" : ""}>${esc(tr(h.subject))} · ${esc(tr(h.title))}</option>`).join("")}</select></label>
        ${current ? `<div class="li-sub">${fmtDate(current.deadline)} · ${esc(tr(current.subject))}</div>` : `<div class="empty">${t("noData")}</div>`}
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t("profile_id")}</th><th>${t("auth_name")}</th><th>${t("status")}</th><th>${t("admin_score")}</th><th>${t("download")}</th><th></th></tr></thead>
          <tbody>
            ${(state.data.adminHomeworkSubmissions.submissions || []).map((s) => `<tr>
                <td>${esc(s.studentId)}</td>
                <td>${esc(tr(s.name))}</td>
                <td><select data-hw-status="${s.studentId}"><option value="pending"${s.status === "pending" ? " selected" : ""}>${t("hw_pending")}</option><option value="submitted"${s.status === "submitted" ? " selected" : ""}>${t("hw_submitted")}</option><option value="graded"${s.status === "graded" ? " selected" : ""}>${t("admin_graded")}</option></select></td>
                <td><input data-hw-score="${s.studentId}" type="number" min="0" max="100" value="${s.score}" /></td>
                <td>${s.hasFile ? `<button class="btn btn-sm" data-hw-download="${s.studentId}">${t("download")}</button>` : "—"}</td>
                <td><button class="btn btn-sm" data-save-hw-grade="${s.studentId}">${t("save")}</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function viewAdminFiles() {
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><h2>${t("admin_uploadFile")}</h2></div>
      <form id="adminFileForm" class="admin-form admin-inline-form">
        <label class="auth-field"><span>${t("subject")}</span><select id="adminFileSubject">${state.data.adminSubjects.subjects.map((s) => `<option value="${s.id}">${esc(tr(s.name))}</option>`).join("")}</select></label>
        <label class="auth-field"><span>${t("upload")}</span><input id="adminFileInput" type="file" required /></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">${t("admin_uploadFile")}</button></div>
      </form>
    </div>
    <div class="card">
      ${(state.data.adminFiles.files || []).map((f) => `<div class="file-row">
          <div class="file-ico ${f.type}">${f.type.toUpperCase()}</div>
          <div class="li-main">
            <div class="li-title">${esc(f.name)}</div>
            <div class="li-sub">${esc(tr(f.subject))} · ${esc(f.size)} · ${fmtDate(f.date)}</div>
          </div>
          <div class="file-actions">
            ${f.hasFile ? `<button class="btn btn-sm" data-admin-file-download="${f.id}">${t("download")}</button>` : ""}
            <button class="btn btn-sm" data-admin-file-delete="${f.id}">${icon("trash")}${t("admin_delete")}</button>
          </div>
        </div>`).join("")}
    </div>
  `;
}

function viewAdminExams() {
  const examResults = state.data.adminStudentExams || { exams: [], user: {} };
  return `
    <div class="grid cols-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-head"><h2>${t("admin_addExam")}</h2></div>
        <form id="examForm" class="admin-form">
          <label class="auth-field"><span>${t("subject")}</span><select id="examSubject">${state.data.adminSubjects.subjects.map((s) => `<option value="${s.id}">${esc(tr(s.name))}</option>`).join("")}</select></label>
          <label class="auth-field"><span>${t("date")}</span><input id="examDate" type="date" min="${isoToday()}" required /></label>
          <label class="auth-field"><span>${t("time")}</span><input id="examTime" type="time" required /></label>
          <label class="auth-field"><span>${t("room")}</span><input id="examRoom" required /></label>
          <button class="btn btn-primary" type="submit">${t("admin_addExam")}</button>
        </form>
      </div>
      <div class="card">
        <div class="card-head"><h2>${t("admin_gradeExam")}</h2></div>
        <label class="auth-field"><span>${t("admin_pickStudent")}</span>${studentSelectHTML("examStudentSelect")}</label>
        <div class="li-sub">${esc(examResults.user.studentId || "")}${examResults.user.studentId ? " · " : ""}${esc(tr(examResults.user.name || ""))}</div>
        <div class="compact-note" style="margin-top:12px">${t("admin_examPastOnly")}</div>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t("subject")}</th><th>${t("date")}</th><th>${t("time")}</th><th>${t("room")}</th><th>${t("admin_examResult")}</th><th></th><th></th><th></th></tr></thead>
          <tbody>
            ${state.data.adminExams.exams.map((e) => {
              const studentExam = (examResults.exams || []).find((row) => row.id === e.id);
              return `<tr>
                <td>${esc(tr(e.subject))}</td>
                <td><input data-exam-date="${e.id}" type="date" min="${isoToday()}" value="${e.date}" /></td>
                <td><input data-exam-time="${e.id}" type="time" value="${e.time}" /></td>
                <td><input data-exam-room="${e.id}" value="${e.room}" /></td>
                <td>
                  ${
                    studentExam && studentExam.canGrade
                      ? `<input data-exam-result="${e.id}" type="number" min="0" max="100" value="${studentExam.result ?? ""}" />`
                      : `<span class="badge badge-muted">${t("admin_examLocked")}</span>`
                  }
                </td>
                <td>${studentExam && studentExam.canGrade ? `<button class="btn btn-sm" data-save-exam-result="${e.id}">${t("save")}</button>` : ""}</td>
                <td><button class="btn btn-sm" data-save-exam="${e.id}">${t("save")}</button></td>
                <td><button class="btn btn-sm" data-delete-exam="${e.id}">${t("admin_delete")}</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function viewAdminAttendance() {
  const data = state.data.adminAttendance;
  if (!state.data.adminUsers.users.length) return `<div class="card"><div class="empty">${t("noData")}</div></div>`;
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><h2>${t("nav_admin_attendance")}</h2></div>
      <label class="auth-field"><span>${t("admin_pickStudent")}</span>${studentSelectHTML("attendanceStudentSelect")}</label>
      <div class="li-sub">${esc(data.user.studentId)} · ${esc(tr(data.user.name))}</div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t("subject")}</th><th>${t("att_attended")}</th><th>${t("admin_totalLessons")}</th><th></th></tr></thead>
          <tbody>
            ${data.attendance.map((a) => `<tr>
                <td>${esc(tr(a.subject))}</td>
                <td><input data-attended="${a.subjectId}" type="number" min="0" value="${a.attended}" /></td>
                <td><input data-total="${a.subjectId}" type="number" min="0" value="${a.total}" /></td>
                <td><button class="btn btn-sm" data-save-attendance="${a.subjectId}">${t("save")}</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function viewAdminChat() {
  const chats = state.data.adminChats.chats || [];
  const active = chats.find((c) => c.user.studentId === state.adminChatStudentId) || chats[0];
  const channels = chats.map((c) => `<div class="chat-channel${active && active.user.studentId === c.user.studentId ? " active" : ""}" data-admin-chat="${c.user.studentId}">
      <div class="avatar">${esc((c.user.studentId || "S")[0])}</div>
      <div class="mini-profile-text">
        <strong>${esc(tr(c.user.name))}</strong>
        <span>${esc(c.user.studentId)}</span>
      </div>
    </div>`).join("");
  const msgs = active ? active.messages.map((m) => `<div class="msg ${m.from === "admin" ? "me" : "them"}">
      ${m.from === "student" ? `<div class="msg-author">${esc(tr(m.author))}</div>` : ""}
      <div>${esc(tr(m.text))}</div>
      <div class="msg-time">${esc(m.time)}</div>
    </div>`).join("") : "";
  return `
    <div class="chat-layout">
      <div class="chat-list">${channels}</div>
      <div class="card chat-window">
        <div class="card-head"><h2>${active ? `${esc(active.user.studentId)} · ${esc(tr(active.user.name))}` : ""}</h2></div>
        <div class="chat-msgs" id="adminChatMsgs">${msgs}</div>
        <form class="chat-input" id="adminChatForm">
          <input type="text" id="adminChatInput" placeholder="${t("chat_placeholder")}" autocomplete="off" />
          <button type="submit" class="btn btn-primary">${t("send")}</button>
        </form>
      </div>
    </div>
  `;
}

function viewAdminContent() {
  const c = state.data.adminContent;
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><h2>${t("admin_contentTitle")}</h2></div>
      <div class="admin-note">${t("admin_summary")}</div>
    </div>

    <div class="grid cols-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-head"><h2>${t("admin_addNews")}</h2></div>
        <form id="newsForm" class="admin-form">
          <label class="auth-field"><span>${t("admin_newsTitle")}</span><input id="newsTitle" required /></label>
          <label class="auth-field"><span>${t("admin_newsTag")}</span><input id="newsTag" required /></label>
          <label class="auth-field"><span>${t("date")}</span><input id="newsDate" type="date" min="${isoToday()}" required /></label>
          <label class="auth-field"><span>${t("admin_newsText")}</span><textarea id="newsText" required></textarea></label>
          <button class="btn btn-primary" type="submit">${t("save")}</button>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>${t("admin_addAnnouncement")}</h2></div>
        <form id="announcementForm" class="admin-form">
          <label class="auth-field"><span>${t("date")}</span><input id="announcementDate" type="date" min="${isoToday()}" required /></label>
          <label class="auth-field"><span>${t("admin_type")}</span>
            <select id="announcementType">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
            </select>
          </label>
          <label class="auth-field"><span>${t("admin_announcementText")}</span><textarea id="announcementText" required></textarea></label>
          <button class="btn btn-primary" type="submit">${t("save")}</button>
        </form>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <div class="card-head"><h2>${t("admin_manageNews")}</h2></div>
        <div class="admin-stack">
          ${c.news.map((n) => `<div class="news-item">
              <div class="news-meta">
                <span class="badge badge-primary">${esc(tr(n.tag))}</span>
                <span>${fmtDate(n.date)}</span>
              </div>
              <h3>${esc(tr(n.title))}</h3>
              <p>${esc(tr(n.text))}</p>
              <div style="margin-top:12px"><button class="btn btn-sm" data-delete-news="${n.id}">${t("admin_delete")}</button></div>
            </div>`).join("")}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>${t("admin_manageAnnouncements")}</h2></div>
        <div class="admin-stack">
          ${c.announcements.map((a) => `<div class="announce ${a.type}">
              <span class="announce-ico">${icon(a.type === "warning" ? "warn" : "info")}</span>
              <div class="li-main">
                <div class="li-title">${esc(tr(a.text))}</div>
                <div class="li-sub">${fmtDate(a.date)}</div>
                <div style="margin-top:10px"><button class="btn btn-sm" data-delete-announcement="${a.id}">${t("admin_delete")}</button></div>
              </div>
            </div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

const STUDENT_ROUTES = {
  home: { title: "nav_home", icon: "home", render: viewHome, load: () => API.home() },
  profile: { title: "nav_profile", icon: "profile", render: viewProfile, load: () => API.profile() },
  grades: { title: "nav_grades", icon: "grades", render: viewGrades, load: () => API.grades() },
  schedule: { title: "nav_schedule", icon: "schedule", render: viewSchedule, load: () => API.schedule() },
  homework: { title: "nav_homework", icon: "homework", render: viewHomework, load: () => API.homework() },
  attendance: { title: "nav_attendance", icon: "attendance", render: viewAttendance, load: () => API.attendance() },
  chat: { title: "nav_chat", icon: "chat", render: viewChat, load: () => API.chats() },
  files: { title: "nav_files", icon: "files", render: viewFiles, load: () => API.files() },
  exams: { title: "nav_exams", icon: "exams", render: viewExams, load: () => API.exams() },
};

const ADMIN_ROUTES = {
  "admin-overview": { title: "nav_admin_overview", icon: "shield", render: viewAdminOverview, load: () => API.adminOverview() },
  "admin-users": { title: "nav_admin_users", icon: "users", render: viewAdminUsers, load: () => API.adminUsers() },
  "admin-grades": { title: "nav_admin_grades", icon: "grades", render: viewAdminGrades, load: null },
  "admin-schedule": { title: "nav_admin_schedule", icon: "schedule", render: viewAdminSchedule, load: null },
  "admin-homework": { title: "nav_admin_homework", icon: "homework", render: viewAdminHomework, load: null },
  "admin-files": { title: "nav_admin_files", icon: "files", render: viewAdminFiles, load: null },
  "admin-exams": { title: "nav_admin_exams", icon: "exams", render: viewAdminExams, load: null },
  "admin-attendance": { title: "nav_admin_attendance", icon: "attendance", render: viewAdminAttendance, load: null },
  "admin-chat": { title: "nav_admin_chat", icon: "chat", render: viewAdminChat, load: null },
  "admin-content": { title: "nav_admin_content", icon: "bell", render: viewAdminContent, load: () => API.adminContent() },
};

function routeMap() {
  return isAdmin() ? ADMIN_ROUTES : STUDENT_ROUTES;
}

function defaultRoute() {
  return isAdmin() ? "admin-overview" : "home";
}

function currentRoute() {
  const r = location.hash.replace("#", "");
  const map = routeMap();
  return map[r] ? r : defaultRoute();
}

function renderNav() {
  const nav = $("#nav");
  if (!nav) return;
  nav.innerHTML = Object.entries(routeMap()).map(([key, def]) => `
    <a href="#${key}" data-route="${key}" class="nav-item">
      <span class="nav-ico" data-ico="${def.icon}"></span>
      <span data-i18n="${def.title}">${t(def.title)}</span>
    </a>
  `).join("");
  injectNavIcons();
}

async function bootApp() {
  state.data = {};
  document.body.innerHTML = LAYOUT_HTML;
  renderNav();
  applyTheme();
  applyLang();
  applySidebar();

  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#themeToggleMobile").addEventListener("click", toggleTheme);
  $("#menuToggle").addEventListener("click", openMenu);
  $("#sidebarToggle").addEventListener("click", toggleSidebar);
  $("#backdrop").addEventListener("click", closeMenu);
  $$("#langSwitch button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
  $("#logoutBtn").addEventListener("click", async () => {
    await API.logout();
    state.user = null;
    state.data = {};
    renderAuth("login");
  });

  if (!bootApp._wired) {
    window.addEventListener("hashchange", render);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
    bootApp._wired = true;
  }

  if (!location.hash) location.hash = "#" + defaultRoute();
  await render();
}

async function loadRoute(route) {
  const def = routeMap()[route];
  if (!def) return;
  if (!isAdmin()) {
    const data = await def.load();
    if (route === "chat") {
      state.data.chats = data;
      if (!state.activeChat && state.data.chats[0]) state.activeChat = state.data.chats[0].id;
      return;
    }
    state.data[route] = data;
    return;
  }

  if (route === "admin-overview") {
    state.data.adminOverview = await API.adminOverview();
    return;
  }
  if (route === "admin-users") {
    state.data.adminUsers = await API.adminUsers();
    return;
  }
  if (route === "admin-content") {
    state.data.adminContent = await API.adminContent();
    return;
  }

  if (!state.data.adminUsers || !state.data.adminUsers.users) state.data.adminUsers = await API.adminUsers();
  const users = state.data.adminUsers.users;

  if (route === "admin-grades") {
    ensureAdminStudent(users);
    state.data.adminGrades = state.adminStudentId ? await API.adminStudentGrades(state.adminStudentId) : { subjects: [], user: {} };
    return;
  }

  if (route === "admin-schedule") {
    state.data.adminSubjects = await API.adminSubjects();
    ensureAdminStudent(users);
    state.data.adminSchedule = state.adminStudentId ? await API.adminStudentSchedule(state.adminStudentId) : { lessons: [], user: {} };
    return;
  }

  if (route === "admin-homework") {
    state.data.adminSubjects = await API.adminSubjects();
    state.data.adminHomework = await API.adminHomework();
    ensureAdminHomework(state.data.adminHomework.homework);
    state.data.adminHomeworkSubmissions = state.adminHomeworkId
      ? await API.adminHomeworkSubmissions(state.adminHomeworkId)
      : { submissions: [] };
    return;
  }

  if (route === "admin-files") {
    state.data.adminSubjects = await API.adminSubjects();
    state.data.adminFiles = await API.adminFiles();
    return;
  }

  if (route === "admin-exams") {
    state.data.adminSubjects = await API.adminSubjects();
    state.data.adminExams = await API.adminExams();
    ensureAdminStudent(users);
    state.data.adminStudentExams = state.adminStudentId
      ? await API.adminStudentExams(state.adminStudentId)
      : { exams: [], user: {} };
    return;
  }

  if (route === "admin-attendance") {
    ensureAdminStudent(users);
    state.data.adminAttendance = state.adminStudentId ? await API.adminStudentAttendance(state.adminStudentId) : { attendance: [], user: {} };
    return;
  }

  if (route === "admin-chat") {
    state.data.adminChats = await API.adminChats();
    ensureAdminChat(state.data.adminChats.chats);
  }
}

function skeletonHTML() {
  const card = `<div class="card sk-card"><div class="sk sk-line w40"></div><div class="sk sk-line w70"></div><div class="sk sk-line w90"></div></div>`;
  return `<div class="grid cols-4" style="margin-bottom:16px">${card}${card}${card}${card}</div><div class="grid cols-2">${card}${card}</div>`;
}

async function render() {
  const route = currentRoute();
  const def = routeMap()[route];
  if (!def) return;
  if (route !== "profile") state.editProfile = false;
  const view = $("#view");
  const title = t(def.title);

  $("#pageTitle").textContent = title;
  $("#mobileTitle").textContent = title;
  document.title = `${title} · ${t("appName")}`;
  $$(".nav-item").forEach((a) => a.classList.toggle("active", a.dataset.route === route));

  view.innerHTML = skeletonHTML();
  try {
    await loadRoute(route);
  } catch (e) {
    if (e.message === "unauthorized") return;
    view.innerHTML = `<div class="empty error-state"><div>${esc(t("loadError"))}</div><button class="btn btn-primary btn-sm" id="retryBtn">${esc(t("retry"))}</button></div>`;
    toast(t("loadError"));
    const rb = $("#retryBtn");
    if (rb) rb.addEventListener("click", render);
    return;
  }

  if (route === "chat" && !state.activeChat && state.data.chats[0]) state.activeChat = state.data.chats[0].id;
  view.innerHTML = def.render();
  view.classList.remove("view-anim");
  void view.offsetWidth;
  view.classList.add("view-anim");

  bindViewEvents(route);
  animateView();
  closeMenu();
}

function animateView() {
  $$("[data-count]").forEach((el) => {
    const to = parseFloat(el.dataset.count) || 0;
    const dec = parseInt(el.dataset.dec, 10) || 0;
    const suffix = el.dataset.suffix || "";
    const start = performance.now();
    const dur = 900;
    const step = (ts) => {
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  requestAnimationFrame(() => {
    $$(".ring[data-p]").forEach((el) => { el.style.setProperty("--p", el.dataset.p); });
    $$(".progress > span[data-pct]").forEach((el) => { el.style.width = el.dataset.pct + "%"; });
  });
}

function bindViewEvents(route) {
  $$("[data-nav]").forEach((el) => {
    const go = () => { location.hash = "#" + el.dataset.nav; };
    el.addEventListener("click", go);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });

  if (route === "profile") {
    const photoBtn = $("#photoBtn");
    if (photoBtn) photoBtn.addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".png,.jpg,.jpeg";
      inp.onchange = async () => {
        if (!inp.files[0]) return;
        const fd = new FormData();
        fd.append("photo", inp.files[0]);
        try {
          await API.uploadPhoto(fd);
          state.photoVer = (state.photoVer || 0) + 1;
          state.data.profile = await API.profile();
          toast(t("profile_photoUpdated"));
          render();
        } catch (e) {
          if (e.message !== "unauthorized") toast(t("auth_error"));
        }
      };
      inp.click();
    });

    const editBtn = $("#editContactBtn");
    if (editBtn) editBtn.addEventListener("click", () => { state.editProfile = true; render(); });
    const cancelBtn = $("#contactCancel");
    if (cancelBtn) cancelBtn.addEventListener("click", () => { state.editProfile = false; render(); });
    const form = $("#contactForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await API.updateProfile({ phone: $("#f_phone").value.trim() });
        state.editProfile = false;
        state.data.profile = await API.profile();
        toast(t("profile_saved"));
        render();
      } catch (ex) {
        if (ex.message !== "unauthorized") toast(t("auth_error"));
      }
    });
  }

  if (route === "homework") {
    $$("[data-hwfilter]").forEach((b) => b.addEventListener("click", () => {
      state.hwFilter = b.dataset.hwfilter;
      render();
    }));
    $$("[data-hw-upload]").forEach((b) => b.addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg";
      inp.onchange = async () => {
        if (!inp.files[0]) return;
        const fd = new FormData();
        fd.append("file", inp.files[0]);
        await API.uploadHwDraft(b.dataset.hwUpload, fd);
        toast(t("hw_fileUploaded"));
        await render();
      };
      inp.click();
    }));
    $$("[data-hw-delete]").forEach((b) => b.addEventListener("click", async () => {
      await API.deleteHwDraft(b.dataset.hwDelete);
      toast(t("admin_deleted"));
      await render();
    }));
    $$("[data-hw-confirm]").forEach((b) => b.addEventListener("click", async () => {
      const ok = await showConfirm(t("hw_confirmTitle"), t("hw_confirmBody"));
      if (!ok) return;
      await API.confirmHwSubmit(b.dataset.hwConfirm);
      toast(t("hw_submittedMsg"));
      await render();
    }));
  }

  if (route === "files") {
    $$("[data-download]").forEach((b) => b.addEventListener("click", () => {
      window.location = `/api/files/${b.dataset.download}/download`;
    }));
  }

  if (route === "chat") {
    $$("[data-chat]").forEach((c) => c.addEventListener("click", () => {
      state.activeChat = +c.dataset.chat;
      render();
    }));
    const form = $("#chatForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = $("#chatInput");
      const text = input.value.trim();
      if (!text) return;
      await API.sendMsg(state.activeChat, text);
      await render();
      const box = $("#chatMsgs");
      if (box) box.scrollTop = box.scrollHeight;
    });
    const box = $("#chatMsgs");
    if (box) box.scrollTop = box.scrollHeight;
  }

  if (route === "admin-users") {
    const form = $("#studentForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const created = await API.createStudent({
        name: $("#studentName").value.trim(),
        email: $("#studentEmail").value.trim(),
        password: $("#studentPassword").value,
        group: $("#studentGroup").value.trim(),
        studentId: $("#studentExternalId").value.trim(),
        course: Number($("#studentCourse").value),
      });
      state.adminStudentId = created.user.studentId;
      rememberAdminState();
      toast(t("admin_saved"));
      state.data.adminUsers = await API.adminUsers();
      render();
    });
  }

  if (route === "admin-grades") {
    const picker = $("#gradeStudentSelect");
    if (picker) picker.addEventListener("change", async () => {
      state.adminStudentId = picker.value;
      rememberAdminState();
      await render();
    });
    $$("[data-save-grade]").forEach((b) => b.addEventListener("click", async () => {
      const subjectId = b.dataset.saveGrade;
      const midterm = Number($(`[data-grade-midterm="${subjectId}"]`).value);
      const final = Number($(`[data-grade-final="${subjectId}"]`).value);
      if (
        !Number.isFinite(midterm) ||
        !Number.isFinite(final) ||
        midterm < 0 ||
        midterm > 100 ||
        final < 0 ||
        final > 100
      ) {
        toast(t("admin_scoreRange"));
        return;
      }
      await API.updateStudentGrade(state.adminStudentId, subjectId, {
        midterm,
        final,
      });
      toast(t("admin_saved"));
      await render();
    }));
  }

  if (route === "admin-schedule") {
    const picker = $("#scheduleStudentSelect");
    if (picker) picker.addEventListener("change", async () => {
      state.adminStudentId = picker.value;
      rememberAdminState();
      await render();
    });
    const form = $("#lessonForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await API.addStudentLesson(state.adminStudentId, {
        subjectId: $("#lessonSubject").value,
        day: Number($("#lessonDay").value),
        time: $("#lessonTime").value.trim(),
        room: $("#lessonRoom").value.trim(),
        mode: $("#lessonMode").value,
      });
      toast(t("admin_saved"));
      await render();
    });
    $$("[data-delete-lesson]").forEach((b) => b.addEventListener("click", async () => {
      await API.deleteStudentLesson(state.adminStudentId, b.dataset.deleteLesson);
      toast(t("admin_deleted"));
      await render();
    }));
  }

  if (route === "admin-homework") {
    const form = $("#adminHomeworkForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const deadline = $("#adminHomeworkDeadline").value;
      if (isPastDateValue(deadline)) {
        toast(t("admin_futureDateOnly"));
        return;
      }
      const res = await API.createHomework({
        subjectId: $("#adminHomeworkSubject").value,
        title: $("#adminHomeworkTitle").value.trim(),
        deadline,
      });
      state.adminHomeworkId = res.id;
      rememberAdminState();
      toast(t("admin_saved"));
      await render();
    });
    const picker = $("#adminHomeworkSelect");
    if (picker) picker.addEventListener("change", async () => {
      state.adminHomeworkId = picker.value;
      rememberAdminState();
      await render();
    });
    $$("[data-save-hw-grade]").forEach((b) => b.addEventListener("click", async () => {
      const sid = b.dataset.saveHwGrade;
      const score = Number($(`[data-hw-score="${sid}"]`).value);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        toast(t("admin_scoreRange"));
        return;
      }
      await API.updateHomeworkSubmission(state.adminHomeworkId, sid, {
        status: $(`[data-hw-status="${sid}"]`).value,
        score,
      });
      toast(t("admin_saved"));
      await render();
    }));
    $$("[data-hw-download]").forEach((b) => b.addEventListener("click", () => {
      window.location = `/api/admin/homework/${state.adminHomeworkId}/submissions/${encodeURIComponent(b.dataset.hwDownload)}/download`;
    }));
  }

  if (route === "admin-files") {
    const form = $("#adminFileForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fileInput = $("#adminFileInput");
      if (!fileInput.files[0]) return;
      const fd = new FormData();
      fd.append("file", fileInput.files[0]);
      fd.append("subjectId", $("#adminFileSubject").value);
      await API.uploadAdminFile(fd);
      toast(t("admin_saved"));
      await render();
    });
    $$("[data-admin-file-download]").forEach((b) => b.addEventListener("click", () => {
      window.location = `/api/admin/files/${b.dataset.adminFileDownload}/download`;
    }));
    $$("[data-admin-file-delete]").forEach((b) => b.addEventListener("click", async () => {
      await API.deleteAdminFile(b.dataset.adminFileDelete);
      toast(t("admin_deleted"));
      await render();
    }));
  }

  if (route === "admin-exams") {
    const picker = $("#examStudentSelect");
    if (picker) picker.addEventListener("change", async () => {
      state.adminStudentId = picker.value;
      rememberAdminState();
      await render();
    });
    const form = $("#examForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const date = $("#examDate").value;
      if (isPastDateValue(date)) {
        toast(t("admin_futureDateOnly"));
        return;
      }
      await API.createExam({
        subjectId: $("#examSubject").value,
        date,
        time: $("#examTime").value.trim(),
        room: $("#examRoom").value.trim(),
      });
      toast(t("admin_saved"));
      await render();
    });
    $$("[data-save-exam-result]").forEach((b) => b.addEventListener("click", async () => {
      const examId = b.dataset.saveExamResult;
      const raw = $(`[data-exam-result="${examId}"]`).value.trim();
      const result = raw === "" ? null : Number(raw);
      if (result !== null && (!Number.isFinite(result) || result < 0 || result > 100)) {
        toast(t("admin_scoreRange"));
        return;
      }
      await API.updateStudentExamResult(state.adminStudentId, examId, { result });
      toast(t("admin_saved"));
      await render();
    }));
    $$("[data-save-exam]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.saveExam;
      const date = $(`[data-exam-date="${id}"]`).value;
      if (isPastDateValue(date)) {
        toast(t("admin_futureDateOnly"));
        return;
      }
      await API.updateExam(id, {
        date,
        time: $(`[data-exam-time="${id}"]`).value.trim(),
        room: $(`[data-exam-room="${id}"]`).value.trim(),
      });
      toast(t("admin_saved"));
      await render();
    }));
    $$("[data-delete-exam]").forEach((b) => b.addEventListener("click", async () => {
      await API.deleteExam(b.dataset.deleteExam);
      toast(t("admin_deleted"));
      await render();
    }));
  }

  if (route === "admin-attendance") {
    const picker = $("#attendanceStudentSelect");
    if (picker) picker.addEventListener("change", async () => {
      state.adminStudentId = picker.value;
      rememberAdminState();
      await render();
    });
    $$("[data-save-attendance]").forEach((b) => b.addEventListener("click", async () => {
      const subjectId = b.dataset.saveAttendance;
      await API.updateStudentAttendance(state.adminStudentId, subjectId, {
        attended: Number($(`[data-attended="${subjectId}"]`).value),
        total: Number($(`[data-total="${subjectId}"]`).value),
      });
      toast(t("admin_saved"));
      await render();
    }));
  }

  if (route === "admin-chat") {
    $$("[data-admin-chat]").forEach((c) => c.addEventListener("click", async () => {
      state.adminChatStudentId = c.dataset.adminChat;
      rememberAdminState();
      await render();
    }));
    const form = $("#adminChatForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = $("#adminChatInput");
      const text = input.value.trim();
      if (!text) return;
      await API.sendAdminMsg(state.adminChatStudentId, text);
      await render();
      const box = $("#adminChatMsgs");
      if (box) box.scrollTop = box.scrollHeight;
    });
    const box = $("#adminChatMsgs");
    if (box) box.scrollTop = box.scrollHeight;
  }

  if (route === "admin-content") {
    const newsForm = $("#newsForm");
    if (newsForm) newsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const date = $("#newsDate").value;
      if (isPastDateValue(date)) {
        toast(t("admin_futureDateOnly"));
        return;
      }
      await API.createNews({
        title: $("#newsTitle").value.trim(),
        tag: $("#newsTag").value.trim(),
        date,
        text: $("#newsText").value.trim(),
      });
      toast(t("admin_saved"));
      await render();
    });

    const annForm = $("#announcementForm");
    if (annForm) annForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const date = $("#announcementDate").value;
      if (isPastDateValue(date)) {
        toast(t("admin_futureDateOnly"));
        return;
      }
      await API.createAnnouncement({
        date,
        type: $("#announcementType").value,
        text: $("#announcementText").value.trim(),
      });
      toast(t("admin_saved"));
      await render();
    });

    $$("[data-delete-news]").forEach((b) => b.addEventListener("click", async () => {
      await API.deleteNews(b.dataset.deleteNews);
      toast(t("admin_deleted"));
      await render();
    }));

    $$("[data-delete-announcement]").forEach((b) => b.addEventListener("click", async () => {
      await API.deleteAnnouncement(b.dataset.deleteAnnouncement);
      toast(t("admin_deleted"));
      await render();
    }));
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  localStorage.setItem("theme", state.theme);
  applyTheme();
}

function applyLang() {
  document.documentElement.lang = state.lang;
  $$("[data-i18n]").forEach((el) => {
    const key = el.id === "appSub" ? layoutSubKey() : el.dataset.i18n;
    const val = I18N[state.lang][key];
    if (val) el.textContent = val;
  });
  $$("#langSwitch button").forEach((b) => b.classList.toggle("active", b.dataset.lang === state.lang));
  if ($("#logoutBtn")) $("#logoutBtn").textContent = t("auth_logout");
  if (state.user) {
    $("#sideName").textContent = tr(state.user.name);
    $("#sideMeta").textContent = isAdmin() ? roleLabel("admin") : state.user.group;
    $("#sideAvatar").textContent = (state.user.name.kz || "").slice(0, 2).toUpperCase();
  }
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem("lang", state.lang);
  applyLang();
  render();
}

function injectNavIcons() {
  $$(".nav-ico").forEach((el) => {
    el.innerHTML = icon(el.dataset.ico);
  });
}

function openMenu() {
  $("#sidebar").classList.add("open");
  $("#backdrop").classList.add("show");
  document.body.classList.add("menu-open");
}

function closeMenu() {
  $("#sidebar").classList.remove("open");
  $("#backdrop").classList.remove("show");
  document.body.classList.remove("menu-open");
}

function applySidebar() {
  document.body.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  localStorage.setItem("sidebarCollapsed", state.sidebarCollapsed ? "1" : "0");
  applySidebar();
}

async function init() {
  try {
    state.user = await API.me();
    await bootApp();
  } catch {
    renderAuth("login");
  }
}

document.addEventListener("DOMContentLoaded", init);
