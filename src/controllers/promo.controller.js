const { pool } = require("../config/db");

async function getPromotionsPage(req, res) {
    try {
        // Достаем активные новинки
        const { rows: news } = await pool.query(
            "SELECT * FROM news WHERE is_active = TRUE ORDER BY sort_order ASC, id DESC"
        );

        // Достаем активные акции
        const { rows: promotions } = await pool.query(
            "SELECT * FROM promotions WHERE is_active = TRUE ORDER BY sort_order ASC, id DESC"
        );

        res.render("pages/promotions", {
            title: "Акции и Новинки",
            news,
            promotions,
            user: req.user
        });
    } catch (error) {
        console.error("Ошибка при загрузке акций:", error);
        res.status(500).send("Внутренняя ошибка сервера");
    }
}

module.exports = { getPromotionsPage };