-- ══════════════════════════════════════════════════════════════════
--  MENU SEED DATA — ร้านอาหาร Delivery
--  รัน SQL นี้ใน Supabase SQL Editor หลังจากรัน supabase-setup.sql แล้ว
-- ══════════════════════════════════════════════════════════════════

-- ── ลบข้อมูลเก่า (ถ้ามี) ──────────────────────────────────────────
DELETE FROM menu_options;
DELETE FROM menus;
DELETE FROM categories;

-- ── หมวดหมู่ ────────────────────────────────────────────────────────
INSERT INTO categories (name, sort_order) VALUES
  ('อาหารจานเดียว',   1),
  ('อาหารเส้น',        2),
  ('แกงและต้ม',       3),
  ('ทานเล่น',          4),
  ('เครื่องดื่ม',       5),
  ('ของหวาน',          6);

-- ── เมนู ────────────────────────────────────────────────────────────
-- อาหารจานเดียว
INSERT INTO menus (category_id, name, description, price, image_url, is_available, sort_order)
SELECT
  c.id,
  m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM (
  VALUES
    (
      'ข้าวผัดกุ้ง',
      'ข้าวผัดกุ้งใหญ่ ปรุงรสกำลังดี หอมไข่ไก่ มะเขือเทศ ต้นหอม',
      69,
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
      1
    ),
    (
      'ข้าวผัดกะเพราหมูสับ',
      'กะเพราหมูสับใบกะเพราเต็มๆ กลิ่นหอม เผ็ดร้อน เสิร์ฟพร้อมไข่ดาว',
      65,
      'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&q=80',
      2
    ),
    (
      'ข้าวหมูแดง',
      'ข้าวหมูแดงสูตรต้นตำรับ หมูนุ่ม น้ำราดหอมหวาน เสิร์ฟพร้อมไข่ต้ม',
      70,
      'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
      3
    ),
    (
      'ข้าวมันไก่',
      'ข้าวมันไก่ต้มสุตร Hainanese ไก่นุ่ม ข้าวมันหอม น้ำจิ้มสูตรพิเศษ',
      65,
      'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
      4
    ),
    (
      'ข้าวหน้าเป็ดย่าง',
      'เป็ดย่างสูตรจีน หนังกรอบ เนื้อนุ่ม น้ำราดเข้มข้น',
      80,
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
      5
    )
) AS m(name, description, price, image_url, sort_order)
JOIN categories c ON c.name = 'อาหารจานเดียว';

-- อาหารเส้น
INSERT INTO menus (category_id, name, description, price, image_url, is_available, sort_order)
SELECT
  c.id,
  m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM (
  VALUES
    (
      'ผัดไทยกุ้งสด',
      'ผัดไทยกุ้งสดคัดพิเศษ เส้นนุ่ม ไข่กลมกล่อม ถั่วงอก มะนาว',
      85,
      'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80',
      1
    ),
    (
      'ก๋วยเตี๋ยวหมูน้ำตก',
      'น้ำใสกระดูกหมูเคี่ยวนาน หมูนุ่ม เลือดหมู ผักสด เส้นใหญ่',
      60,
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80',
      2
    ),
    (
      'บะหมี่เป็ดย่าง',
      'บะหมี่เส้นนุ่มกับเป็ดย่างสูตรพิเศษ น้ำซุปเข้มข้น',
      75,
      'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
      3
    )
) AS m(name, description, price, image_url, sort_order)
JOIN categories c ON c.name = 'อาหารเส้น';

-- แกงและต้ม
INSERT INTO menus (category_id, name, description, price, image_url, is_available, sort_order)
SELECT
  c.id,
  m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM (
  VALUES
    (
      'แกงเขียวหวานไก่',
      'แกงเขียวหวานหอมมะพร้าวสด เนื้อไก่นุ่ม มะเขือเปราะ ใบมะกรูด',
      75,
      'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80',
      1
    ),
    (
      'ต้มยำกุ้งน้ำข้น',
      'ต้มยำกุ้งน้ำข้นกุ้งสดใหญ่ เห็ดฟาง ตะไคร้ ข่า ใบมะกรูด เผ็ดจัดจ้าน',
      95,
      'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&q=80',
      2
    ),
    (
      'มัสมั่นเนื้อ',
      'มัสมั่นเนื้อวัวตุ๋นนุ่ม มันฝรั่ง ถั่วลิสง กะทิเข้มข้น',
      90,
      'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80',
      3
    )
) AS m(name, description, price, image_url, sort_order)
JOIN categories c ON c.name = 'แกงและต้ม';

-- ทานเล่น
INSERT INTO menus (category_id, name, description, price, image_url, is_available, sort_order)
SELECT
  c.id,
  m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM (
  VALUES
    (
      'ไก่ทอดกรอบ (4 ชิ้น)',
      'ไก่ทอดกรอบนอกนุ่มใน หมักสูตรลับ เสิร์ฟพร้อมน้ำจิ้ม',
      75,
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80',
      1
    ),
    (
      'ปอเปี๊ยะทอด (5 ชิ้น)',
      'ปอเปี๊ยะกรอบไส้ผัก-เนื้อสับ ทอดใหม่กรอบอร่อย',
      55,
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&q=80',
      2
    ),
    (
      'ส้มตำไทย',
      'ส้มตำมะละกอสดปรุงรสจัดจ้าน มะเขือเทศ ถั่วฝักยาว กุ้งแห้ง',
      55,
      'https://images.unsplash.com/photo-1611270629569-8b357cb88da9?w=600&q=80',
      3
    )
) AS m(name, description, price, image_url, sort_order)
JOIN categories c ON c.name = 'ทานเล่น';

-- เครื่องดื่ม
INSERT INTO menus (category_id, name, description, price, image_url, is_available, sort_order)
SELECT
  c.id,
  m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM (
  VALUES
    (
      'ชาไทยเย็น',
      'ชาไทยแท้ๆ นมข้นหวาน เย็นชื่นใจ ทำจากใบชาผสมสูตร',
      35,
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      1
    ),
    (
      'น้ำมะพร้าว',
      'น้ำมะพร้าวสดเย็น หวานธรรมชาติ',
      45,
      'https://images.unsplash.com/photo-1548369937-47519962c11a?w=600&q=80',
      2
    ),
    (
      'น้ำเปล่า',
      'น้ำดื่มสะอาด ขวดใหญ่ 600 มล.',
      15,
      'https://images.unsplash.com/photo-1548369937-47519962c11a?w=600&q=80',
      3
    ),
    (
      'โค้ก / เป๊ปซี่',
      'น้ำอัดลมเย็น กระป๋อง 325 มล.',
      25,
      'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80',
      4
    )
) AS m(name, description, price, image_url, sort_order)
JOIN categories c ON c.name = 'เครื่องดื่ม';

-- ของหวาน
INSERT INTO menus (category_id, name, description, price, image_url, is_available, sort_order)
SELECT
  c.id,
  m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM (
  VALUES
    (
      'ข้าวเหนียวมะม่วง',
      'ข้าวเหนียวมูนหวานหอม มะม่วงน้ำดอกไม้สุก กะทิราด',
      65,
      'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80',
      1
    ),
    (
      'ทับทิมกรอบ',
      'ทับทิมกรอบในน้ำกะทิสดหวาน เย็นชื่นใจ',
      45,
      'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=600&q=80',
      2
    )
) AS m(name, description, price, image_url, sort_order)
JOIN categories c ON c.name = 'ของหวาน';

-- ── ตัวเลือกพิเศษ ────────────────────────────────────────────────────
-- ผัดกะเพรา — เลือกความเผ็ด
INSERT INTO menu_options (menu_id, name, extra_price)
SELECT m.id, opt.name, opt.extra_price
FROM menus m,
(VALUES
  ('ไม่เผ็ด', 0),
  ('เผ็ดน้อย', 0),
  ('เผ็ดปานกลาง', 0),
  ('เผ็ดมาก', 0),
  ('เผ็ดสุดๆ', 0)
) AS opt(name, extra_price)
WHERE m.name = 'ข้าวผัดกะเพราหมูสับ';

-- ข้าวผัดกุ้ง — ตัวเลือก
INSERT INTO menu_options (menu_id, name, extra_price)
SELECT m.id, opt.name, opt.extra_price
FROM menus m,
(VALUES
  ('เพิ่มไข่ดาว', 10),
  ('เพิ่มกุ้ง', 20),
  ('ไม่ใส่ต้นหอม', 0)
) AS opt(name, extra_price)
WHERE m.name = 'ข้าวผัดกุ้ง';

-- ผัดไทย — ตัวเลือก
INSERT INTO menu_options (menu_id, name, extra_price)
SELECT m.id, opt.name, opt.extra_price
FROM menus m,
(VALUES
  ('เพิ่มกุ้ง', 25),
  ('เส้นเล็ก', 0),
  ('เส้นใหญ่', 0),
  ('ไม่ใส่ถั่วงอก', 0)
) AS opt(name, extra_price)
WHERE m.name = 'ผัดไทยกุ้งสด';

-- ต้มยำ — ตัวเลือก
INSERT INTO menu_options (menu_id, name, extra_price)
SELECT m.id, opt.name, opt.extra_price
FROM menus m,
(VALUES
  ('เผ็ดน้อย', 0),
  ('เผ็ดมาก', 0),
  ('เพิ่มกุ้ง', 30),
  ('น้ำใส', 0)
) AS opt(name, extra_price)
WHERE m.name = 'ต้มยำกุ้งน้ำข้น';

-- ไก่ทอด — ตัวเลือก
INSERT INTO menu_options (menu_id, name, extra_price)
SELECT m.id, opt.name, opt.extra_price
FROM menus m,
(VALUES
  ('เพิ่มชิ้น (+2 ชิ้น)', 35),
  ('น้ำจิ้มพิเศษ', 10),
  ('ขนาดปีก', 0),
  ('ขนาดน่อง', 0)
) AS opt(name, extra_price)
WHERE m.name = 'ไก่ทอดกรอบ (4 ชิ้น)';

-- ชาไทย — ตัวเลือก
INSERT INTO menu_options (menu_id, name, extra_price)
SELECT m.id, opt.name, opt.extra_price
FROM menus m,
(VALUES
  ('หวานน้อย', 0),
  ('หวานปกติ', 0),
  ('หวานมาก', 0),
  ('ไม่ใส่นม', 0)
) AS opt(name, extra_price)
WHERE m.name = 'ชาไทยเย็น';

-- ═══════════════════════════════════════════════════════════════════
--  อัปเดต Settings ร้าน (ปรับตามร้านจริง)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO settings (key, value) VALUES
  ('restaurant_name',      'ร้านอาหารอร่อย'),
  ('delivery_fee',         '30'),
  ('payment_bank_name',    'ธนาคารกสิกรไทย'),
  ('payment_account_number', '000-0-00000-0'),
  ('payment_account_name', 'นาย เจ้าของร้าน'),
  ('payment_qr_url',       '')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
