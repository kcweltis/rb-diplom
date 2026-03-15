const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

async function page(req, res) {
    // 1. Берем данные пользователя
    const userResult = await pool.query(
        `SELECT id, username, email, phone, dob, created_at
         FROM users WHERE id=$1`,
        [req.user.id]
    );
    const u = userResult.rows[0];

    // 2. Берем все заказы пользователя (включая детали адреса и оплаты)
    const ordersResult = await pool.query(
        `SELECT o.id, o.status, o.total_price, o.created_at, o.order_type, o.details, o.payment_info, o.comment
         FROM orders o
         WHERE o.user_id=$1
         ORDER BY o.id DESC`,
        [req.user.id]
    );
    const orders = ordersResult.rows;

    // 3. Если заказы есть, достаем их состав (товары и добавки)
    if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);

        // Достаем все товары для всех найденных заказов разом (для скорости)
        const itemsResult = await pool.query(
            `SELECT oi.order_id, oi.quantity, oi.price_at_time, oi.addons, p.name
             FROM order_items oi
             LEFT JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ANY($1::int[])`,
            [orderIds]
        );

        // Группируем товары по заказам
        const itemsByOrder = {};
        itemsResult.rows.forEach(item => {
            if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
            itemsByOrder[item.order_id].push(item);
        });

        // Прикрепляем список товаров к каждому конкретному заказу
        orders.forEach(o => {
            o.items = itemsByOrder[o.id] || [];
        });
    }

    res.render("pages/profile/index", {
        title: "Личный кабинет",
        u,
        orders,
        ok: req.query.ok || null,
        err: req.query.err || null
    });
}

async function updateInfo(req, res) {
    const userId = req.user.id;
    // ДОБАВИЛИ: принимаем email и dob из нашей новой формы
    const { username, email, phone, dob } = req.body;

    // ВАЖНО: COALESCE(dob, $4) означает: "Если в базе уже есть дата рождения, не трогай её. Если нет — запиши новую ($4)".
    await pool.query(
        `UPDATE users
         SET username = $1, email = $2, phone = $3, dob = COALESCE(dob, $4)
         WHERE id = $5`,
        [username, email, phone || null, dob || null, userId]
    );

    // Возвращаемся в профиль с флагом успеха (покажет зеленую плашку "Данные обновлены")
    res.redirect("/profile?ok=profile");
}

async function changePassword(req, res) {
    const userId = req.user.id;
    const { old_password, new_password } = req.body;

    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE id=$1`, [userId]);
    const hash = rows[0]?.password_hash;

    const ok = await bcrypt.compare(old_password, hash);
    if (!ok) {
        // Если пароль неверный, возвращаемся с ошибкой (покажет красную плашку)
        return res.redirect("/profile?err=badpass");
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [newHash, userId]);

    // Возвращаемся с флагом успеха
    res.redirect("/profile?ok=pass");
}

module.exports = { page, updateInfo, changePassword };