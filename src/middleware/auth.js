const { pool } = require("../config/db");

async function loadUser(req, res, next) {
  res.locals.user = null;
  try {
    if (req.session && req.session.userId) {
      const { rows } = await pool.query(
        `SELECT u.id, u.username, u.email, u.phone, u.role_id, r.name AS role_name, u.is_active
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
        [req.session.userId]
      );
      if (rows[0] && rows[0].is_active) {
        req.user = rows[0];
        res.locals.user = rows[0];
      } else {
        req.user = null;
        req.session.destroy(() => {});
      }
    }
  } catch (e) {
    // do not break page on auth failures
    req.user = null;
    res.locals.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).render("pages/403", { title: "403" });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).render("pages/403", { title: "403" });
    if (!roles.includes(req.user.role_name)) {
      return res.status(403).render("pages/403", { title: "403" });
    }
    next();
  };
}

module.exports = { loadUser, requireAuth, requireRole };
