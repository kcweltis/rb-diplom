const { createUser, verifyUser } = require("../services/user.service");

function getLogin(req, res) { res.render("pages/login", { title: "Вход", error: null }); }

async function postLogin(req, res) {
  const { email, password } = req.body;
  const user = await verifyUser(email, password);
  if (!user) return res.status(401).render("pages/login", { title: "Вход", error: "Неверные данные" });

  req.session.userId = user.id;

  if (user.role_id === 1) return res.redirect("/admin");
  else if (user.role_id === 2) return res.redirect("/panel");
  else return res.redirect("/profile");
}

function getRegister(req, res) { res.render("pages/register", { title: "Регистрация", error: null }); }

async function postRegister(req, res) {
  const { username, email, phone, password } = req.body;
  try {
    const u = await createUser({ username, email, phone, password });
    req.session.userId = u.id;
    res.redirect("/");
  } catch (e) {
    res.status(400).render("pages/register", { title: "Регистрация", error: "Ошибка регистрации" });
  }
}

function logout(req, res) { req.session.destroy(() => res.redirect("/")); }

module.exports = { getLogin, postLogin, getRegister, postRegister, logout };