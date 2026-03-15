const { pool } = require("../config/db");

async function page(req, res) {
    try {
        const id = Number(req.params.id);

        // ОБНОВЛЕНО: Достаем новые поля БЖУ и Калории вместо старого kcal_100g
        const { rows } = await pool.query(
            `SELECT p.id, p.name, p.description, p.price, p.image_url,
                p.weight_g, p.proteins, p.fats, p.carbs, p.calories, 
                c.title AS category_title, p.category_id
             FROM products p
             JOIN categories c ON c.id = p.category_id
             WHERE p.id = $1 AND p.is_active = TRUE`,
            [id]
        );

        const product = rows[0];
        if (!product) return res.status(404).render("pages/404", { title: "Не найдено" });

        // Похожие товары (из той же категории)
        const { rows: related } = await pool.query(
            `SELECT id, name, image_url, price, calories
             FROM products
             WHERE is_active = TRUE AND category_id = $1 AND id <> $2
             ORDER BY RANDOM()
             LIMIT 6`,
            [product.category_id, product.id]
        );

        // Достаем добавки для этого товара
        const { rows: addons } = await pool.query(
            `SELECT a.id, a.name, a.price 
             FROM add_ons a
             JOIN product_add_ons pa ON a.id = pa.add_on_id
             WHERE pa.product_id = $1`,
            [product.id]
        );

        res.render("pages/product", {
            title: product.name,
            product,
            related,
            addons,
            user: req.user
        });

    } catch (error) {
        console.error("Ошибка при загрузке товара:", error);
        res.status(500).send("Внутренняя ошибка сервера");
    }
}

async function getApiProduct(req, res) {
    try {
        const id = Number(req.params.id);

        // Достаем товар (SELECT * автоматически подтянет новые поля БЖУ)
        const { rows } = await pool.query("SELECT * FROM products WHERE id = $1 AND is_active = TRUE", [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Товар не найден" });
        const product = rows[0];

        // Достаем добавки
        const { rows: addons } = await pool.query(
            `SELECT a.id, a.name, a.price 
             FROM add_ons a
             JOIN product_add_ons pa ON a.id = pa.add_on_id
             WHERE pa.product_id = $1`,
            [id]
        );

        res.json({ success: true, product, addons });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
}

module.exports = { page, getApiProduct };