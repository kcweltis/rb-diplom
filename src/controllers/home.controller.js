const { pool } = require("../config/db");

async function home(req, res) {
  try {
    // 1. Достаем популярные товары (твой оригинальный код)
    const { rows: featured } = await pool.query(
      `SELECT p.id, p.name, p.price, p.image_url
       FROM featured_products fp
       JOIN products p ON p.id = fp.product_id
       WHERE p.is_active = TRUE
       ORDER BY fp.sort_order ASC, fp.id DESC
       LIMIT 3`
    );

    // 2. НОВЫЙ КОД: Достаем активные баннеры для слайдера
    const { rows: banners } = await pool.query(
      "SELECT image_url FROM banners WHERE is_active = TRUE ORDER BY id DESC"
    );

    // 3. Отдаем всё на страницу
    res.render("pages/home", {
      title: "Русские блины",
      featured,
      banners, // <--- Передаем массив баннеров в шаблон
    });
  } catch (error) {
    console.error("Ошибка при загрузке главной страницы:", error);
    res.status(500).send("Внутренняя ошибка сервера");
  }
}

module.exports = { home };