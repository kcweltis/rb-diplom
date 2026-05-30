const nodemailer = require("nodemailer");
const { pool } = require("../config/db");

const transporter = nodemailer.createTransport({
  host: "smtp.yandex.ru",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { rejectUnauthorized: false },
  family: 4
});

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Генерирует OTP, сохраняет в БД, отправляет на email пользователя
async function generateOtp(userId) {
  const code = makeCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

  await pool.query(
    "UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE id=$3",
    [code, expiresAt, userId]
  );

  const { rows } = await pool.query("SELECT email, username FROM users WHERE id=$1", [userId]);
  const user = rows[0];
  if (!user) return;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: user.email,
    subject: "Код подтверждения",
    html: `
      <h2 style="color:#E30613;">Код подтверждения</h2>
      <p>Здравствуйте, <b>${user.username}</b>!</p>
      <p>Ваш одноразовый код:</p>
      <h1 style="letter-spacing:8px; font-size:40px; color:#222;">${code}</h1>
      <p style="color:#888; font-size:13px;">Код действителен 10 минут. Не сообщайте его никому.</p>
    `
  });
}

// Проверяет код: возвращает true если верный и не истёк, иначе false
async function verifyOtp(userId, code) {
  const { rows } = await pool.query(
    "SELECT otp_code, otp_expires_at FROM users WHERE id=$1",
    [userId]
  );
  const user = rows[0];
  if (!user || !user.otp_code) return false;
  if (user.otp_code !== String(code).trim()) return false;
  if (new Date() > new Date(user.otp_expires_at)) return false;

  await pool.query("UPDATE users SET otp_code=NULL, otp_expires_at=NULL WHERE id=$1", [userId]);
  return true;
}

module.exports = { generateOtp, verifyOtp };
