-- 001_init.sql
-- Core schema: roles/users/products/orders + featured products + couriers + carts + settings

-- 1. РОЛИ И ПОЛЬЗОВАТЕЛИ
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 2. КАТАЛОГ (МЕНЮ)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS featured_products (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 3. КОРЗИНА (Хранение на сервере без localStorage)
CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE, -- Для гостей сайта
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- Для авторизованных
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE(cart_id, product_id) -- Защита от дублей одного и того же товара
);

-- 4. ЗАКАЗЫ И ДОСТАВКА
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  house TEXT NOT NULL,
  apartment TEXT,
  comment TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  order_type TEXT NOT NULL CHECK (order_type IN ('pickup','delivery')),
  address_id INT REFERENCES delivery_addresses(id),
  status TEXT NOT NULL CHECK (status IN (
    'NEW','CONFIRMED','COOKING','READY','ASSIGNED','ON_THE_WAY','DELIVERED','CANCELLED','FAILED'
  )),
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0, -- Добавлено для учета стоимости доставки!
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  price_at_time NUMERIC(10,2) NOT NULL CHECK (price_at_time >= 0)
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by INT REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 5. КУРЬЕРЫ (Твоя фича для диплома)
CREATE TABLE IF NOT EXISTS couriers (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type TEXT,
  is_on_shift BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS courier_assignments (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  courier_id INT NOT NULL REFERENCES couriers(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP,
  delivered_at TIMESTAMP
);

-- 6. ГЛОБАЛЬНЫЕ НАСТРОЙКИ (Для Админ-панели - Пункт 5 и 12)
CREATE TABLE IF NOT EXISTS settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-------------------------------------------------------------------
-- БАЗОВЫЕ ДАННЫЕ (INSERT)
-------------------------------------------------------------------

INSERT INTO roles (name) VALUES
('ADMIN'), ('MODERATOR'), ('COURIER'), ('USER')
ON CONFLICT DO NOTHING;

INSERT INTO categories (title) VALUES
('Блины сытные'),
('Блины сладкие'),
('Каши рисовые сладкие'),
('Каши гречневые'),
('Драники'),
('Сырники'),
('Кексы'),
('Напитки холодные'),
('Напитки горячие'),
('Супы'),
('Салаты')
ON CONFLICT DO NOTHING;

-- ИСПРАВЛЕННЫЕ ДЕМО-ТОВАРЫ (категории теперь точно совпадают)
INSERT INTO products (category_id, name, description, price, image_url)
SELECT c.id, v.name, v.description, v.price, v.image_url
FROM categories c
JOIN (VALUES
  ('Блины сытные', 'Блин с ветчиной и сыром', 'Сытный блин с начинкой', 209.00, '/img/products/demo1.png'),
  ('Блины сладкие', 'Блин со сгущёнкой', 'Сладкий блин', 169.00, '/img/products/demo2.png'),
  ('Напитки горячие', 'Какао', 'Горячий напиток', 119.00, '/img/products/demo3.png')
) AS v(category, name, description, price, image_url)
ON c.title = v.category
ON CONFLICT DO NOTHING;

-- Добавление популярных товаров
INSERT INTO featured_products (product_id, sort_order)
SELECT id, row_number() OVER (ORDER BY id) - 1
FROM products
ORDER BY id
LIMIT 3
ON CONFLICT (product_id) DO NOTHING;

-- Базовые настройки для админки
INSERT INTO settings (setting_key, setting_value, description) VALUES
('phone', '8 (800) 555-35-35', 'Главный номер телефона'),
('email', 'info@rusbliny.ru', 'Email для связи'),
('delivery_fee', '150', 'Стоимость доставки (в рублях)')
ON CONFLICT (setting_key) DO NOTHING;

-- Базовые рестораны (точки самовывоза)
INSERT INTO restaurants (city, address) VALUES
('Оренбург', 'ул. Аксакова, 8'),
('Оренбург', 'ТРЦ "Армада", ш. Шарлыкское, 1'),
('Тула', 'пр. Ленина, 50')
ON CONFLICT DO NOTHING;