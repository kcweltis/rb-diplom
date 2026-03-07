const { pool } = require("../config/db");

async function attachCurrentUser(req, res, next) {
    try {
        if (!req.session.userId) {
            res.locals.user = null;
            return next();
        }

        const { rows } = await pool.query(
            `SELECT u.id, u.username, u.email, u.phone, u.role_id
       FROM users u
       WHERE u.id = $1`,
            [req.session.userId]
        );

        res.locals.user = rows[0] || null;
        return next();
    } catch (e) {
        res.locals.user = null;
        return next();
    }
}

module.exports = { attachCurrentUser };
