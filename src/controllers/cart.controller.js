const { pool } = require("../config/db");

// ==========================================
// 1. ПОЛНОЦЕННАЯ СТРАНИЦА КОРЗИНЫ (/cart)
// ==========================================
async function getCartPage(req, res) {
    try {
        let cartQuery = req.user ? "SELECT id FROM carts WHERE user_id = $1" : "SELECT id FROM carts WHERE session_id = $1";
        let cartParam = req.user ? req.user.id : req.sessionID;

        const cartRes = await pool.query(cartQuery, [cartParam]);
        let cart = null;

        if (cartRes.rows.length > 0) {
            const cartId = cartRes.rows[0].id;

            const itemsRes = await pool.query(`
                SELECT ci.id as cart_item_id, ci.product_id, ci.quantity, ci.selected_add_ons, ci.size,
                       p.name, p.price, p.image_url, p.sizes
                FROM cart_items ci
                JOIN products p ON p.id = ci.product_id
                WHERE ci.cart_id = $1
                ORDER BY ci.id ASC
            `, [cartId]);

            const { rows: allAddons } = await pool.query("SELECT id, name, price FROM add_ons");
            const addonMap = {};
            allAddons.forEach(a => addonMap[a.id] = a);

            let total_price = 0;

            const formattedItems = itemsRes.rows.map(item => {
                let itemFinalPrice = parseFloat(item.price);
                let sizeLabel = null; // Новая переменная для красивого размера

                // Умное определение размера: Маленький / Средний / Большой
                if (item.size && item.sizes) {
                    const sizesArray = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes;
                    const matchedSize = sizesArray.find(s => s.name === item.size);
                    if (matchedSize) {
                        itemFinalPrice = parseFloat(matchedSize.price);

                        if (sizesArray.length > 1) {
                            const index = sizesArray.findIndex(s => s.name === item.size);
                            if (index === 0) sizeLabel = "Маленький";
                            else if (index === sizesArray.length - 1) sizeLabel = "Большой";
                        } else {
                            sizeLabel = item.size;
                        }
                    }
                }

                const addonsList = [];
                if (item.selected_add_ons && item.selected_add_ons.length > 0) {
                    item.selected_add_ons.forEach(addonId => {
                        const addon = addonMap[addonId];
                        if (addon) {
                            itemFinalPrice += parseFloat(addon.price);
                            addonsList.push({ name: addon.name, price: parseFloat(addon.price) });
                        }
                    });
                }

                total_price += itemFinalPrice * item.quantity;

                item.final_price = itemFinalPrice;
                item.addonsList = addonsList;
                item.sizeLabel = sizeLabel; // Передаем на фронтенд

                return item;
            });

            cart = { id: cartId, items: formattedItems, total_price: total_price };
        }

        res.render("pages/cart", { title: "Оформление заказа", user: req.user, cart: cart });
    } catch (error) {
        console.error("Ошибка при загрузке корзины:", error);
        res.status(500).send("Внутренняя ошибка сервера");
    }
}

// ==========================================
// 2. ДОБАВЛЕНИЕ В КОРЗИНУ (УМНОЕ И БЕЗОПАСНОЕ)
// ==========================================
async function addToCart(req, res) {
    try {
        // ОБНОВЛЕНО: Принимаем параметр size
        const { product_id, size } = req.body;

        if (!product_id) {
            return res.status(400).json({ success: false, message: "Не указан ID товара" });
        }

        if (!req.user && req.session) req.session.cartIsActive = true;

        const addons = Array.isArray(req.body.addons) ? req.body.addons.map(Number).sort((a, b) => a - b) : [];
        const addonsJson = JSON.stringify(addons);

        let cartId = null;
        let cartQuery = "";
        let cartParam = "";

        if (req.user) {
            cartQuery = "SELECT id FROM carts WHERE user_id = $1";
            cartParam = req.user.id;
        } else if (req.sessionID) {
            cartQuery = "SELECT id FROM carts WHERE session_id = $1";
            cartParam = req.sessionID;
        } else {
            return res.status(400).json({ success: false, message: "Ошибка сессии браузера" });
        }

        let cartRes = await pool.query(cartQuery, [cartParam]);

        if (cartRes.rows.length === 0) {
            if (req.user) {
                cartRes = await pool.query("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", [req.user.id]);
            } else {
                cartRes = await pool.query("INSERT INTO carts (session_id) VALUES ($1) RETURNING id", [req.sessionID]);
            }
        }

        cartId = cartRes.rows[0].id;

        // ОБНОВЛЕНО: Теперь группируем товары в корзине не только по добавкам, но и по размеру (size)
        // COALESCE позволяет сравнивать NULL безопасно
        const itemRes = await pool.query(
            `SELECT id, quantity FROM cart_items 
             WHERE cart_id = $1 
               AND product_id = $2 
               AND COALESCE(selected_add_ons, '[]'::jsonb)::jsonb = $3::jsonb 
               AND COALESCE(size, '') = COALESCE($4, '')`,
            [cartId, product_id, addonsJson, size || null]
        );

        if (itemRes.rows.length > 0) {
            await pool.query(
                "UPDATE cart_items SET quantity = quantity + 1 WHERE id = $1",
                [itemRes.rows[0].id]
            );
        } else {
            // ОБНОВЛЕНО: Сохраняем size при создании новой записи
            await pool.query(
                "INSERT INTO cart_items (cart_id, product_id, quantity, selected_add_ons, size) VALUES ($1, $2, 1, $3::jsonb, $4)",
                [cartId, product_id, addonsJson, size || null]
            );
        }

        res.json({ success: true, message: "Товар успешно добавлен в корзину" });

    } catch (error) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА ПРИ ДОБАВЛЕНИИ В КОРЗИНУ:", error);
        res.status(500).json({ success: false, message: "Внутренняя ошибка сервера. Посмотрите консоль." });
    }
}

// ==========================================
// 3. API ДЛЯ БОКОВОЙ КОРЗИНЫ
// ==========================================
async function getCartApi(req, res) {
    try {
        let cartQuery = req.user ? "SELECT id FROM carts WHERE user_id = $1" : "SELECT id FROM carts WHERE session_id = $1";
        let cartParam = req.user ? req.user.id : req.sessionID;

        const cartRes = await pool.query(cartQuery, [cartParam]);
        if (cartRes.rows.length === 0) return res.json({ success: true, items: [], total: 0 });

        const cartId = cartRes.rows[0].id;

        const itemsRes = await pool.query(`
            SELECT ci.id as cart_item_id, ci.product_id, ci.quantity, ci.selected_add_ons, ci.size,
                   p.name, p.price, p.image_url, p.sizes
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.cart_id = $1
            ORDER BY ci.id ASC
        `, [cartId]);

        const { rows: allAddons } = await pool.query("SELECT id, name, price FROM add_ons");
        const addonMap = {};
        allAddons.forEach(a => addonMap[a.id] = a);

        let totalCartPrice = 0;

        const formattedItems = itemsRes.rows.map(item => {
            let itemFinalPrice = parseFloat(item.price);
            let sizeLabel = null;

            if (item.size && item.sizes) {
                const sizesArray = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes;
                const matchedSize = sizesArray.find(s => s.name === item.size);
                if (matchedSize) {
                    itemFinalPrice = parseFloat(matchedSize.price);

                    if (sizesArray.length > 1) {
                        const index = sizesArray.findIndex(s => s.name === item.size);
                        if (index === 0) sizeLabel = "Маленький";
                        else if (index === sizesArray.length - 1) sizeLabel = "Большой";
                        else sizeLabel = "Средний";
                    } else {
                        sizeLabel = item.size;
                    }
                }
            }

            const addonsList = [];
            if (item.selected_add_ons && item.selected_add_ons.length > 0) {
                item.selected_add_ons.forEach(addonId => {
                    const addon = addonMap[addonId];
                    if (addon) {
                        itemFinalPrice += parseFloat(addon.price);
                        addonsList.push({ name: addon.name, price: parseFloat(addon.price) });
                    }
                });
            }

            totalCartPrice += itemFinalPrice * item.quantity;

            return {
                cart_item_id: item.cart_item_id,
                name: item.name,          // Имя теперь чистое (без 250мл)
                sizeLabel: sizeLabel,     // Отдельно слово "Маленький"
                image_url: item.image_url,
                quantity: item.quantity,
                final_price: itemFinalPrice,
                addons: addonsList
            };
        });

        res.json({ success: true, items: formattedItems, total: totalCartPrice });
    } catch (error) {
        console.error("Ошибка API корзины:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
}

async function updateQuantity(req, res) {
    try {
        const { item_id, action } = req.body;
        const { rows } = await pool.query("SELECT quantity FROM cart_items WHERE id = $1", [item_id]);
        if (rows.length === 0) return res.json({ success: false });

        let qty = rows[0].quantity;
        if (action === 'increase') qty++;
        else if (action === 'decrease') qty--;

        if (qty <= 0) {
            await pool.query("DELETE FROM cart_items WHERE id = $1", [item_id]);
        } else {
            await pool.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [qty, item_id]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Ошибка изменения количества:", error);
        res.status(500).json({ success: false });
    }
}

// ==========================================
// 5. УДАЛЕНИЕ ИЗ КОРЗИНЫ
// ==========================================
async function removeItem(req, res) {
    try {
        await pool.query("DELETE FROM cart_items WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Ошибка удаления:", error);
        res.status(500).json({ success: false });
    }
}

module.exports = {
    getCartPage,
    addToCart,
    getCartApi,
    updateQuantity,
    removeItem
};