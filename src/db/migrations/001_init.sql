-- 001_init.sql
-- Core schema: roles/users/products/orders + featured products + couriers

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

CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by INT REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT now()
);
