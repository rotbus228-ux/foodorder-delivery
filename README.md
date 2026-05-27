# 🛵 Foodorder Delivery — ระบบสั่งอาหาร Delivery

## Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js + Socket.io
- **Database**: Supabase (PostgreSQL)
- **Notifications**: Telegram Bot

---

## 🚀 ขั้นตอนติดตั้ง

### STEP 1 — สร้าง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com) → New Project
2. ตั้งชื่อ Project **เป็นชื่อร้าน**
3. ไปที่ **SQL Editor** → รัน SQL ทั้งหมดใน `supabase-setup.sql`
4. ไปที่ **Storage** → สร้าง bucket 2 อัน (Public):
   - `payment-slips`
   - `menu-images`
5. เก็บ **Project URL** และ **service_role key** (Settings → API)

---

### STEP 2 — Backend

```bash
cd backend
cp .env.example .env
# แก้ไขไฟล์ .env
npm install
npm run dev
```

**`.env` ที่ต้องกรอก:**
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
ADMIN_EMAILS=your@email.com
ADMIN_PASSWORD=your_password
JWT_SECRET=random_string_32_chars
TELEGRAM_BOT_TOKEN=123456789:AABBccdd...
TELEGRAM_CHAT_ID=-1001234567890
```

---

### STEP 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

สร้างไฟล์ `.env.local` สำหรับ dev:
```env
VITE_API_URL=http://localhost:5000
```

---

## 📁 หน้าต่างๆ

| URL | หน้า |
|-----|------|
| `/` | Landing Page |
| `/order` | สั่งอาหาร Delivery |
| `/track/:id` | ติดตามออเดอร์ |
| `/admin/login` | เข้าสู่ระบบ Admin |
| `/admin` | Admin Delivery Dashboard |
| `/admin/menu` | จัดการเมนู |

---

## 📊 สถานะออเดอร์

```
เงินสด:  pending → preparing → out_for_delivery → delivered | cancelled
โอนเงิน: pending_payment → pending → preparing → out_for_delivery → delivered | cancelled
```

---

## 🔔 Socket.io Events

| Event | Direction | ใช้ตอน |
|-------|-----------|--------|
| `new_delivery_order` | server → admin | มีออเดอร์ใหม่ / อัปโหลดสลีปแล้ว |
| `delivery_status_update` | server → client | admin อัปเดตสถานะ |
| `menu_availability_update` | server → all | เปิด/ปิดเมนู |
