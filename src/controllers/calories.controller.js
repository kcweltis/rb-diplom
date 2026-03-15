const { pool } = require("../config/db");

async function page(req, res) {
    try {
        // 1. Получаем все категории, чтобы вывести их в верхнем меню (слайдере)
        const { rows: categories } = await pool.query(
            "SELECT * FROM categories ORDER BY id ASC"
        );

        // 2. Получаем все активные блюда со всеми новыми параметрами (БЖУ, Калории, Фото)
        const { rows: products } = await pool.query(
            `SELECT id, category_id, name, image_url, weight_g, proteins, fats, carbs, calories 
             FROM products 
             WHERE is_active = TRUE 
             ORDER BY sort_order ASC, id DESC`
        );

        // 3. Отдаем данные в шаблон (название файла у тебя pages/calories)
        res.render("pages/calories", {
            title: "Калькулятор калорий",
            categories,
            products
        });
    } catch (err) {
        console.error("Ошибка при загрузке калькулятора:", err);
        res.status(500).send("Внутренняя ошибка сервера");
    }
}

module.exports = { page };