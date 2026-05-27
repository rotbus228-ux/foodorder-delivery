# Restaurant Delivery — ระบบ 2 (Delivery)

## ข้อมูลโปรเจค
- **ระบบ:** Food Order แบบ Delivery (ส่งถึงบ้าน)
- **สถานะ:** 🔄 Template พร้อม — ยังไม่ได้ Deploy

## Base จาก
- ต่อยอดจาก restaurant-qrmenu1 (System 1 Dine-in)
- โค้ดเหมือนกัน — ต้องเพิ่ม feature Delivery

## Feature ที่ต้องเพิ่ม (ยังไม่ได้ทำ)
- [ ] ฟอร์มกรอกที่อยู่จัดส่ง
- [ ] คำนวณค่าส่ง
- [ ] สถานะออเดอร์: รับออเดอร์ → เตรียม → ส่งแล้ว → ถึงแล้ว
- [ ] จัดการ Rider
- [ ] ระบบรีวิว

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Express.js + Socket.io
- Database: Supabase (สร้าง Project ใหม่ ตั้งชื่อเป็นชื่อร้าน)
- Notifications: Telegram Bot

## ไฟล์สำคัญ
- `frontend/src/pages/client/[table_id].jsx` — หน้าสั่งอาหาร (แก้เป็น delivery)
- `frontend/src/pages/index.jsx` — หน้าแรก
- `backend/server.js` — Express + Socket.io server
- `supabase-setup.sql` — รัน 1 ครั้งเพื่อสร้าง DB ใหม่

## Environment Variables
Backend `.env` (ต้องสร้างใหม่):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `ADMIN_PASSWORD`
- `FRONTEND_URL`
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`

Frontend `.env.production` (ต้องสร้างใหม่):
- `VITE_API_URL`

## Convention สำคัญ
- ทุกครั้งที่สร้าง Supabase Project ใหม่ → ตั้งชื่อเป็นชื่อร้านเสมอ
