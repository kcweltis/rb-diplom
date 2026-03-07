const express = require("express");
const menuController = require("../controllers/menu.controller");
const { requireAuth } = require("../middleware/auth");
const productController = require("../controllers/product.controller");
const profile = require("../controllers/profile.controller");
const caloriesController = require("../controllers/calories.controller");
const router = express.Router();


const { home } = require("../controllers/home.controller");
const { getLogin, postLogin, getRegister, postRegister, logout } = require("../controllers/auth.controller");

router.get("/", home);

router.get("/login", getLogin);
router.post("/login", postLogin);
router.get("/register", getRegister);
router.post("/register", postRegister);
router.get("/logout", logout);
router.get("/profile", requireAuth, profile.page);
router.post("/profile/update", requireAuth, profile.updateInfo);
router.post("/profile/change-password", requireAuth, profile.changePassword);
router.get("/menu", menuController.menuPage);
router.get("/product/:id", productController.page);
router.get("/calories", caloriesController.page);
router.get("/delivery", (req, res) => res.render("pages/delivery", { title: "Доставка" }));
router.get("/reviews", (req, res) => res.render("pages/reviews", { title: "Отзывы" }));

module.exports = router;




