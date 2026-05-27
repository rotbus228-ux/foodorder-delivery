-- ══════════════════════════════════════════════════════════════════
-- Foodorder Delivery — Supabase Setup SQL
-- รันใน Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════════

-- หมวดหมู่อาหาร
CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- เมนูอาหาร
CREATE TABLE IF NOT EXISTS menus (
  id           SERIAL PRIMARY KEY,
  category_id  INT REFERENCES categories(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL,
  image_url    TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT now(),
  updated_at   TIMESTAMP DEFAULT now()
);

-- ตัวเลือกเสริมของเมนู
CREATE TABLE IF NOT EXISTS menu_options (
  id          SERIAL PRIMARY KEY,
  menu_id     INT REFERENCES menus(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  extra_price DECIMAL(10,2) DEFAULT 0
);

-- ออเดอร์ Delivery
CREATE TABLE IF NOT EXISTS delivery_orders (
  id                SERIAL PRIMARY KEY,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  delivery_address  TEXT NOT NULL,
  note              TEXT,
  subtotal          DECIMAL(10,2) DEFAULT 0,
  delivery_fee      DECIMAL(10,2) DEFAULT 30,
  total_price       DECIMAL(10,2) DEFAULT 0,
  payment_method    TEXT DEFAULT 'cash',   -- 'cash' | 'transfer'
  payment_slip_url  TEXT,                  -- URL รูปสลีปโอนเงิน
  payment_amount    DECIMAL(10,2),         -- ยอดที่ลูกค้าแจ้ง
  status            TEXT DEFAULT 'pending',
  -- Status flow:
  --   cash:     pending → preparing → out_for_delivery → delivered | cancelled
  --   transfer: pending_payment → pending → preparing → out_for_delivery → delivered | cancelled
  created_at        TIMESTAMP DEFAULT now(),
  updated_at        TIMESTAMP DEFAULT now()
);

-- รายการอาหารในออเดอร์ Delivery
CREATE TABLE IF NOT EXISTS delivery_order_items (
  id                SERIAL PRIMARY KEY,
  delivery_order_id INT REFERENCES delivery_orders(id) ON DELETE CASCADE,
  menu_id           INT REFERENCES menus(id),
  menu_name         TEXT NOT NULL,
  quantity          INT DEFAULT 1,
  unit_price        DECIMAL(10,2) NOT NULL,
  options           JSONB,
  note              TEXT
);

-- Settings ร้าน
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMP DEFAULT now()
);

-- ค่าเริ่มต้น settings
INSERT INTO settings (key, value) VALUES
  ('restaurant_name',        'ร้านอาหารของเรา'),
  ('delivery_fee',           '30'),
  ('payment_bank_name',      'ธนาคารกสิกรไทย'),
  ('payment_account_number', 'xxx-x-xxxxx-x'),
  ('payment_account_name',   'ชื่อเจ้าของร้าน'),
  ('payment_qr_url',         '')
ON CONFLICT (key) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- Storage Bucket: สร้างใน Supabase Dashboard → Storage
-- สร้าง bucket ชื่อ "payment-slips"  → Public bucket
-- สร้าง bucket ชื่อ "menu-images"    → Public bucket (ถ้ายังไม่มี)
-- ══════════════════════════════════════════════════════════════════
