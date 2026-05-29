const path = require("path");
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const { seedCommon, ensureAdminUser, backfillUsers } = require("./seed");

const isProd = process.env.NODE_ENV === "production";

function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (isProd) throw new Error("SESSION_SECRET is required in production");
  return "kundelik-dev-secret"; // только для dev/тестов
}

function createApp() {
  seedCommon();
  ensureAdminUser();
  backfillUsers();
  const app = express();
  if (isProd) app.set("trust proxy", 1); // secure-cookie за reverse-proxy
  if (!isProd) {
    app.use((req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      next();
    });
  }
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    store: new SQLiteStore({ db: "sessions.db", dir: path.join(__dirname, "..") }),
    secret: sessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: isProd, maxAge: 1000 * 60 * 60 * 24 * 7 },
  }));

  // Роуты (раскомментируются в Tasks 6–9 по мере создания файлов):
  app.use("/api/auth", require("./routes/auth.routes"));
  app.use("/api/admin", require("./routes/admin.routes"));
  app.use("/api", require("./routes/data.routes"));
  app.use("/api", require("./routes/homework.routes"));
  app.use("/api", require("./routes/files.routes"));
  app.use("/api", require("./routes/chat.routes"));

  app.use(express.static(path.join(__dirname, "..", "public")));
  return app;
}
module.exports = createApp;
