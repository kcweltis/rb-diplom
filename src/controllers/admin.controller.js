const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

const getCrumbs = (name) => [{ name }];

async function dashboard(req, res) {
  try {
    const [{ rows: u }, { rows: o }, { rows: p }] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS cnt FROM users"),
      pool.query("SELECT COUNT(*)::int AS cnt FROM orders"),
      pool.query("SELECT COUNT(*)::int AS cnt FROM products"),
    ]);
    res.render("pages/admin/dashboard", {
      title: "Админ-панель",
      stats: { users: u[0].cnt, orders: o[0].cnt, products: p[0].cnt },
      breadcrumbs: []
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка сервера");
  }
}

async function categoriesPage(req, res) {
  const { rows } = await pool.query("SELECT * FROM categories ORDER BY title ASC");
  res.render("pages/admin/categories", {
    title: "Категории", categories: rows, breadcrumbs: getCrumbs("Категории")
  });
}

async function createCategory(req, res) {
  const { title } = req.body;
  await pool.query("INSERT INTO categories (title) VALUES ($1) ON CONFLICT DO NOTHING", [title]);
  res.redirect("/admin/categories");
}

async function deleteCategory(req, res) {
  try {
    await pool.query("DELETE FROM categories WHERE id=$1", [req.params.id]);
    res.redirect("/admin/categories");
  } catch (error) {
    if (error.code === '23503') {
      res.send(`<script>alert('Отмена: Нельзя удалить категорию, в которой есть товары!'); window.location.href = '/admin/categories';</script>`);
    } else {
      res.status(500).send("Внутренняя ошибка сервера");
    }
  }
}

async function productsPage(req, res) {
  const { rows: products } = await pool.query(
    `SELECT p.*, c.title AS category_title, COALESCE((SELECT json_agg(add_on_id) FROM product_add_ons WHERE product_id = p.id), '[]'::json) as addon_ids
     FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.sort_order ASC, p.id DESC`
  );
  const { rows: categories } = await pool.query("SELECT * FROM categories ORDER BY title ASC");
  const { rows: addons } = await pool.query("SELECT * FROM add_ons ORDER BY name ASC");

  res.render("pages/admin/products", { title: "Товары", products, categories, addons, breadcrumbs: getCrumbs("Товары") });
}

async function createProduct(req, res) {
  const { category_id, name, description, price, weight_g, proteins, fats, carbs, calories, sort_order } = req.body;
  // 🟢 Путь для базы данных теперь /img/products/
  const image_url = req.file ? `/img/products/${req.file.filename}` : (req.body.image_url || null);

  const { rows } = await pool.query(
    `INSERT INTO products (category_id, name, description, price, image_url, weight_g, proteins, fats, carbs, calories, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [category_id, name, description || null, price, image_url, weight_g || null, proteins || 0, fats || 0, carbs || 0, calories || 0, sort_order || 0]
  );

  let selectedAddons = [].concat(req.body.addons || []);
  for (let addonId of selectedAddons) {
    await pool.query("INSERT INTO product_add_ons (product_id, add_on_id) VALUES ($1, $2)", [rows[0].id, addonId]);
  }
  res.redirect("/admin/products");
}

async function editProduct(req, res) {
  const { category_id, name, description, price, weight_g, proteins, fats, carbs, calories, sort_order } = req.body;
  const productId = req.params.id;

  const { rows } = await pool.query("SELECT image_url FROM products WHERE id=$1", [productId]);
  // 🟢 Путь для базы данных теперь /img/products/
  const image_url = req.file ? `/img/products/${req.file.filename}` : (rows[0]?.image_url || null);

  await pool.query(
    `UPDATE products SET category_id=$1, name=$2, description=$3, price=$4, image_url=$5, weight_g=$6, proteins=$7, fats=$8, carbs=$9, calories=$10, sort_order=$11 WHERE id=$12`,
    [category_id, name, description || null, price, image_url, weight_g || null, proteins || 0, fats || 0, carbs || 0, calories || 0, sort_order || 0, productId]
  );

  await pool.query("DELETE FROM product_add_ons WHERE product_id=$1", [productId]);
  let selectedAddons = [].concat(req.body.addons || []);
  for (let addonId of selectedAddons) {
    await pool.query("INSERT INTO product_add_ons (product_id, add_on_id) VALUES ($1, $2)", [productId, addonId]);
  }
  res.redirect("/admin/products");
}

async function deleteProduct(req, res) {
  await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
  res.redirect("/admin/products");
}

async function toggleProductActive(req, res) {
  await pool.query("UPDATE products SET is_active = NOT is_active WHERE id=$1", [req.params.id]);
  res.redirect("/admin/products");
}

async function featuredPage(req, res) {
  const { rows: featured } = await pool.query(`SELECT fp.id, fp.sort_order, p.id AS product_id, p.name, p.price FROM featured_products fp JOIN products p ON p.id=fp.product_id ORDER BY fp.sort_order ASC, fp.id DESC`);
  const { rows: products } = await pool.query(`SELECT id, name FROM products WHERE is_active=TRUE ORDER BY name ASC`);
  res.render("pages/admin/featured", { title: "Популярные блюда", featured, products, breadcrumbs: getCrumbs("Популярные блюда") });
}

async function addFeatured(req, res) {
  await pool.query(`INSERT INTO featured_products (product_id, sort_order) VALUES ($1,$2) ON CONFLICT (product_id) DO UPDATE SET sort_order=EXCLUDED.sort_order`, [req.body.product_id, Number(req.body.sort_order || 0)]);
  res.redirect("/admin/featured");
}

async function removeFeatured(req, res) {
  await pool.query("DELETE FROM featured_products WHERE id=$1", [req.params.id]);
  res.redirect("/admin/featured");
}

async function usersPage(req, res) {
  const { rows: users } = await pool.query(`SELECT u.id, u.username, u.email, u.phone, u.is_active, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id DESC`);
  const { rows: roles } = await pool.query("SELECT * FROM roles ORDER BY id ASC");
  res.render("pages/admin/users", { title: "Пользователи", users, roles, breadcrumbs: getCrumbs("Пользователи") });
}

async function updateUser(req, res) {
  await pool.query("UPDATE users SET role_id=$1, is_active=$2 WHERE id=$3", [req.body.role_id, req.body.is_active === "1", req.params.id]);
  res.redirect("/admin/users");
}

async function resetPassword(req, res) {
  const password_hash = await bcrypt.hash(req.body.new_password, 12);
  await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [password_hash, req.params.id]);
  res.redirect("/admin/users");
}

async function bannersPage(req, res) {
  const { rows: banners } = await pool.query("SELECT * FROM banners ORDER BY id DESC");
  res.render("pages/admin/banners", { title: "Баннеры", banners, breadcrumbs: getCrumbs("Баннеры") });
}

async function createBanner(req, res) {
  // 🟢 Путь для базы данных теперь /img/banners/
  const image_url = req.file ? `/img/banners/${req.file.filename}` : null;
  if (image_url) {
    await pool.query("INSERT INTO banners (image_url) VALUES ($1)", [image_url]);
  }
  res.redirect("/admin/banners");
}

async function toggleBanner(req, res) {
  await pool.query("UPDATE banners SET is_active = NOT is_active WHERE id=$1", [req.params.id]);
  res.redirect("/admin/banners");
}

async function deleteBanner(req, res) {
  await pool.query("DELETE FROM banners WHERE id=$1", [req.params.id]);
  res.redirect("/admin/banners");
}

async function addonsPage(req, res) {
  const { rows: addons } = await pool.query("SELECT * FROM add_ons ORDER BY id DESC");
  res.render("pages/admin/addons", { title: "Добавки", addons, breadcrumbs: getCrumbs("Добавки") });
}

async function createAddon(req, res) {
  await pool.query("INSERT INTO add_ons (name, price) VALUES ($1, $2)", [req.body.name, req.body.price]);
  res.redirect("/admin/addons");
}

async function deleteAddon(req, res) {
  try {
    await pool.query("DELETE FROM add_ons WHERE id=$1", [req.params.id]);
    res.redirect("/admin/addons");
  } catch (error) {
    res.send(`<script>alert('Нельзя удалить добавку, так как она привязана к товарам!'); window.location.href='/admin/addons';</script>`);
  }
}

async function promoPage(req, res) {
  const { rows: news } = await pool.query("SELECT * FROM news ORDER BY id DESC");
  const { rows: promotions } = await pool.query("SELECT * FROM promotions ORDER BY id DESC");
  res.render("pages/admin/promotions", { title: "Управление акциями", news, promotions, breadcrumbs: getCrumbs("Акции и Новинки") });
}

async function addPromo(req, res) {
  const { type, title, date_range } = req.body;
  // 🟢 Путь для базы данных теперь /img/promo/
  const imageUrl = req.file ? `/img/promo/${req.file.filename}` : '/img/placeholder.png';

  if (type === 'news') {
    await pool.query("INSERT INTO news (title, image_url) VALUES ($1, $2)", [title, imageUrl]);
  } else {
    await pool.query("INSERT INTO promotions (title, date_range, image_url) VALUES ($1, $2, $3)", [title, date_range, imageUrl]);
  }
  res.redirect('/admin/promotions');
}

async function togglePromo(req, res) {
  const table = req.params.type === 'news' ? 'news' : 'promotions';
  await pool.query(`UPDATE ${table} SET is_active = NOT is_active WHERE id = $1`, [req.params.id]);
  res.redirect('/admin/promotions');
}

async function deletePromo(req, res) {
  const table = req.params.type === 'news' ? 'news' : 'promotions';
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
  res.redirect('/admin/promotions');
}

module.exports = {
  dashboard, categoriesPage, createCategory, deleteCategory,
  productsPage, createProduct, editProduct, deleteProduct, toggleProductActive,
  featuredPage, addFeatured, removeFeatured, usersPage, updateUser, resetPassword,
  bannersPage, createBanner, toggleBanner, deleteBanner,
  addonsPage, createAddon, deleteAddon, promoPage, addPromo, togglePromo, deletePromo
};