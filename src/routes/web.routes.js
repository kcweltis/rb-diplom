const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Настройка для сохранения фото отзывов
const feedbackStorage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, "public/img/feedbacks/"); },
    filename: function (req, file, cb) { cb(null, Date.now() + path.extname(file.originalname)); }
});
const uploadFeedback = multer({ storage: feedbackStorage });

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
const { uploadPromoImage, uploadBannerImage } = require("../middleware/upload");

// === ПРОВЕРКА ДЛЯ ПЕРСОНАЛА (АДМИН ИЛИ МОДЕРАТОР) ===
function isStaff(req, res, next) {
    if (req.user) {
        const role = String(req.user.role_id);
        if (role === '1' || role === '2') return next();
    }
    res.status(403).render("pages/403", { title: "Доступ запрещен" });
}

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
router.get("/privacy", (req, res) => res.render("pages/privacy", { title: "Политика конфиденциальности", user: req.user }));
router.get("/consent", (req, res) => res.render("pages/consent", { title: "Согласие на обработку данных", user: req.user }));
router.get("/legal", (req, res) => res.render("pages/legal", { title: "Юридическая информация", user: req.user }));
router.get("/offer", (req, res) => res.render("pages/offer", { title: "Публичная оферта", user: req.user }));
router.get("/agreement", (req, res) => res.render("pages/agreement", { title: "Пользовательское соглашение", user: req.user }));
router.get("/vacancies", (req, res) => res.render("pages/vacancies", { title: "Вакансии", user: req.user }));
router.post("/api/vacancies", adminController.submitVacancy);

// ==========================================
// 2. АВТОРИЗАЦИЯ И ПРОФИЛЬ
// ==========================================
router.get("/login", getLogin);
router.post("/login", postLogin);
router.get("/register", getRegister);
router.post("/register", postRegister);
router.get("/logout", logout);

router.get("/profile", requireAuth, profile.page);
router.post("/profile/update", requireAuth, profile.updateInfo);
router.post("/profile/change-password", requireAuth, profile.changePassword);

// ==========================================
// 3. КОРЗИНА И ОФОРМЛЕНИЕ ЗАКАЗА
// ==========================================
router.get("/cart", (req, res) => res.render("pages/cart", { title: "Оформление заказа", user: req.user }));

router.get("/api/cart", cartController.getCartApi);
router.post("/api/cart/add", cartController.addToCart);
router.post("/api/cart/update", cartController.updateQuantity);
router.delete("/api/cart/remove/:id", cartController.removeItem);

// ==========================================
// 4. ЗАКАЗЫ И ОТЗЫВЫ (API)
// ==========================================
router.post("/api/orders", orderController.createOrder);
router.get("/api/products/:id", productController.getApiProduct);
router.post("/api/feedback", uploadFeedback.single("file"), adminController.submitFeedback);

// ==========================================
// 5. АДМИН-ПАНЕЛЬ И ПАНЕЛЬ МОДЕРАТОРА
// ==========================================
router.get("/admin/promotions", adminController.promoPage);
router.post("/admin/promotions/add", uploadPromoImage, adminController.addPromo);
router.post("/admin/promotions/toggle/:type/:id", adminController.togglePromo);
router.post("/admin/promotions/delete/:type/:id", adminController.deletePromo);

router.get("/admin/banners", adminController.bannersPage);
router.post("/admin/banners/add", uploadBannerImage, adminController.createBanner);
router.post("/admin/banners/toggle/:id", adminController.toggleBanner);
router.post("/admin/banners/delete/:id", adminController.deleteBanner);
router.get("/panel", isStaff, adminController.moderatorDashboard);
router.get("/panel/vacancies", isStaff, adminController.jobApplicationsPage);
router.post("/panel/vacancies/:id/status", isStaff, adminController.updateJobStatus);

// === РОУТЫ ОТЗЫВОВ (ДОСТУПНО И АДМИНУ, И МОДЕРАТОРУ) ===
router.get("/panel/feedbacks", isStaff, adminController.feedbacksPage);
router.post("/panel/feedbacks/:id/status", isStaff, adminController.updateFeedbackStatus);

module.exports = router;