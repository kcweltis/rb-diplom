const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

async function page(req, res) {
    const userResult = await pool.query(
        `SELECT id, username, email, phone, created_at
     FROM users WHERE id=$1`,
        [req.user.id]
    );

    const u = userResult.rows[0];

    const ordersResult = await pool.query(
        `SELECT o.id, o.status, o.total_price, o.created_at, o.order_type
     FROM orders o
     WHERE o.user_id=$1
     ORDER BY o.id DESC`,
        [req.user.id]
    );

    res.render("pages/profile/index", {
        title: "Личный кабинет",
        u,
        orders: ordersResult.rows,
        ok: req.query.ok || null,
        err: req.query.err || null
    });
}


async function updateInfo(req, res) {
    const userId = req.user.id;
    const { username, phone } = req.body;

    await pool.query(
        `UPDATE users
     SET username = $1, phone = $2
     WHERE id = $3`,
        [username, phone || null, userId]
    );

    res.redirect("/profile");
}

async function changePassword(req, res) {
    const userId = req.user.id;
    const { old_password, new_password } = req.body;

    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE id=$1`, [userId]);
    const hash = rows[0]?.password_hash;

    const ok = await bcrypt.compare(old_password, hash);
    if (!ok) {
        return res.status(400).render("pages/profile", {
            title: "Личный кабинет",
            orders: [],
            error: "Старый пароль неверный"
        });
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [newHash, userId]);

    res.redirect("/profile");
}

module.exports = { page, updateInfo, changePassword };
