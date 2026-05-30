const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const { generateOtp, verifyOtp } = require("../services/otp.service");

async function page(req, res) {
  const userResult = await pool.query(
    `SELECT id, username, email, phone, dob, created_at, two_factor_enabled, yandex_id
     FROM users WHERE id=$1`,
    [req.user.id]
  );
  const u = userResult.rows[0];

  const ordersResult = await pool.query(
    `SELECT o.id, o.status, o.total_price, o.created_at, o.order_type, o.details, o.payment_info, o.comment, o.courier_id
     FROM orders o
     WHERE o.user_id=$1
     ORDER BY o.id DESC`,
    [req.user.id]
  );
  const orders = ordersResult.rows;

  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id);
    const itemsResult = await pool.query(
      `SELECT oi.order_id, oi.quantity, oi.price_at_time, oi.addons, p.name
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1::int[])`,
      [orderIds]
    );
    const itemsByOrder = {};
    itemsResult.rows.forEach(item => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });
    orders.forEach(o => { o.items = itemsByOrder[o.id] || []; });
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
  const { username, email, phone, dob } = req.body;
  await pool.query(
    `UPDATE users
     SET username = $1, email = $2, phone = $3, dob = COALESCE(dob, $4)
     WHERE id = $5`,
    [username, email, phone || null, dob || null, userId]
  );
  res.redirect("/profile?ok=profile");
}

async function requestChangePasswordOtp(req, res) {
  const userId = req.user.id;
  try {
    await generateOtp(userId);
    req.session.changePassUserId = userId;
  } catch (e) {
    console.error("OTP send error:", e);
    return res.redirect("/profile?err=otpsend");
  }
  res.redirect("/profile/change-password");
}

function getChangePassword(req, res) {
  if (!req.session.changePassUserId) return res.redirect("/profile");
  res.render("pages/profile/change-password", {
    title: "Смена пароля",
    error: null
  });
}

async function changePassword(req, res) {
  const userId = req.session.changePassUserId;
  if (!userId) return res.redirect("/profile");

  const { code, new_password } = req.body;
  const ok = await verifyOtp(userId, code);
  if (!ok) {
    return res.render("pages/profile/change-password", {
      title: "Смена пароля",
      error: "Неверный или истёкший код подтверждения"
    });
  }

  const newHash = await bcrypt.hash(new_password, 12);
  await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [newHash, userId]);
  delete req.session.changePassUserId;

  res.redirect("/profile?ok=pass");
}

async function toggleTwoFactor(req, res) {
  const userId = req.user.id;
  const { rows } = await pool.query("SELECT two_factor_enabled FROM users WHERE id=$1", [userId]);
  const current = rows[0]?.two_factor_enabled;
  await pool.query("UPDATE users SET two_factor_enabled=$1 WHERE id=$2", [!current, userId]);
  res.redirect("/profile?ok=2fa");
}

// API для получения статуса заказа и информации о курьере (для асинхронного отслеживания)
async function getOrderStatusApi(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    // Проверяем, что заказ принадлежит пользователю
    const orderRes = await pool.query(
      `SELECT o.id, o.status, o.courier_id
       FROM orders o
       WHERE o.id = $1 AND (o.user_id = $2 OR o.user_id IS NULL)`,
      [orderId, userId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Заказ не найден" });
    }

    const order = orderRes.rows[0];
    let courier = null;

    // Если заказ в пути, получаем информацию о курьере
    if (order.courier_id && order.status === 'ON_THE_WAY') {
      const courierRes = await pool.query(
        `SELECT u.username as name, u.phone
         FROM couriers c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = $1`,
        [order.courier_id]
      );
      courier = courierRes.rows[0] || null;
    }

    res.json({
      status: order.status,
      order_type: order.order_type,
      courier: courier
    });
  } catch (e) {
    console.error("Get order status error:", e);
    res.status(500).json({ error: "Ошибка" });
  }
}

module.exports = {
  page,
  updateInfo,
  requestChangePasswordOtp,
  getChangePassword,
  changePassword,
  toggleTwoFactor,
  getOrderStatusApi
};
