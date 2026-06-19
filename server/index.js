// Загружаем .env из корня проекта первым делом (нативно, без dotenv).
// Стабильно с Node 20.12+. Файл .env лежит в .gitignore — ключ наружу не утекает.
process.loadEnvFile();
const createApp = require("./app");
const PORT = process.env.PORT || 3000;
createApp().listen(PORT, () => console.log(`Күнделік на http://localhost:${PORT}`));
