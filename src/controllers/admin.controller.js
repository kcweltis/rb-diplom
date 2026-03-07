const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

async function dashboard(req, res) {
  const [{ rows: u }, { rows: o }, { rows: p }] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS cnt FROM users"),
    pool.query("SELECT COUNT(*)::int AS cnt FROM orders"),
    pool.query("SELECT COUNT(*)::int AS cnt FROM products"),
  ]);
  res.render("pages/admin/dashboard", { title: "Админ", stats: { users: u[0].cnt, orders: o[0].cnt, products: p[0].cnt } });
}

/* Categories */
async function categoriesPage(req, res) {
  const { rows } = await pool.query("SELECT * FROM categories ORDER BY title ASC");
  res.render("pages/admin/categories", { title: "Категории", categories: rows });
}
async function createCategory(req, res) {
  const { title } = req.body;
  await pool.query("INSERT INTO categories (title) VALUES ($1) ON CONFLICT DO NOTHING", [title]);
  res.redirect("/admin/categories");
}
async function deleteCategory(req, res) {
  await pool.query("DELETE FROM categories WHERE id=$1", [req.params.id]);
  res.redirect("/admin/categories");
}

/* Products */
async function productsPage(req, res) {
  const { rows: products } = await pool.query(
    `SELECT p.*, c.title AS category_title
     FROM products p JOIN categories c ON c.id=p.category_id
     ORDER BY p.id DESC`
  );
  const { rows: categories } = await pool.query("SELECT * FROM categories ORDER BY title ASC");
  res.render("pages/admin/products", { title: "Товары", products, categories });
}

async function createProduct(req, res) {
  const { category_id, name, description, price } = req.body;

  const image_url = req.file
    ? `/uploads/products/${req.file.filename}`
    : (req.body.image_url || null);

  await pool.query(
    `INSERT INTO products (category_id, name, description, price, image_url)
     VALUES ($1,$2,$3,$4,$5)`,
    [category_id, name, description || null, price, image_url]
  );

  res.redirect("/admin/products");
}

async function editProduct(req, res) {
  const { category_id, name, description, price } = req.body;

  const { rows } = await pool.query("SELECT image_url FROM products WHERE id=$1", [req.params.id]);
  const prev = rows[0]?.image_url || null;

  const image_url = req.file
    ? `/uploads/products/${req.file.filename}`
    : prev;

  await pool.query(
    `UPDATE products
     SET category_id=$1, name=$2, description=$3, price=$4, image_url=$5
     WHERE id=$6`,
    [category_id, name, description || null, price, image_url, req.params.id]
  );

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

/* Featured (popular) */
async function featuredPage(req, res) {
  const { rows: featured } = await pool.query(
    `SELECT fp.id, fp.sort_order, p.id AS product_id, p.name, p.price
     FROM featured_products fp
     JOIN products p ON p.id=fp.product_id
     ORDER BY fp.sort_order ASC, fp.id DESC`
  );
  const { rows: products } = await pool.query(
    `SELECT id, name FROM products WHERE is_active=TRUE ORDER BY name ASC`
  );
  res.render("pages/admin/featured", { title: "Популярные блюда", featured, products });
}

async function addFeatured(req, res) {
  const { product_id, sort_order } = req.body;
  await pool.query(
    `INSERT INTO featured_products (product_id, sort_order)
     VALUES ($1,$2)
     ON CONFLICT (product_id) DO UPDATE SET sort_order=EXCLUDED.sort_order`,
    [product_id, Number(sort_order || 0)]
  );
  res.redirect("/admin/featured");
}

async function removeFeatured(req, res) {
  await pool.query("DELETE FROM featured_products WHERE id=$1", [req.params.id]);
  res.redirect("/admin/featured");
}

/* Users */
async function usersPage(req, res) {
  const { rows: users } = await pool.query(
    `SELECT u.id, u.username, u.email, u.phone, u.is_active, r.name AS role
     FROM users u JOIN roles r ON r.id=u.role_id
     ORDER BY u.id DESC`
  );
  const { rows: roles } = await pool.query("SELECT * FROM roles ORDER BY id ASC");
  res.render("pages/admin/users", { title: "Пользователи", users, roles });
}

async function updateUser(req, res) {
  const { role_id, is_active } = req.body;
  await pool.query("UPDATE users SET role_id=$1, is_active=$2 WHERE id=$3", [role_id, is_active === "1", req.params.id]);
  res.redirect("/admin/users");
}

async function resetPassword(req, res) {
  const newPassword = req.body.new_password;
  const password_hash = await bcrypt.hash(newPassword, 12);
  await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [password_hash, req.params.id]);
  res.redirect("/admin/users");
}

module.exports = {
  dashboard,
  categoriesPage, createCategory, deleteCategory,
  productsPage, createProduct, editProduct, deleteProduct, toggleProductActive,
  featuredPage, addFeatured, removeFeatured,
  usersPage, updateUser, resetPassword
};
