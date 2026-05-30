const { pool } = require("../config/db");
const yookassa = require("../services/yookassa.service");

function getBaseUrl(req) {
    return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function getPaymentStatus(payment) {
    if (payment.status === "succeeded" && payment.paid) return "READY";
    if (payment.status === "canceled") return "FAILED";
    return "PENDING_PAYMENT";
}

function getPaymentInfo(payment, eventName) {
    return {
        yookassa: {
            id: payment.id,
            status: payment.status,
            paid: Boolean(payment.paid),
            amount: payment.amount,
            cancellationDetails: payment.cancellation_details || null,
            event: eventName || null,
            updatedAt: new Date().toISOString(),
        },
    };
}

async function updateOrderPayment(orderId, payment, eventName) {
    const status = getPaymentStatus(payment);
    await pool.query(
        `UPDATE orders
         SET status = $1,
             payment_info = COALESCE(payment_info, '{}'::jsonb) || $2::jsonb
         WHERE id = $3`,
        [
            status,
            JSON.stringify(getPaymentInfo(payment, eventName)),
            orderId,
        ]
    );
}

async function createOrder(req, res) {
    const client = await pool.connect();

    try {
        const userId = req.user ? req.user.id : null;

        const { customer, type, utensils, comment, totalSum, payment, details } = req.body;

        // Переводим русские слова с фронтенда в понятные для БД английские ключи
        const dbOrderType = (type === 'Доставка') ? 'delivery' : 'pickup';
        const cleanTotal = parseFloat(String(totalSum).replace(/[^\d.-]/g, ''));
        
        // Расчет доставки: 10% от суммы, но не менее 150 и не более 500 рублей
        let deliveryFee = 0;
        if (dbOrderType === 'delivery') {
            deliveryFee = Math.max(150, Math.min(500, Math.ceil(cleanTotal * 0.1)));
        }

        await client.query('BEGIN');

        // 1. Создаем сам заказ в таблице orders
        // Статус зависит от метода оплаты: наличные → READY, онлайн → PENDING_PAYMENT
        const initialStatus = (payment && payment.method === "online") ? 'PENDING_PAYMENT' : 'READY';
        const orderRes = await client.query(
            `INSERT INTO orders 
             (user_id, status, order_type, total_price, delivery_fee, customer_name, customer_phone, details, payment_info, comment, utensils)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [userId, initialStatus, dbOrderType, cleanTotal, deliveryFee, customer.name, customer.phone, details, payment, comment, utensils]
        );
        const orderId = orderRes.rows[0].id;

        // 2. Ищем корзину
        let cartId = null;
        if (userId) {
            const cartRes = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
            if (cartRes.rows.length > 0) cartId = cartRes.rows[0].id;
        } else if (req.session && req.session.cart_id) {
            cartId = req.session.cart_id;
        } else if (req.sessionID) {
            const cartRes = await client.query('SELECT id FROM carts WHERE session_id = $1', [req.sessionID]);
            if (cartRes.rows.length > 0) cartId = cartRes.rows[0].id;
        }

        if (cartId) {
            // 3. Достаем товары и их добавки ИЗ КОЛОНКИ selected_add_ons (как в cart.controller.js)
            const { rows: cartItems } = await client.query(
                `SELECT ci.id as cart_item_id, ci.product_id, ci.quantity, ci.selected_add_ons, p.price 
                 FROM cart_items ci 
                 JOIN products p ON p.id = ci.product_id 
                 WHERE ci.cart_id = $1`, [cartId]
            );

            // Вытаскиваем все добавки разом, чтобы сопоставить их ID с ценами
            const { rows: allAddons } = await client.query("SELECT id, name, price FROM add_ons");
            const addonMap = {};
            allAddons.forEach(a => addonMap[a.id] = a);

            for (let item of cartItems) {
                let itemFinalPrice = parseFloat(item.price);
                const addonsList = [];

                // Если у товара в корзине есть добавки, считаем их цену
                if (item.selected_add_ons && item.selected_add_ons.length > 0) {
                    item.selected_add_ons.forEach(addonId => {
                        const addon = addonMap[addonId];
                        if (addon) {
                            itemFinalPrice += parseFloat(addon.price);
                            // Сохраняем имя и цену добавки для истории заказа
                            addonsList.push({ name: addon.name, price: parseFloat(addon.price) });
                        }
                    });
                }

                // 4. Переносим товар в историю заказа (используем price_at_time из твоего init.sql)
                await client.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, price_at_time, addons) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [orderId, item.product_id, item.quantity, itemFinalPrice, JSON.stringify(addonsList)]
                );
            }

            // 5. ОЧИЩАЕМ КОРЗИНУ
            await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
        }

        let confirmationUrl = null;

        if (payment && payment.method === "online") {
            const returnUrl = `${getBaseUrl(req)}/payment/return?orderId=${orderId}`;
            const yooPayment = await yookassa.createPayment({
                orderId,
                amount: cleanTotal,
                returnUrl,
                customer,
            });

            confirmationUrl = yooPayment.confirmation?.confirmation_url || null;

            await client.query(
                `UPDATE orders
                 SET payment_info = COALESCE(payment_info, '{}'::jsonb) || $1::jsonb
                 WHERE id = $2`,
                [
                    JSON.stringify({
                        yookassa: {
                            id: yooPayment.id,
                            status: yooPayment.status,
                            paid: Boolean(yooPayment.paid),
                            confirmationUrl,
                            amount: yooPayment.amount,
                            createdAt: new Date().toISOString(),
                        },
                    }),
                    orderId,
                ]
            );
        }

        await client.query('COMMIT');

        res.json({ success: true, orderId: orderId, confirmationUrl });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Ошибка при создании заказа:", error);
        const isYooKassaConfigError = error.message.includes("YOOKASSA_");
        res.json({
            success: false,
            message: isYooKassaConfigError
                ? "Онлайн-оплата временно не настроена. Проверьте тестовые ключи ЮKassa."
                : "Не удалось создать заказ. Попробуйте еще раз."
        });
    } finally {
        client.release();
    }
}

async function paymentReturn(req, res) {
    const orderId = Number(req.query.orderId);

    if (!orderId) {
        return res.status(400).render("pages/payment-result", {
            title: "Оплата заказа",
            status: "error",
            orderId: null,
        });
    }

    try {
        const { rows } = await pool.query(
            "SELECT payment_info FROM orders WHERE id = $1",
            [orderId]
        );

        const paymentId = rows[0]?.payment_info?.yookassa?.id;
        if (!paymentId) {
            throw new Error("Payment id not found");
        }

        const payment = await yookassa.getPayment(paymentId);
        await updateOrderPayment(orderId, payment);

        res.render("pages/payment-result", {
            title: "Оплата заказа",
            status: payment.status === "succeeded" && payment.paid ? "success" : payment.status,
            orderId,
        });
    } catch (error) {
        console.error("Ошибка проверки платежа ЮKassa:", error);
        res.status(500).render("pages/payment-result", {
            title: "Оплата заказа",
            status: "error",
            orderId,
        });
    }
}

async function yookassaWebhook(req, res) {
    try {
        if (process.env.YOOKASSA_WEBHOOK_TOKEN && req.query.token !== process.env.YOOKASSA_WEBHOOK_TOKEN) {
            return res.sendStatus(403);
        }

        const event = req.body;
        const eventName = event.event;
        const paymentFromNotification = event.object;

        if (
            event.type !== "notification" ||
            !["payment.succeeded", "payment.canceled", "payment.waiting_for_capture"].includes(eventName) ||
            !paymentFromNotification?.id
        ) {
            return res.sendStatus(200);
        }

        const payment = await yookassa.getPayment(paymentFromNotification.id);
        let orderId = Number(payment.metadata?.orderId);

        if (!orderId) {
            const { rows } = await pool.query(
                "SELECT id FROM orders WHERE payment_info->'yookassa'->>'id' = $1 LIMIT 1",
                [payment.id]
            );
            orderId = Number(rows[0]?.id);
        }

        if (!orderId) {
            console.warn("ЮKassa webhook without linked order:", payment.id);
            return res.sendStatus(200);
        }

        await updateOrderPayment(orderId, payment, eventName);
        res.sendStatus(200);
    } catch (error) {
        console.error("Ошибка webhook ЮKassa:", error);
        res.sendStatus(500);
    }
}

module.exports = { createOrder, paymentReturn, yookassaWebhook };
