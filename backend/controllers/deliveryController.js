const supabase = require('../config/supabase');
const { sendDeliveryNotification } = require('../config/telegram');

/* ── Bangkok timezone helpers (UTC+7) ───────────────────────────── */
function getBangkokDateStr() {
  // Thailand is UTC+7 — get current date in Bangkok time
  const now = new Date();
  const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return bangkokTime.toISOString().split('T')[0]; // YYYY-MM-DD in Bangkok
}

function getBangkokDayRange(dateStr) {
  // Given a YYYY-MM-DD Bangkok date, return UTC ISO start/end for Supabase query
  const start = new Date(`${dateStr}T00:00:00+07:00`).toISOString();
  const end   = new Date(`${dateStr}T23:59:59+07:00`).toISOString();
  return { start, end };
}

/* ── Validation helpers ─────────────────────────────────────────── */
const VALID_STATUSES = [
  'pending_payment', 'pending', 'preparing',
  'out_for_delivery', 'delivered', 'cancelled',
];

/* ── createDeliveryOrder ────────────────────────────────────────── */
async function createDeliveryOrder(req, res) {
  const {
    customer_name, customer_phone, delivery_address,
    note, items, payment_method = 'cash',
    location_lat, location_lng,
  } = req.body;

  if (!customer_name?.trim())                    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อลูกค้า' });
  if (customer_name.trim().length > 100)         return res.status(400).json({ success: false, message: 'ชื่อยาวเกินไป (สูงสุด 100 ตัวอักษร)' });
  if (!customer_phone?.trim())                   return res.status(400).json({ success: false, message: 'กรุณาระบุเบอร์โทร' });
  if (!/^[0-9+\-\s]{7,20}$/.test(customer_phone.trim())) return res.status(400).json({ success: false, message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' });
  if (!delivery_address?.trim())                 return res.status(400).json({ success: false, message: 'กรุณาระบุที่อยู่จัดส่ง' });
  if (delivery_address.trim().length > 500)      return res.status(400).json({ success: false, message: 'ที่อยู่ยาวเกินไป (สูงสุด 500 ตัวอักษร)' });
  if (!Array.isArray(items) || !items.length)
    return res.status(400).json({ success: false, message: 'กรุณาเลือกเมนูอย่างน้อย 1 รายการ' });
  if (items.length > 50)
    return res.status(400).json({ success: false, message: 'จำนวนรายการมากเกินไป' });
  if (!['cash', 'transfer'].includes(payment_method))
    return res.status(400).json({ success: false, message: 'วิธีชำระเงินไม่ถูกต้อง' });

  try {
    // ── ดึง delivery_fee จาก settings ──
    const { data: feeRow } = await supabase
      .from('settings').select('value').eq('key', 'delivery_fee').single();
    const delivery_fee = Number(feeRow?.value) || 30;

    // ── คำนวณ subtotal ──
    const subtotal = items.reduce((sum, item) => {
      const base  = Number(item.unit_price) || 0;
      return sum + base * (Number(item.quantity) || 1);
    }, 0);
    const total_price = subtotal + delivery_fee;

    // ── สถานะเริ่มต้น ──
    const initial_status = payment_method === 'transfer' ? 'pending_payment' : 'pending';

    // ── คำนวณเลขคิววันนี้ (เวลาไทย UTC+7) ──
    const today = getBangkokDateStr();
    const { start: todayStart } = getBangkokDayRange(today);
    const { count: todayCount } = await supabase
      .from('delivery_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);
    const daily_queue_number = (todayCount || 0) + 1;

    // ── Insert delivery_orders ──
    const { data: order, error: orderError } = await supabase
      .from('delivery_orders')
      .insert({
        customer_name:    customer_name.trim(),
        customer_phone:   customer_phone.trim(),
        delivery_address: delivery_address.trim(),
        note:             note?.trim() || null,
        subtotal,
        delivery_fee,
        total_price,
        payment_method,
        status:           initial_status,
        daily_queue_number,
        location_lat:     location_lat ? Number(location_lat) : null,
        location_lng:     location_lng ? Number(location_lng) : null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // ── Insert delivery_order_items ──
    const itemRows = items.map(item => ({
      delivery_order_id: order.id,
      menu_id:           item.menu_id || null,
      menu_name:         item.menu_name || item.name || 'ไม่ทราบชื่อ',
      quantity:          Number(item.quantity) || 1,
      unit_price:        Number(item.unit_price) || 0,
      options:           item.options || null,
      note:              item.note?.trim() || null,
    }));

    const { error: itemsError } = await supabase
      .from('delivery_order_items').insert(itemRows);
    if (itemsError) throw itemsError;

    // ── ดึง order พร้อม items ──
    const fullOrder = await getOrderById(order.id);

    // ── Socket.io emit ──
    const io = req.app.get('io');
    if (io) io.emit('new_delivery_order', fullOrder);

    // ── Telegram notification ──
    sendDeliveryNotification(fullOrder).catch(e => console.error('[Telegram]', e.message));

    res.status(201).json({ success: true, data: fullOrder });
  } catch (err) {
    console.error('[createDeliveryOrder]', err);
    res.status(500).json({ success: false, message: err.message || 'เกิดข้อผิดพลาด' });
  }
}

/* ── getDeliveryOrder (public — ลูกค้าติดตาม) ─────────────────── */
async function getDeliveryOrder(req, res) {
  const { id } = req.params;
  try {
    const order = await getOrderById(id);
    if (!order) return res.status(404).json({ success: false, message: 'ไม่พบออเดอร์' });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[getDeliveryOrder]', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

/* ── getAllDeliveryOrders (admin) ───────────────────────────────── */
async function getAllDeliveryOrders(req, res) {
  try {
    const { status, date } = req.query;
    let q = supabase
      .from('delivery_orders')
      .select('*, delivery_order_items(*)')
      .order('created_at', { ascending: false });

    if (status) q = q.eq('status', status);
    if (date) {
      const { start, end } = getBangkokDayRange(date); // treat date as Bangkok date
      q = q.gte('created_at', start).lte('created_at', end);
    }

    const { data, error } = await q;
    if (error) throw error;

    const result = (data || []).map(flatOrder);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[getAllDeliveryOrders]', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

/* ── updateDeliveryStatus (admin) ──────────────────────────────── */
async function updateDeliveryStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });

  try {
    const { error } = await supabase
      .from('delivery_orders')
      .update({ status, updated_at: new Date() })
      .eq('id', id);
    if (error) throw error;

    const order = await getOrderById(id);
    if (!order) return res.status(404).json({ success: false, message: 'ไม่พบออเดอร์' });

    const io = req.app.get('io');
    if (io) io.emit('delivery_status_update', { order_id: Number(id), status, order });

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[updateDeliveryStatus]', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

/* ── uploadPaymentSlip (public — ลูกค้าอัปโหลดสลีป) ─────────── */
async function uploadPaymentSlip(req, res) {
  const { id } = req.params;
  const { payment_amount } = req.body;

  if (!req.file) return res.status(400).json({ success: false, message: 'ไม่พบไฟล์สลีป' });

  // ตรวจ MIME type — รับเฉพาะรูปภาพ
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ success: false, message: 'ต้องเป็นไฟล์รูปภาพเท่านั้น (JPG, PNG)' });
  }

  // ตรวจว่า ID เป็นตัวเลข
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, message: 'Order ID ไม่ถูกต้อง' });
  }

  try {
    // ตรวจว่า order นี้มีอยู่จริงและเป็น transfer payment
    const { data: orderCheck, error: checkErr } = await supabase
      .from('delivery_orders')
      .select('id, payment_method, status')
      .eq('id', Number(id))
      .single();

    if (checkErr || !orderCheck) {
      return res.status(404).json({ success: false, message: 'ไม่พบออเดอร์' });
    }
    if (orderCheck.payment_method !== 'transfer') {
      return res.status(400).json({ success: false, message: 'ออเดอร์นี้ไม่ใช่การโอนเงิน' });
    }
    if (!['pending_payment', 'pending'].includes(orderCheck.status)) {
      return res.status(400).json({ success: false, message: 'ออเดอร์นี้ไม่สามารถอัปโหลดสลีปได้แล้ว' });
    }

    const ext      = req.file.originalname.split('.').pop().toLowerCase() || 'jpg';
    const filename = `slip_${id}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-slips')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('payment-slips').getPublicUrl(filename);

    const updateData = {
      payment_slip_url: urlData.publicUrl,
      updated_at: new Date(),
      status: 'pending',   // เมื่อลูกค้าส่งสลีป → เปลี่ยนจาก pending_payment → pending
    };
    if (payment_amount) updateData.payment_amount = Number(payment_amount);

    const { error: updateError } = await supabase
      .from('delivery_orders')
      .update(updateData)
      .eq('id', id);
    if (updateError) throw updateError;

    const order = await getOrderById(id);
    const io = req.app.get('io');
    if (io) io.emit('new_delivery_order', order);   // แจ้ง admin ว่ามีสลีปใหม่

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[uploadPaymentSlip]', err);
    res.status(500).json({ success: false, message: err.message || 'อัปโหลดไม่สำเร็จ' });
  }
}

/* ── getTodayStats (admin) ──────────────────────────────────────── */
async function getTodayStats(req, res) {
  try {
    const today = getBangkokDateStr(); // เวลาไทย UTC+7
    const { start, end } = getBangkokDayRange(today);

    const { data, error } = await supabase
      .from('delivery_orders')
      .select('total_price, status')
      .gte('created_at', start)
      .lte('created_at', end);

    if (error) throw error;

    const orders = data || [];
    const totalOrders  = orders.length;
    const totalRevenue = orders
      .filter(o => !['cancelled'].includes(o.status))
      .reduce((s, o) => s + Number(o.total_price || 0), 0);
    const pending  = orders.filter(o => ['pending', 'pending_payment'].includes(o.status)).length;
    const delivered = orders.filter(o => o.status === 'delivered').length;

    res.json({ success: true, data: { totalOrders, totalRevenue, pending, delivered } });
  } catch (err) {
    console.error('[getTodayStats]', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

/* ── Internal helpers ───────────────────────────────────────────── */
async function getOrderById(id) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*, delivery_order_items(*)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return flatOrder(data);
}

function flatOrder(order) {
  return {
    ...order,
    items: (order.delivery_order_items || []).map(item => ({
      id:         item.id,
      menu_id:    item.menu_id,
      name:       item.menu_name,
      quantity:   item.quantity,
      unit_price: Number(item.unit_price),
      options:    item.options || [],
      note:       item.note || '',
    })),
    delivery_order_items: undefined,
    subtotal:             Number(order.subtotal),
    delivery_fee:         Number(order.delivery_fee),
    total_price:          Number(order.total_price),
    daily_queue_number:   order.daily_queue_number || null,
    location_lat:         order.location_lat ? Number(order.location_lat) : null,
    location_lng:         order.location_lng ? Number(order.location_lng) : null,
  };
}

/* ── getOrdersByPhone (public — ประวัติออเดอร์ลูกค้า) ────────────── */
async function getOrdersByPhone(req, res) {
  const { phone } = req.query;
  if (!phone?.trim()) return res.status(400).json({ success: false, message: 'กรุณาระบุเบอร์โทร' });

  try {
    const { data, error } = await supabase
      .from('delivery_orders')
      .select('*, delivery_order_items(*)')
      .eq('customer_phone', phone.trim())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data: (data || []).map(flatOrder) });
  } catch (err) {
    console.error('[getOrdersByPhone]', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

module.exports = {
  createDeliveryOrder,
  getDeliveryOrder,
  getAllDeliveryOrders,
  updateDeliveryStatus,
  uploadPaymentSlip,
  getTodayStats,
  getOrdersByPhone,
};
