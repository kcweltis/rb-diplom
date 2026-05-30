const { pool } = require("../config/db");

/**
 * КАБИНЕТ КУРЬЕРА - Мобильный интерфейс для доставки заказов
 * Дизайн: Mobile-First, большие кнопки, асинхронные обновления
 */

// ============================================
// 1. ГЛАВНАЯ ПАНЕЛЬ КУРЬЕРА
// ============================================

async function dashboard(req, res) {
    try {
        const courierId = req.user.id;

        // Получаем информацию о курьере
        const courierRes = await pool.query(
            `SELECT c.id, c.vehicle_type, c.is_on_shift, u.username, u.phone
       FROM couriers c
       JOIN users u ON u.id = c.user_id
       WHERE c.user_id = $1`,
            [courierId]
        );

        if (courierRes.rows.length === 0) {
            return res.status(403).render("pages/403", {
                title: "Ошибка",
                message: "Вы не зарегистрированы как курьер"
            });
        }

        const courier = courierRes.rows[0];

        // Получаем активный заказ курьера (если есть)
        const activeOrderRes = await pool.query(
            `SELECT o.id, o.customer_name, o.customer_phone, o.total_price, o.delivery_fee,
              o.status, o.comment, o.payment_info, o.details,
              (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as items_count
       FROM orders o
       WHERE o.courier_id = $1 AND o.status IN ('ASSIGNED', 'ON_THE_WAY')
       ORDER BY o.created_at DESC
       LIMIT 1`,
            [courier.id]
        );

        const activeOrder = activeOrderRes.rows[0] || null;

        // Получаем статистику за сегодня
        const statsRes = await pool.query(
            `SELECT 
        COUNT(*) FILTER (WHERE status = 'DELIVERED' AND DATE(delivered_at) = CURRENT_DATE) as delivered_today,
        COUNT(*) FILTER (WHERE status = 'DELIVERED' AND DATE(delivered_at) = CURRENT_DATE) as trips_count,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' AND DATE(delivered_at) = CURRENT_DATE THEN delivery_fee ELSE 0 END), 0) as earned_today
       FROM orders
       WHERE courier_id = $1`,
            [courier.id]
        );

        const stats = statsRes.rows[0] || { delivered_today: 0, trips_count: 0, earned_today: 0 };

        res.render("pages/courier/dashboard", {
            title: "Кабинет курьера",
            courier,
            activeOrder,
            stats,
            user: req.user
        });
    } catch (e) {
        console.error("Courier dashboard error:", e);
        res.status(500).send("Ошибка при загрузке кабинета курьера");
    }
}

// ============================================
// 2. СПИСОК ДОСТУПНЫХ ЗАКАЗОВ (ВКЛАДКА "СВОБОДНЫЕ")
// ============================================

async function getAvailableOrders(req, res) {
    try {
        const courierId = req.user.id;

        // Проверяем, включен ли курьер
        const courierRes = await pool.query(
            `SELECT is_on_shift FROM couriers WHERE user_id = $1`,
            [courierId]
        );

        if (courierRes.rows.length === 0 || !courierRes.rows[0].is_on_shift) {
            return res.status(403).json({
                error: "Вы не на смене. Включите статус 'На смене'"
            });
        }

        // Получаем заказы, готовые к доставке (не назначенные ещё)
        const ordersRes = await pool.query(
            `SELECT o.id, o.customer_name, o.customer_phone, o.total_price,
              o.comment, o.payment_info, o.order_type, o.details, o.delivery_fee,
              (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as items_count,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as order_lines
       FROM orders o
       WHERE o.status = 'READY' AND o.courier_id IS NULL AND o.order_type = 'delivery'
       ORDER BY o.created_at ASC`,
            []
        );

        res.json({
            orders: ordersRes.rows,
            count: ordersRes.rows.length
        });
    } catch (e) {
        console.error("Get available orders error:", e);
        res.status(500).json({ error: "Ошибка при загрузке заказов" });
    }
}

// ============================================
// 3. ВКЛАДКА "МОЙ ЗАКАЗ"
// ============================================

async function getActiveOrder(req, res) {
    try {
        const courierId = req.user.id;

        const orderRes = await pool.query(
            `SELECT o.id, o.customer_name, o.customer_phone, o.total_price, o.delivery_fee,
              o.status, o.comment, o.payment_info, o.order_type, o.details,
              o.picked_up_at, o.created_at,
              (SELECT array_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price_at_time))
               FROM order_items oi
               JOIN products p ON p.id = oi.product_id
               WHERE oi.order_id = o.id) as items
       FROM orders o
       WHERE o.courier_id = $1 AND o.status IN ('ASSIGNED', 'ON_THE_WAY')
       ORDER BY o.created_at DESC
       LIMIT 1`,
            [courierId]
        );

        if (orderRes.rows.length === 0) {
            return res.json({ order: null });
        }

        res.json({ order: orderRes.rows[0] });
    } catch (e) {
        console.error("Get active order error:", e);
        res.status(500).json({ error: "Ошибка" });
    }
}

// ============================================
// 4. ВЗЯТЬ ЗАКАЗ (ACCEPT ORDER)
// ============================================

async function acceptOrder(req, res) {
    const client = await pool.connect();

    try {
        const { orderId } = req.body;
        const courierId = req.user.id;

        // Получаем ID курьера
        const courierRes = await pool.query(
            `SELECT id FROM couriers WHERE user_id = $1`,
            [courierId]
        );

        if (courierRes.rows.length === 0) {
            return res.status(403).json({ error: "Вы не курьер" });
        }

        const courier = courierRes.rows[0];

        await client.query('BEGIN');

        // Проверяем, что заказ свободен и готов
        const orderRes = await client.query(
            `SELECT id, status FROM orders WHERE id = $1 AND courier_id IS NULL AND status = 'READY' FOR UPDATE`,
            [orderId]
        );

        if (orderRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Заказ уже взят другим курьером или не готов" });
        }

        // Назначаем заказ курьеру
        await client.query(
            `UPDATE orders 
       SET courier_id = $1, status = 'ASSIGNED'
       WHERE id = $2`,
            [courier.id, orderId]
        );

        await client.query('COMMIT');

        res.json({ success: true, message: "Заказ принят" });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Accept order error:", e);
        res.status(500).json({ error: "Ошибка при принятии заказа" });
    } finally {
        client.release();
    }
}

// ============================================
// 5. НАЧАТЬ ДОСТАВКУ (START DELIVERY)
// ============================================

async function startDelivery(req, res) {
    try {
        const { orderId } = req.body;

        await pool.query(
            `UPDATE orders 
       SET status = 'ON_THE_WAY', picked_up_at = now()
       WHERE id = $1`,
            [orderId]
        );

        res.json({ success: true, message: "Доставка начата" });
    } catch (e) {
        console.error("Start delivery error:", e);
        res.status(500).json({ error: "Ошибка при начале доставки" });
    }
}

// ============================================
// 6. ОТМЕТИТЬ КАК ДОСТАВЛЕНО (MARK DELIVERED)
// ============================================

async function markDelivered(req, res) {
    try {
        const { orderId } = req.body;

        await pool.query(
            `UPDATE orders 
       SET status = 'DELIVERED', delivered_at = now()
       WHERE id = $1`,
            [orderId]
        );

        res.json({ success: true, message: "Заказ доставлен" });
    } catch (e) {
        console.error("Mark delivered error:", e);
        res.status(500).json({ error: "Ошибка при отметке доставки" });
    }
}

// ============================================
// 7. ВКЛЮЧИТЬ/ОТКЛЮЧИТЬ "НА СМЕНЕ"
// ============================================

async function toggleOnShift(req, res) {
    try {
        const courierId = req.user.id;

        const result = await pool.query(
            `UPDATE couriers 
       SET is_on_shift = NOT is_on_shift
       WHERE user_id = $1
       RETURNING is_on_shift`,
            [courierId]
        );

        const newStatus = result.rows[0].is_on_shift;

        res.json({
            success: true,
            is_on_shift: newStatus,
            message: newStatus ? "Вы на смене" : "Вы ушли домой"
        });
    } catch (e) {
        console.error("Toggle on shift error:", e);
        res.status(500).json({ error: "Ошибка при изменении статуса" });
    }
}

// ============================================
// 8. ПРОФИЛЬ КУРЬЕРА
// ============================================

async function courierProfile(req, res) {
    try {
        const courierId = req.user.id;

        const courierRes = await pool.query(
            `SELECT c.id, c.vehicle_type, c.is_on_shift, u.username, u.phone, u.email, u.created_at
       FROM couriers c
       JOIN users u ON u.id = c.user_id
       WHERE c.user_id = $1`,
            [courierId]
        );

        if (courierRes.rows.length === 0) {
            return res.status(403).send("Не найдено");
        }

        const courier = courierRes.rows[0];

        // Общая статистика
        const statsRes = await pool.query(
            `SELECT 
        COUNT(*) FILTER (WHERE status = 'DELIVERED') as total_delivered,
        AVG(cr.rating) as avg_rating,
        COUNT(*) FILTER (WHERE status = 'DELIVERED' AND DATE(delivered_at) = CURRENT_DATE) as today_delivered,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' AND DATE(delivered_at) = CURRENT_DATE THEN delivery_fee ELSE 0 END), 0) as today_earned
       FROM orders o
       LEFT JOIN courier_ratings cr ON o.id = cr.order_id
       WHERE o.courier_id = $1`,
            [courier.id]
        );

        const stats = statsRes.rows[0];

        res.render("pages/courier/profile", {
            title: "Профиль курьера",
            courier,
            stats,
            user: req.user
        });
    } catch (e) {
        console.error("Courier profile error:", e);
        res.status(500).send("Ошибка");
    }
}

// ============================================
// 9. ИСТОРИЯ ДОСТАВОК
// ============================================

async function deliveryHistory(req, res) {
    try {
        const courierId = req.user.id;

        const courierRes = await pool.query(
            `SELECT id FROM couriers WHERE user_id = $1`,
            [courierId]
        );

        const courier = courierRes.rows[0];

        const ordersRes = await pool.query(
            `SELECT o.id, o.customer_name, o.customer_phone, o.total_price, o.delivery_fee, o.details,
              o.delivered_at, o.created_at, o.payment_info,
              cr.rating, cr.comment
       FROM orders o
       LEFT JOIN courier_ratings cr ON o.id = cr.order_id
       WHERE o.courier_id = $1 AND o.status = 'DELIVERED'
       ORDER BY o.delivered_at DESC
       LIMIT 50`,
            [courier.id]
        );

        res.render("pages/courier/history", {
            title: "История доставок",
            orders: ordersRes.rows,
            user: req.user
        });
    } catch (e) {
        console.error("Delivery history error:", e);
        res.status(500).send("Ошибка");
    }
}

// ============================================
// 10. СОХРАНИТЬ МЕСТОПОЛОЖЕНИЕ КУРЬЕРА (GPS)
// ============================================

async function updateLocation(req, res) {
    try {
        const { latitude, longitude } = req.body;
        const courierId = req.user.id;

        const courierRes = await pool.query(
            `SELECT id FROM couriers WHERE user_id = $1`,
            [courierId]
        );

        if (courierRes.rows.length === 0) {
            return res.status(403).json({ error: "Не курьер" });
        }

        const courier = courierRes.rows[0];

        await pool.query(
            `INSERT INTO courier_locations (courier_id, latitude, longitude, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (courier_id) DO UPDATE 
       SET latitude = $2, longitude = $3, updated_at = now()
       WHERE courier_locations.courier_id = $1`,
            [courier.id, latitude, longitude]
        );

        res.json({ success: true });
    } catch (e) {
        console.error("Update location error:", e);
        res.status(500).json({ error: "Ошибка" });
    }
}

// ============================================
// 11. ПОЛУЧИТЬ ИНФОРМАЦИЮ ДЛЯ КЛИЕНТА (КОМУ ДОСТАВЛЯЕТ КУРЬЕР)
// ============================================

async function getOrderCourierInfo(req, res) {
    try {
        const { orderId } = req.params;

        const orderRes = await pool.query(
            `SELECT c.id, u.username as courier_name, u.phone as courier_phone
       FROM orders o
       JOIN couriers c ON o.courier_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE o.id = $1 AND o.status = 'ON_THE_WAY'`,
            [orderId]
        );

        if (orderRes.rows.length === 0) {
            return res.json({ courier: null });
        }

        res.json({ courier: orderRes.rows[0] });
    } catch (e) {
        console.error("Get courier info error:", e);
        res.status(500).json({ error: "Ошибка" });
    }
}

module.exports = {
    dashboard,
    getAvailableOrders,
    getActiveOrder,
    acceptOrder,
    startDelivery,
    markDelivered,
    toggleOnShift,
    courierProfile,
    deliveryHistory,
    updateLocation,
    getOrderCourierInfo
};
