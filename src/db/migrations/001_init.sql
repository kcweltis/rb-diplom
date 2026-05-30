CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  dob DATE,
  password_hash TEXT NOT NULL,
  yandex_id TEXT UNIQUE,
  otp_code TEXT,
  otp_expires_at TIMESTAMP,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  role_id INT NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  weight_g INT,
  kcal_100g INT,
  proteins NUMERIC(10,2) NOT NULL DEFAULT 0,
  fats NUMERIC(10,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(10,2) NOT NULL DEFAULT 0,
  calories NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS add_ons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_add_ons (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  add_on_id INT NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
  UNIQUE (product_id, add_on_id)
);

CREATE TABLE IF NOT EXISTS featured_products (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,
  size TEXT,
  option TEXT
);

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
  customer_name TEXT,
  customer_phone TEXT,
  details JSONB,
  payment_info JSONB,
  comment TEXT,
  utensils TEXT,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  price_at_time NUMERIC(10,2) NOT NULL CHECK (price_at_time >= 0),
  addons JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS couriers (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type TEXT,
  is_on_shift BOOLEAN NOT NULL DEFAULT FALSE
);
