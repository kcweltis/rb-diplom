const express = require("express");
const router = express.Router();
const { requireRole } = require("../middleware/auth");
const admin = require("../controllers/admin.controller");
const { uploadProductImage } = require("../middleware/upload");

router.use(requireRole("ADMIN"));

// --- ГЛАВНАЯ ---
router.get("/", admin.dashboard);

// --- КАТЕГОРИИ ---
router.get("/categories", admin.categoriesPage);
router.post("/categories", admin.createCategory);
router.post("/categories/:id/delete", admin.deleteCategory);

// --- ТОВАРЫ ---
router.get("/products", admin.productsPage);
router.post("/products", uploadProductImage, admin.createProduct);
router.post("/products/:id/edit", uploadProductImage, admin.editProduct);
router.post("/products/:id/delete", admin.deleteProduct);
router.post("/products/:id/toggle", admin.toggleProductActive); // Убрали лишнее /admin

// --- ДОБАВКИ (НОВОЕ) ---
router.get("/addons", admin.addonsPage);
router.post("/addons", admin.createAddon);
router.post("/addons/:id/delete", admin.deleteAddon);

// --- ПОПУЛЯРНЫЕ БЛЮДА ---
router.get("/featured", admin.featuredPage);
router.post("/featured", admin.addFeatured);
router.post("/featured/:id/delete", admin.removeFeatured);

// --- ПОЛЬЗОВАТЕЛИ ---
router.get("/users", admin.usersPage);
router.post("/users/:id/update", admin.updateUser);
router.post("/users/:id/reset-password", admin.resetPassword);

// --- БАННЕРЫ ---
router.get("/banners", admin.bannersPage);
router.post("/banners", uploadProductImage, admin.createBanner);
router.post("/banners/:id/toggle", admin.toggleBanner);
router.post("/banners/:id/delete", admin.deleteBanner);

module.exports = router;