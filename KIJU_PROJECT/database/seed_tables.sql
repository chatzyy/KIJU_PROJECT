-- KIJU: สร้างโต๊ะ 40 โต๊ะสำหรับหน้า User
-- A01-A20 = 289 บาท / 4 คน
-- B01-B12 = 489 บาท / 8 คน
-- C01-C08 = 689 บาท / 12 คน
-- ใช้กับตาราง restaurant_tables (table_id, capacity, price, status)

INSERT INTO restaurant_tables (table_id, capacity, price, status)
VALUES
(1,4,289,'available'),(2,4,289,'available'),(3,4,289,'available'),(4,4,289,'available'),
(5,4,289,'available'),(6,4,289,'available'),(7,4,289,'available'),(8,4,289,'available'),
(9,4,289,'available'),(10,4,289,'available'),(11,4,289,'available'),(12,4,289,'available'),
(13,4,289,'available'),(14,4,289,'available'),(15,4,289,'available'),(16,4,289,'available'),
(17,4,289,'available'),(18,4,289,'available'),(19,4,289,'available'),(20,4,289,'available'),
(21,8,489,'available'),(22,8,489,'available'),(23,8,489,'available'),(24,8,489,'available'),
(25,8,489,'available'),(26,8,489,'available'),(27,8,489,'available'),(28,8,489,'available'),
(29,8,489,'available'),(30,8,489,'available'),(31,8,489,'available'),(32,8,489,'available'),
(33,12,689,'available'),(34,12,689,'available'),(35,12,689,'available'),(36,12,689,'available'),
(37,12,689,'available'),(38,12,689,'available'),(39,12,689,'available'),(40,12,689,'available')
ON CONFLICT (table_id) DO UPDATE SET
    capacity = EXCLUDED.capacity,
    price = EXCLUDED.price;
