-- 003_courier_features.sql
-- Добавляем поддержку полнофункционального кабинета курьера

-- Добавляем delivery_fee если его ещё нет
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Добавляем courier_id в заказы (какой курьер доставляет)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS courier_id INT REFERENCES couriers(id) ON DELETE SET NULL;

-- Добавляем поля для отслеживания статуса доставки
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Таблица для хранения оценок курьеров (рейтинг)
CREATE TABLE IF NOT EXISTS courier_ratings (
  id SERIAL PRIMARY KEY,
  courier_id INT NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  order_id INT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Таблица для отслеживания местоположения курьера (GPS)
CREATE TABLE IF NOT EXISTS courier_locations (
  id SERIAL PRIMARY KEY,
  courier_id INT NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_couriers_is_on_shift ON couriers(is_on_shift);
CREATE INDEX IF NOT EXISTS idx_courier_ratings_courier_id ON courier_ratings(courier_id);
-- UNIQUE index required for ON CONFLICT clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_courier_locations_courier_id ON courier_locations(courier_id);
