const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const chatController = require('../controllers/chat.controller');
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
const {
    getLogin, postLogin,
    getRegister, postRegister,
    logout,
    getVerifyOtp, postVerifyOtp,
    getForgotPassword, postForgotPassword,
    getResetPassword, postResetPassword,
    getYandexAuth, getYandexCallback
} = require("../controllers/auth.controller");
const promoController = require("../controllers/promo.controller");
const adminController = require("../controllers/admin.controller");
const courierController = require("../controllers/courier.controller");

// --- MIDDLEWARE ---
const { requireAuth } = require("../middleware/auth");
const { uploadPromoImage, uploadBannerImage } = require("../middleware/upload");

// === MIDDLEWARE ДЛЯ КУРЬЕРА ===
function requireCourierRole(req, res, next) {
    if (req.user && String(req.user.role_id) === '3') return next(); // 3 = COURIER
    res.status(403).render("pages/403", { title: "Доступ запрещен" });
}

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

// Яндекс OAuth
router.get("/auth/yandex", getYandexAuth);
router.get("/auth/yandex/callback", getYandexCallback);

// 2FA: подтверждение входа
router.get("/verify-otp", getVerifyOtp);
router.post("/verify-otp", postVerifyOtp);

// Восстановление пароля
router.get("/forgot-password", getForgotPassword);
router.post("/forgot-password", postForgotPassword);
router.get("/reset-password", getResetPassword);
router.post("/reset-password", postResetPassword);

// Профиль
router.get("/profile", requireAuth, profile.page);
router.post("/profile/update", requireAuth, profile.updateInfo);
router.post("/profile/request-change-password", requireAuth, profile.requestChangePasswordOtp);
router.get("/profile/change-password", requireAuth, profile.getChangePassword);
router.post("/profile/change-password", requireAuth, profile.changePassword);
router.post("/profile/toggle-2fa", requireAuth, profile.toggleTwoFactor);
router.get("/api/order/:orderId/status", requireAuth, profile.getOrderStatusApi);

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
router.post("/api/orders", requireAuth, orderController.createOrder);
router.get("/payment/return", orderController.paymentReturn);
router.post("/api/yookassa/webhook", orderController.yookassaWebhook);
router.get("/api/products/:id", productController.getApiProduct);
router.post("/api/feedback", uploadFeedback.single("file"), adminController.submitFeedback);

// Подписка на рассылку акций
router.post("/api/newsletter/subscribe", promoController.subscribeNewsletter);

// ==========================================
// 5. АДМИН-ПАНЕЛЬ И ПАНЕЛЬ МОДЕРАТОРА
// ==========================================
router.get("/admin/users", isStaff, adminController.usersPage);
router.post("/admin/users/:id/update", isStaff, adminController.updateUser);
router.post("/admin/users/:id/reset-password", isStaff, adminController.resetPassword);

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

router.post('/api/chat', chatController.handleChat);

// ==========================================
// 6. КАБИНЕТ КУРЬЕРА (МОБИЛЬНЫЙ ИНТЕРФЕЙС)
// ==========================================
router.get("/courier/dashboard", requireAuth, requireCourierRole, courierController.dashboard);
router.get("/courier/available-orders", requireAuth, requireCourierRole, courierController.getAvailableOrders);
router.get("/courier/active-order", requireAuth, requireCourierRole, courierController.getActiveOrder);
router.post("/courier/accept-order", requireAuth, requireCourierRole, courierController.acceptOrder);
router.post("/courier/start-delivery", requireAuth, requireCourierRole, courierController.startDelivery);
router.post("/courier/mark-delivered", requireAuth, requireCourierRole, courierController.markDelivered);
router.post("/courier/toggle-shift", requireAuth, requireCourierRole, courierController.toggleOnShift);
router.post("/courier/location", requireAuth, requireCourierRole, courierController.updateLocation);
router.get("/courier/profile", requireAuth, requireCourierRole, courierController.courierProfile);
router.get("/courier/history", requireAuth, requireCourierRole, courierController.deliveryHistory);
router.get("/api/orders/:id/courier-info", courierController.getOrderCourierInfo);

module.exports = router;
