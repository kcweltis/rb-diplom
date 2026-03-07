const { pool } = require("../config/db");

async function menuPage(req, res) {
    const q = (req.query.q || "").trim();

    const { rows: categories } = await pool.query(
        `SELECT id, title FROM categories ORDER BY id ASC`
    );

    const params = [];
    let where = `WHERE p.is_active = TRUE`;

    if (q) {
        params.push(`%${q}%`);
        where += ` AND p.name ILIKE $${params.length}`;
    }

    const { rows: products } = await pool.query(
        `SELECT p.id, p.category_id, p.name, p.description, p.price, p.image_url,
            p.weight_g, p.kcal_100g
     FROM products p
     ${where}
     ORDER BY p.category_id ASC, p.name ASC`,
        params
    );

    const byCat = new Map();
    for (const p of products) {
        if (!byCat.has(p.category_id)) byCat.set(p.category_id, []);
        byCat.get(p.category_id).push(p);
    }

    res.render("pages/menu", {
        title: "Наше меню",
        categories,
        byCat,
        q
    });
}

module.exports = { menuPage };