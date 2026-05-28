# Restaurant Delivery — ระบบ Delivery (ส่งถึงบ้าน)

## 🔴 Standing Instructions — ทำทุก session เสมอ
1. **ส่งลิ้งเว็บหลังแก้ไขเสมอ** — ทุกครั้งที่ทำเสร็จหรือ deploy ต้องส่ง URL ให้ user ตรวจ
2. **ตรวจสอบสิ่งที่ user สั่งให้ครบ** — อ่านก่อน ถ้าไม่เข้าใจถามก่อน
3. **หลัง context limit กลับมาทำงานต่อได้เลย** — ไม่ต้อง recap ไม่ต้องถาม

## 🚀 Status: LIVE ✅
- **Frontend:** https://frontend-six-sigma-khqhk1u8gl.vercel.app
- **Backend:** https://foodorder-delivery-production.up.railway.app
- **GitHub:** https://github.com/rotbus228-ux/foodorder-delivery

## 📦 Deploy
```bash
# Frontend — ต้องรันเองทุกครั้ง (Vercel ไม่มี auto-deploy)
cd "C:\Users\muhahaha\Documents\Foodorder -delivery\frontend"
npx vercel --prod

# Backend — auto-deploy จาก git push อัตโนมัติ
git push origin main
```

## 🔑 Credentials
- **Admin email:** rotbus228@gmail.com
- **Admin password:** admin1214
- **Supabase project ID:** ewhkwqzlxwclkfcgrsym (Singapore)
- **Railway service ID:** 3262738e-cdc5-45ff-a1f2-e903cff19c2d

## Stack
- Frontend: React + Vite + Tailwind CSS (Vercel)
- Backend: Express.js + Socket.io (Railway, rootDirectory=/backend)
- Database: Supabase PostgreSQL (ewhkwqzlxwclkfcgrsym)
- Realtime: Socket.io + Supabase ws (Node 18 ต้องใช้ ws package)

## ไฟล์สำคัญ
- `frontend/src/App.jsx` — routes ทั้งหมด
- `frontend/src/pages/delivery/index.jsx` — หน้าสั่งอาหาร + checkout (slip validation)
- `frontend/src/pages/delivery/track.jsx` — ติดตามออเดอร์ real-time
- `frontend/src/pages/delivery/history.jsx` — ประวัติ (auto-load จาก localStorage)
- `frontend/src/pages/admin/dashboard.jsx` — Dashboard + Settings modal (QR upload)
- `frontend/src/pages/admin/customers.jsx` — ประวัติลูกค้าทั้งหมด (ใหม่)
- `backend/config/supabase.js` — ต้องมี ws transport สำหรับ Node 18
- `backend/controllers/uploadController.js` — upload menu image + QR image

## Features ที่ทำเสร็จแล้ว ✅
- [x] ฟอร์มกรอกที่อยู่ + map PIN picker
- [x] เมนูพร้อม options + ตะกร้า + checkout
- [x] ชำระเงินสด / โอน + upload slip (พร้อม slip amount validation)
- [x] ติดตามออเดอร์ real-time (Socket.io)
- [x] ประวัติการสั่งซื้อ (auto-load เบอร์จาก localStorage)
- [x] Admin dashboard + real-time orders
- [x] Admin settings (ชื่อร้าน, ค่าส่ง, เบอร์, LINE, บัญชีธนาคาร, QR PromptPay upload)
- [x] Admin customers page — รายชื่อลูกค้า + profile drawer + ประวัติออเดอร์
- [x] Admin menu management

## ⚠️ Notes สำคัญ
- Vercel **ไม่มี auto-deploy** — ต้องรัน `npx vercel --prod` ทุกครั้งหลัง push frontend
- backend/config/supabase.js ต้องมี `ws` package เป็น transport (Node 18)
- Cart เก็บใน React state ไม่ใช่ localStorage — refresh แล้วหาย (by design)
- settings `contact_phone=0968931933`, `contact_line=@artiwara_lb` set แล้วใน DB
