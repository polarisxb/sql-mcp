-- Example e-commerce schema and seed data
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  category_id INT,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  order_date DATETIME NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- seed data
INSERT INTO categories (name) VALUES ('Electronics'), ('Books'), ('Clothing');

INSERT INTO products (name, category_id, price) VALUES
 ('Laptop Pro 13', 1, 999.99),
 ('Noise-canceling Headphones', 1, 199.00),
 ('Golang in Action', 2, 39.90),
 ('TypeScript Handbook', 2, 29.90),
 ('Classic T-Shirt', 3, 19.90);

INSERT INTO customers (name, email) VALUES
 ('Alice', 'alice@example.com'),
 ('Bob', 'bob@example.com'),
 ('Carol', 'carol@example.com');

INSERT INTO orders (customer_id, order_date, total) VALUES
 (1, NOW() - INTERVAL 2 DAY, 1198.99),
 (2, NOW() - INTERVAL 1 DAY, 49.80),
 (3, NOW(), 19.90);

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
 (1, 1, 1, 999.99),
 (1, 2, 1, 199.00),
 (2, 3, 1, 39.90),
 (2, 4, 1, 9.90),
 (3, 5, 1, 19.90); 