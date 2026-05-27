const axios = require('axios');
require('dotenv').config();

/**
 * ส่งแจ้งเตือน Delivery Order ใหม่ผ่าน Telegram Bot
 * @param {Object} order - ข้อมูลออเดอร์ delivery (ผ่าน flatOrder แล้ว)
 */
async function sendDeliveryNotification(order) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[Telegram] ⚠️  TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID ยังไม่ได้ตั้งค่า — ข้ามการแจ้งเตือน');
    return;
  }

  // ── เวลาปัจจุบัน (Bangkok) ──────────────────────────────────────
  const now = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour:     '2-digit',
    minute:   '2-digit',
  });

  // ── รายการอาหาร ──────────────────────────────────────────────────
  const itemLines = (order.items || []).map(item => {
    const name    = item.name || 'ไม่ทราบชื่อ';
    const qty     = Number(item.quantity) || 1;
    const price   = Number(item.unit_price) || 0;
    const opts    = Array.isArray(item.options) && item.options.length
      ? `  🔸 ตัวเลือก: ${item.options.map(o => o.label || o.name).join(', ')}\n` : '';
    const note    = item.note?.trim() ? `  📝 หมายเหตุ: ${item.note.trim()}\n` : '';
    return `• 🍴 ${name} × ${qty}  (฿${price.toFixed(0)})\n${opts}${note}`;
  }).join('\n');

  // ── วิธีชำระ ─────────────────────────────────────────────────────
  const payLabel = order.payment_method === 'transfer'
    ? '💳 โอนเงิน [รอตรวจสลีป]'
    : '💵 เงินสด (ชำระปลายทาง)';

  const message =
    `🛵 ออเดอร์ Delivery ใหม่! #${order.id}\n` +
    `----------------------------------\n` +
    `👤 ชื่อ: ${order.customer_name}\n` +
    `📞 เบอร์: ${order.customer_phone}\n` +
    `📍 ที่อยู่: ${order.delivery_address}\n` +
    (order.note ? `📝 หมายเหตุ: ${order.note}\n` : '') +
    `----------------------------------\n` +
    `🍽️ รายการอาหาร:\n${itemLines}\n` +
    `----------------------------------\n` +
    `💰 ค่าอาหาร:  ฿${Number(order.subtotal).toFixed(0)}\n` +
    `🚚 ค่าส่ง:    ฿${Number(order.delivery_fee).toFixed(0)}\n` +
    `✅ ยอดรวม:   ฿${Number(order.total_price).toFixed(0)}\n` +
    `${payLabel}\n` +
    `----------------------------------\n` +
    `⏱️ เวลาสั่ง: ${now} น.`;

  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: CHAT_ID,
    text:    message,
  });

  console.log(`[Telegram] ✅ แจ้งเตือน Delivery #${order.id} สำเร็จ`);
}

/* เพื่อ backward compat กับโค้ดเก่า (ถ้ามี) */
async function sendOrderNotification(orderData, tableNumber, items) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) return;

  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
  const itemLines = (items || []).map(i => `• ${i.name} × ${i.quantity}`).join('\n');
  const msg = `📝 ออเดอร์ใหม่ (โต๊ะ ${tableNumber})\n${itemLines}\n💰 ฿${Number(orderData.total_price).toFixed(0)}\n⏱️ ${now}`;
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
  await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: CHAT_ID, text: msg });
}

module.exports = { sendDeliveryNotification, sendOrderNotification };
