const { pool } = require("../config/db");

async function menuPage(req, res) {
    const q = (req.query.q || "").trim();

    // 1. Достаем категории, сортируя их по нашему НОВОМУ строгому порядку
    const { rows: categories } = await pool.query(
        `SELECT id, title FROM categories ORDER BY sort_order ASC, id ASC`
    );

    const params = [];
    let where = `WHERE p.is_active = TRUE`;

    if (q) {
        params.push(`%${q}%`);
        where += ` AND p.name ILIKE $${params.length}`;
    }

    // 2. Достаем все активные товары
    const { rows: products } = await pool.query(
        `SELECT p.id, p.category_id, p.name, p.description, p.price, p.image_url,
            p.weight_g, p.kcal_100g
         FROM products p
         ${where}
         ORDER BY p.name ASC`,
        params
    );

    // 3. Группируем товары по их категориям
    const byCat = new Map();
    for (const p of products) {
        if (!byCat.has(p.category_id)) byCat.set(p.category_id, []);
        byCat.get(p.category_id).push(p);
    }

    // 4. КРУТАЯ ФИЧА: Оставляем в меню ТОЛЬКО те категории, в которых есть товары!
    // Если "Детский обед" пока пустой, он даже не появится в боковом меню и не будет путать клиента.
    const activeCategories = categories.filter(c => byCat.has(c.id));

    res.render("pages/menu", {
        title: "Наше меню",
        categories: activeCategories, // Передаем только непустые категории
        byCat,
        q
    });
}

module.exports = { menuPage };