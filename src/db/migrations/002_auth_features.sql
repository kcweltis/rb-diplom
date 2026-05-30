-- Добавляем поддержку Яндекс ID, OTP и 2FA в таблицу пользователей
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS yandex_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS otp_code TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Добавляем пропущенные поля в feedbacks (уже используются в контроллере)
ALTER TABLE feedbacks
  ADD COLUMN IF NOT EXISTS visit_date DATE,
  ADD COLUMN IF NOT EXISTS visit_time TEXT;

-- Таблица подписчиков на рассылку акций
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP NOT NULL DEFAULT now()
);
