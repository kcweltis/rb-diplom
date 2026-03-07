const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function run(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const sql = fs.readFileSync(abs, "utf-8");
  try {
    await pool.query(sql);
    console.log("OK:", filePath);
  } finally {
    await pool.end();
  }
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node src/db/run-sql.js <file.sql>");
  process.exit(1);
}
run(file).catch((e) => {
  console.error(e);
  process.exit(1);
});
