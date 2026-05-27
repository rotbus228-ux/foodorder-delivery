-- ══════════════════════════════════════════════════════════════════
--  เพิ่ม Settings ติดต่อร้าน
--  รัน SQL นี้ใน Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════
INSERT INTO settings (key, value) VALUES
  ('contact_phone', ''),   -- เบอร์โทรร้าน เช่น '0891234567'
  ('contact_line',  '')    -- LINE ID ร้าน เช่น '@myshop'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
