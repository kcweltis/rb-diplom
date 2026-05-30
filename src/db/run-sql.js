const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function run(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const sql = fs.readFileSync(abs, "utf-8");
  try {
    await pool.query(sql);
    console.log("OK:", filePath);
  } catch (e) {
    if (e.code === "28P01") {
      console.error("Ошибка подключения к базе данных: неверный пользователь или пароль.");
      console.error("Проверьте DATABASE_URL в файле .env и корректность учетных данных PostgreSQL.");
    } else {
      console.error(e);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node src/db/run-sql.js <file.sql>");
  process.exit(1);
}
run(file);
