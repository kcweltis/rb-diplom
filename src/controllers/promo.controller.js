const nodemailer = require("nodemailer");
const { pool } = require("../config/db");

const transporter = nodemailer.createTransport({
  host: "smtp.yandex.ru",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { rejectUnauthorized: false },
  family: 4
});

async function getPromotionsPage(req, res) {
  try {
    const { rows: news } = await pool.query(
      "SELECT * FROM news WHERE is_active = TRUE ORDER BY sort_order ASC, id DESC"
    );
    const { rows: promotions } = await pool.query(
      "SELECT * FROM promotions WHERE is_active = TRUE ORDER BY sort_order ASC, id DESC"
    );
    res.render("pages/promotions", {
      title: "Акции и Новинки",
      news,
      promotions,
      user: req.user
    });
  } catch (error) {
    console.error("Ошибка при загрузке акций:", error);
    res.status(500).send("Внутренняя ошибка сервера");
  }
}

async function subscribeNewsletter(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email не указан" });

  try {
    await pool.query(
      "INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING",
      [email]
    );

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Вы подписаны на рассылку акций",
        html: `
          <h2 style="color:#E30613;">Спасибо за подписку!</h2>
          <p>Вы будете первыми узнавать о наших акциях, новинках и специальных предложениях.</p>
          <p style="color:#888; font-size:13px;">Если вы не подписывались — просто проигнорируйте это письмо.</p>
        `
      });
    } catch (mailErr) {
      console.error("Ошибка отправки письма подписчику:", mailErr);
    }

    res.json({ success: true, message: "Вы успешно подписались на рассылку!" });
  } catch (error) {
    console.error("Ошибка подписки:", error);
    res.status(500).json({ success: false, message: "Ошибка при подписке" });
  }
}

module.exports = { getPromotionsPage, subscribeNewsletter };
