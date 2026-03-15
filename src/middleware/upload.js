const path = require("path");
const fs = require("fs");
const multer = require("multer");

function fileFilter(req, file, cb) {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Разрешены только JPG/PNG/WEBP"), ok);
}

const createStorage = (folderName) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            // 🟢 ИСПРАВЛЕНИЕ: Теперь сохраняем строго в public/img/название_папки
            const dir = path.join(__dirname, "..", "public", "img", folderName);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const safe = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
            cb(null, safe);
        }
    });
};

const createUploader = (folderName) => {
    return multer({
        storage: createStorage(folderName),
        fileFilter,
        // 🟢 ЖЕСТКИЙ ЛИМИТ: 50 Мегабайт
        limits: { fileSize: 50 * 1024 * 1024 }
    }).single("image");
};

// Создаем загрузчики
const uploadProductImage = createUploader("products");
const uploadPromoImage = createUploader("promo");
const uploadBannerImage = createUploader("banners");

module.exports = {
    uploadProductImage,
    uploadPromoImage,
    uploadBannerImage
};