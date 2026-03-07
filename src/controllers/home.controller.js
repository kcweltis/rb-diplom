const { pool } = require("../config/db");

async function home(req, res) {
  const { rows: featured } = await pool.query(
    `SELECT p.id, p.name, p.price, p.image_url
     FROM featured_products fp
     JOIN products p ON p.id = fp.product_id
     WHERE p.is_active = TRUE
     ORDER BY fp.sort_order ASC, fp.id DESC
     LIMIT 3`
  );

  res.render("pages/home", {
    title: "Русские блины",
    featured,
  });
}

module.exports = { home };
