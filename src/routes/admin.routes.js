const express = require("express");
const router = express.Router();
const { requireRole } = require("../middleware/auth");
const admin = require("../controllers/admin.controller");
const { uploadProductImage } = require("../middleware/upload");


router.use(requireRole("ADMIN"));

router.get("/", admin.dashboard);

router.get("/categories", admin.categoriesPage);
router.post("/categories", admin.createCategory);
router.post("/categories/:id/delete", admin.deleteCategory);

router.get("/products", admin.productsPage);
router.post("/products", uploadProductImage, admin.createProduct);
router.post("/products/:id/edit", uploadProductImage, admin.editProduct);
router.post("/products/:id/delete", admin.deleteProduct);

router.get("/featured", admin.featuredPage);
router.post("/featured", admin.addFeatured);
router.post("/featured/:id/delete", admin.removeFeatured);

router.get("/users", admin.usersPage);
router.post("/users/:id/update", admin.updateUser);
router.post("/users/:id/reset-password", admin.resetPassword);

module.exports = router;
