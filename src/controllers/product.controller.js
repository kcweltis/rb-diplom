const { pool } = require("../config/db");

async function page(req, res) {
    const id = Number(req.params.id);

    const { rows } = await pool.query(
        `SELECT p.id, p.name, p.description, p.price, p.image_url,
            p.weight_g, p.kcal_100g, c.title AS category_title, p.category_id
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1 AND p.is_active = TRUE`,
        [id]
    );

    const product = rows[0];
    if (!product) return res.status(404).render("pages/404", { title: "Не найдено" });

    // похожие товары (из той же категории)
    const { rows: related } = await pool.query(
        `SELECT id, name, image_url
     FROM products
     WHERE is_active = TRUE AND category_id = $1 AND id <> $2
     ORDER BY RANDOM()
     LIMIT 6`,
        [product.category_id, product.id]
    );

    const kcalPortion =
        product.weight_g && product.kcal_100g
            ? Math.round((Number(product.weight_g) * Number(product.kcal_100g)) / 100)
            : null;

    res.render("pages/product", {
        title: product.name,
        product,
        kcalPortion,
        related
    });
}

module.exports = { page };