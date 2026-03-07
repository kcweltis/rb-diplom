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


-- demo products (реальные данные потом заменишь)
INSERT INTO products (category_id, name, description, price, image_url)
SELECT c.id, v.name, v.description, v.price, v.image_url
FROM categories c
JOIN (VALUES
  ('Блины','Блин с ветчиной и сыром','Сытный блин с начинкой', 209.00, '/img/products/demo1.png'),
  ('Блины','Блин со сгущёнкой','Сладкий блин', 169.00, '/img/products/demo2.png'),
  ('Напитки','Какао','Горячий напиток', 119.00, '/img/products/demo3.png')
) AS v(category, name, description, price, image_url)
ON c.title = v.category
ON CONFLICT DO NOTHING;

-- mark 3 products as featured
INSERT INTO featured_products (product_id, sort_order)
SELECT id, row_number() OVER (ORDER BY id) - 1
FROM products
ORDER BY id
LIMIT 3
ON CONFLICT (product_id) DO NOTHING;
