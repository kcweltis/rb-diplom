const https = require("https");
const { createUser, verifyUser, findOrCreateYandexUser } = require("../services/user.service");
const { generateOtp, verifyOtp } = require("../services/otp.service");

function getLogin(req, res) {
  res.render("pages/login", { title: "Вход", error: null });
}

async function postLogin(req, res) {
  const { identifier, password } = req.body;
  const user = await verifyUser(identifier, password);
  if (!user) {
    return res.status(401).render("pages/login", { title: "Вход", error: "Неверные данные" });
  }

  if (user.two_factor_enabled) {
    // Сохраняем userId во временной сессии и отправляем OTP
    req.session.pendingUserId = user.id;
    try { await generateOtp(user.id); } catch (e) { console.error("OTP send error:", e); }
    return res.redirect("/verify-otp");
  }

  req.session.userId = user.id;
  delete req.session.pendingUserId;

  if (user.role_id === 1) return res.redirect("/admin");
  if (user.role_id === 2) return res.redirect("/panel");
  if (user.role_id === 3) return res.redirect("/courier/dashboard");
  return res.redirect("/profile");
}

function getRegister(req, res) {
  // Вместо рендеринга старой страницы редиректим на объединенную форму
  res.redirect("/login?mode=register");
}

async function postRegister(req, res) {
  const { username, email, phone, password } = req.body;
  try {
    const u = await createUser({ username, email, phone, password });
    req.session.userId = u.id;
    res.redirect("/");
  } catch (e) {
    res.status(400).render("pages/login", { title: "Регистрация", error: "Ошибка регистрации" });
  }
}

function logout(req, res) {
  req.session.destroy(() => res.redirect("/"));
}

// ==========================================
// 2FA: ПОДТВЕРЖДЕНИЕ OTP ПРИ ВХОДЕ
// ==========================================
function getVerifyOtp(req, res) {
  if (!req.session.pendingUserId) return res.redirect("/login");
  res.render("pages/verify-otp", { title: "Подтверждение входа", error: null });
}

async function postVerifyOtp(req, res) {
  const userId = req.session.pendingUserId;
  if (!userId) return res.redirect("/login");

  const { code } = req.body;
  const ok = await verifyOtp(userId, code);
  if (!ok) {
    return res.render("pages/verify-otp", { title: "Подтверждение входа", error: "Неверный или истёкший код" });
  }

  req.session.userId = userId;
  delete req.session.pendingUserId;

  const { pool } = require("../config/db");
  const { rows } = await pool.query("SELECT role_id FROM users WHERE id=$1", [userId]);
  const role_id = rows[0]?.role_id;

  if (role_id === 1) return res.redirect("/admin");
  if (role_id === 2) return res.redirect("/panel");
  if (role_id === 3) return res.redirect("/courier/dashboard");
  return res.redirect("/profile");
}

// ==========================================
// ВОССТАНОВЛЕНИЕ ПАРОЛЯ (2FA по email)
// ==========================================
function getForgotPassword(req, res) {
  res.render("pages/forgot-password", { title: "Восстановление пароля", error: null, sent: false });
}

async function postForgotPassword(req, res) {
  const { identifier } = req.body;
  const { pool } = require("../config/db");
  const { rows } = await pool.query(
    "SELECT id, email FROM users WHERE email=$1 OR phone=$1",
    [identifier]
  );
  const user = rows[0];

  if (user) {
    try { await generateOtp(user.id); } catch (e) { console.error("OTP send error:", e); }
    req.session.resetUserId = user.id;
  }

  // Всегда показываем «письмо отправлено», чтобы не раскрывать наличие аккаунта
  res.render("pages/forgot-password", { title: "Восстановление пароля", error: null, sent: true });
}

function getResetPassword(req, res) {
  if (!req.session.resetUserId) return res.redirect("/forgot-password");
  res.render("pages/reset-password", { title: "Новый пароль", error: null });
}

async function postResetPassword(req, res) {
  const userId = req.session.resetUserId;
  if (!userId) return res.redirect("/forgot-password");

  const { code, new_password } = req.body;
  const ok = await verifyOtp(userId, code);
  if (!ok) {
    return res.render("pages/reset-password", { title: "Новый пароль", error: "Неверный или истёкший код" });
  }

  const bcrypt = require("bcrypt");
  const hash = await bcrypt.hash(new_password, 12);
  const { pool } = require("../config/db");
  await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, userId]);
  delete req.session.resetUserId;

  res.redirect("/login?ok=reset");
}

// ==========================================
// ЯНДЕКС OAUTH
// ==========================================
function getYandexAuth(req, res) {
  const clientId = process.env.YANDEX_CLIENT_ID;
  const callbackUrl = encodeURIComponent(process.env.YANDEX_CALLBACK_URL || "http://localhost:3000/auth/yandex/callback");
  res.redirect(`https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${callbackUrl}`);
}

async function getYandexCallback(req, res) {
  const { code } = req.query;
  if (!code) return res.redirect("/login");

  try {
    const tokenData = await yandexExchangeCode(code);
    const profile = await yandexGetProfile(tokenData.access_token);

    const user = await findOrCreateYandexUser({
      yandex_id: String(profile.id),
      email: profile.default_email || null,
      username: profile.real_name || profile.login || null
    });

    req.session.userId = user.id;
    if (user.role_id === 1) return res.redirect("/admin");
    if (user.role_id === 2) return res.redirect("/panel");
    return res.redirect("/profile");
  } catch (e) {
    console.error("Яндекс OAuth ошибка:", e);
    res.redirect("/login");
  }
}

function yandexExchangeCode(code) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.YANDEX_CLIENT_ID,
      client_secret: process.env.YANDEX_CLIENT_SECRET
    }).toString();

    const options = {
      hostname: "oauth.yandex.ru",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(params)
      }
    };

    const req = https.request(options, (resp) => {
      let data = "";
      resp.on("data", chunk => { data += chunk; });
      resp.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(params);
    req.end();
  });
}

function yandexGetProfile(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "login.yandex.ru",
      path: "/info?format=json",
      method: "GET",
      headers: { Authorization: `OAuth ${accessToken}` }
    };

    const req = https.request(options, (resp) => {
      let data = "";
      resp.on("data", chunk => { data += chunk; });
      resp.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

module.exports = {
  getLogin, postLogin,
  getRegister, postRegister,
  logout,
  getVerifyOtp, postVerifyOtp,
  getForgotPassword, postForgotPassword,
  getResetPassword, postResetPassword,
  getYandexAuth, getYandexCallback
};
