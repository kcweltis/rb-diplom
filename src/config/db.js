const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Put it into .env");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = { pool };
