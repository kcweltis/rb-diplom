const { pool } = require("../config/db");

async function page(req, res) {
    const { rows: products } = await pool.query(
        `SELECT id, name, weight_g, kcal_100g
     FROM products
     WHERE is_active = TRUE AND weight_g IS NOT NULL AND kcal_100g IS NOT NULL
     ORDER BY name ASC`
    );

    res.render("pages/calories", { title: "Калькулятор калорий", products });
}

module.exports = { page };