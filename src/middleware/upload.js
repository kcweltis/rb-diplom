const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "public", "uploads", "products")),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safe = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
        cb(null, safe);
    }
});

function fileFilter(req, file, cb) {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Разрешены только JPG/PNG/WEBP"), ok);
}

const uploadProductImage = multer({
    storage,
    fileFilter,
    limits: { fileSize: 3 * 1024 * 1024 } // 3 MB
}).single("image");

module.exports = { uploadProductImage };
