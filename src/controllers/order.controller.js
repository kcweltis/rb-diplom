const { pool } = require("../config/db");

async function createOrder(req, res) {
    const client = await pool.connect();

    try {
        const userId = req.user ? req.user.id : null;

        const { customer, type, utensils, comment, totalSum, payment, details } = req.body;

        // Переводим русские слова с фронтенда в понятные для БД английские ключи
        const dbOrderType = (type === 'Доставка') ? 'delivery' : 'pickup';
        const cleanTotal = parseFloat(String(totalSum).replace(/[^\d.-]/g, ''));

        await client.query('BEGIN');

        // 1. Создаем сам заказ в таблице orders
        const orderRes = await client.query(
            `INSERT INTO orders 
             (user_id, status, order_type, total_price, customer_name, customer_phone, details, payment_info, comment, utensils)
             VALUES ($1, 'NEW', $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [userId, dbOrderType, cleanTotal, customer.name, customer.phone, details, payment, comment, utensils]
        );
        const orderId = orderRes.rows[0].id;

        // 2. Ищем корзину
        let cartId = null;
        if (userId) {
            const cartRes = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
            if (cartRes.rows.length > 0) cartId = cartRes.rows[0].id;
        } else if (req.session && req.session.cart_id) {
            cartId = req.session.cart_id;
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

        await client.query('COMMIT');

        res.json({ success: true, orderId: orderId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Ошибка при создании заказа:", error);
        res.json({ success: false, message: "Не удалось создать заказ. Попробуйте еще раз." });
    } finally {
        client.release();
    }
}

module.exports = { createOrder };