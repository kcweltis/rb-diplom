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

// Принимает email или номер телефона
async function verifyUser(identifier, password) {
  const { rows } = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM users u JOIN roles r ON r.id=u.role_id
     WHERE u.email=$1 OR u.phone=$1`,
    [identifier]
  );
  const user = rows[0];
  if (!user || !user.is_active) return null;
  if (!user.password_hash) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
}

// Поиск или создание пользователя через Яндекс OAuth
async function findOrCreateYandexUser({ yandex_id, email, username }) {
  // Ищем по yandex_id
  const { rows: byYandex } = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM users u JOIN roles r ON r.id=u.role_id
     WHERE u.yandex_id=$1`,
    [yandex_id]
  );
  if (byYandex[0]) return byYandex[0];

  // Если есть аккаунт с таким email — привязываем yandex_id
  if (email) {
    const { rows: byEmail } = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM users u JOIN roles r ON r.id=u.role_id
       WHERE u.email=$1`,
      [email]
    );
    if (byEmail[0]) {
      await pool.query("UPDATE users SET yandex_id=$1 WHERE id=$2", [yandex_id, byEmail[0].id]);
      return { ...byEmail[0], yandex_id };
    }
  }

  // Создаём нового пользователя без пароля
  const { rows: roleRows } = await pool.query("SELECT id FROM roles WHERE name='USER'");
  const role_id = roleRows[0]?.id;
  const safeUsername = username || `user_ya_${yandex_id}`;
  const safeEmail = email || `ya_${yandex_id}@yandex.ru`;

  const { rows } = await pool.query(
    `INSERT INTO users (username, email, yandex_id, role_id, password_hash)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, username, email, phone, role_id`,
    [safeUsername, safeEmail, yandex_id, role_id, ""]
  );

  const { rows: full } = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM users u JOIN roles r ON r.id=u.role_id
     WHERE u.id=$1`,
    [rows[0].id]
  );
  return full[0];
}

module.exports = { createUser, verifyUser, findOrCreateYandexUser };
