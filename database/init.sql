CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(120) UNIQUE NOT NULL,
  nickname VARCHAR(80) NOT NULL,
  bio TEXT,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner_id BIGINT NOT NULL,
  destination VARCHAR(120) NOT NULL,
  depart_date DATE NOT NULL,
  days INT NOT NULL,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  transport VARCHAR(40),
  companion_count INT,
  gender_preference VARCHAR(40),
  status VARCHAR(30) DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS trip_days (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trip_id BIGINT NOT NULL,
  day_no INT NOT NULL,
  title VARCHAR(160) NOT NULL DEFAULT '',
  lodging VARCHAR(160),
  transport_plan VARCHAR(160),
  owner_name VARCHAR(80) NOT NULL DEFAULT '',
  estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trip_days_trip (trip_id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trip_id BIGINT NOT NULL,
  category VARCHAR(40) NOT NULL,
  planned DECIMAL(10,2) NOT NULL,
  spent DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS diary_entries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trip_id BIGINT NOT NULL,
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 演示数据：一条大理行程和三条每日安排，便于打开协作看板即可体验
INSERT INTO trips (id, owner_id, destination, depart_date, days, budget_min, budget_max, transport, companion_count, gender_preference, status)
SELECT 1, 1, '大理', '2026-07-12', 5, 3500, 5200, '公共交通', 3, '不限', 'OPEN'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM trips WHERE id = 1);

INSERT INTO trip_days (id, trip_id, day_no, title, lodging, transport_plan, owner_name, estimated_cost)
SELECT 1, 1, 1, '抵达大理，古城集合', '古城南门客栈（标间）', '机场大巴 + 步行', '小舟', 800
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM trip_days WHERE id = 1);

INSERT INTO trip_days (id, trip_id, day_no, title, lodging, transport_plan, owner_name, estimated_cost)
SELECT 2, 1, 2, '环洱海骑行', '才村海景民宿', '租电动车环湖', '阿黎', 1200
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM trip_days WHERE id = 2);

INSERT INTO trip_days (id, trip_id, day_no, title, lodging, transport_plan, owner_name, estimated_cost)
SELECT 3, 1, 3, '沙溪古镇一日游', '沙溪古镇客栈', '拼车往返', '小舟', 600
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM trip_days WHERE id = 3);
