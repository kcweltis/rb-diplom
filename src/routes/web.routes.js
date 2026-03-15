const express = require("express");
const router = express.Router();

// --- КОНТРОЛЛЕРЫ ---
const menuController = require("../controllers/menu.controller");
const productController = require("../controllers/product.controller");
const profile = require("../controllers/profile.controller");
const caloriesController = require("../controllers/calories.controller");
const orderController = require("../controllers/order.controller");
const cartController = require("../controllers/cart.controller");
const { home } = require("../controllers/home.controller");
const { getLogin, postLogin, getRegister, postRegister, logout } = require("../controllers/auth.controller");
const promoController = require("../controllers/promo.controller");
const adminController = require("../controllers/admin.controller");

// --- MIDDLEWARE ---
const { requireAuth } = require("../middleware/auth");
// 🟢 ИСПРАВЛЕНИЕ: Добавили uploadBannerImage из твоего файла upload.js
const { uploadPromoImage, uploadBannerImage } = require("../middleware/upload");

// ==========================================
// 1. ПУБЛИЧНЫЕ СТРАНИЦЫ
// ==========================================
router.get("/", home);
router.get("/menu", menuController.menuPage);
router.get("/calories", caloriesController.page);
router.get("/delivery", (req, res) => res.render("pages/delivery", { title: "Доставка", user: req.user }));
router.get("/reviews", (req, res) => res.render("pages/reviews", { title: "Отзывы", user: req.user }));
router.get("/contacts", (req, res) => res.render("pages/contacts", { title: "Контакты", user: req.user }));
router.get("/promotions", promoController.getPromotionsPage);

// ==========================================
// 2. АВТОРИЗАЦИЯ И ПРОФИЛЬ
// ==========================================
router.get("/login", getLogin);
router.post("/login", postLogin);
router.get("/register", getRegister);
router.post("/register", postRegister);
router.get("/logout", logout);

// Защищенные маршруты профиля
router.get("/profile", requireAuth, profile.page);
router.post("/profile/update", requireAuth, profile.updateInfo);
router.post("/profile/change-password", requireAuth, profile.changePassword);

// ==========================================
// 3. КОРЗИНА И ОФОРМЛЕНИЕ ЗАКАЗА
// ==========================================
router.get("/cart", (req, res) => res.render("pages/cart", { title: "Оформление заказа", user: req.user }));

// API корзины
router.get("/api/cart", cartController.getCartApi);
router.post("/api/cart/add", cartController.addToCart);
router.post("/api/cart/update", cartController.updateQuantity);
router.delete("/api/cart/remove/:id", cartController.removeItem);

// ==========================================
// 4. ЗАКАЗЫ И ТОВАРЫ (API)
// ==========================================
router.post("/api/orders", orderController.createOrder);
router.get("/api/products/:id", productController.getApiProduct);

// ==========================================
// 5. АДМИН-ПАНЕЛЬ
// ==========================================
// --- Управление Акциями ---
router.get("/admin/promotions", adminController.promoPage);
router.post("/admin/promotions/add", uploadPromoImage, adminController.addPromo);
router.post("/admin/promotions/toggle/:type/:id", adminController.togglePromo);
router.post("/admin/promotions/delete/:type/:id", adminController.deletePromo);

// --- Управление Баннерами (Слайдер на главной) ---
// 🟢 ИСПРАВЛЕНИЕ: Добавили пути для баннеров с правильным загрузчиком (uploadBannerImage)
router.get("/admin/banners", adminController.bannersPage);
router.post("/admin/banners/add", uploadBannerImage, adminController.createBanner);
router.post("/admin/banners/toggle/:id", adminController.toggleBanner);
router.post("/admin/banners/delete/:id", adminController.deleteBanner);

module.exports = router;