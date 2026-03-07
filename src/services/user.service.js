const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

async function createUser({ username, email, phone, password }) {
  const password_hash = await bcrypt.hash(password, 12);
  const { rows: roleRows } = await pool.query("SELECT id FROM roles WHERE name='USER'");
  const role_id = roleRows[0]?.id;
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, phone, password_hash, role_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, username, email, phone, role_id`,
    [username, email, phone || null, password_hash, role_id]
  );
  return rows[0];
}

async function verifyUser(email, password) {
  const { rows } = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM users u JOIN roles r ON r.id=u.role_id
     WHERE u.email=$1`,
    [email]
  );
  const user = rows[0];
  if (!user || !user.is_active) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
}

module.exports = { createUser, verifyUser };
