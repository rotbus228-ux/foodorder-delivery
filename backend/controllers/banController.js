const supabase = require('../config/supabase');

/* ── normalize เบอร์ (เก็บเฉพาะตัวเลข) ───────────────────────── */
function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '');
}

/* ── GET /api/admin/banned-phones (admin) ───────────────────── */
async function listBanned(req, res) {
  try {
    const { data, error } = await supabase
      .from('banned_phones').select('*').order('banned_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[listBanned]', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/* ── POST /api/admin/ban-phone (admin) ──────────────────────── */
async function banPhone(req, res) {
  const phone  = normalizePhone(req.body.phone);
  const reason = (req.body.reason || '').trim() || null;
  if (!phone) return res.status(400).json({ success: false, message: 'กรุณาระบุเบอร์โทร' });

  try {
    const { data, error } = await supabase
      .from('banned_phones')
      .upsert({ phone, reason, banned_at: new Date() }, { onConflict: 'phone' })
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[banPhone]', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/* ── DELETE /api/admin/ban-phone/:phone (admin) ─────────────── */
async function unbanPhone(req, res) {
  const phone = normalizePhone(req.params.phone);
  if (!phone) return res.status(400).json({ success: false, message: 'เบอร์ไม่ถูกต้อง' });
  try {
    const { error } = await supabase.from('banned_phones').delete().eq('phone', phone);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[unbanPhone]', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/* ── GET /api/delivery/check-ban?phone=xxx (public) ─────────── */
async function checkBan(req, res) {
  const phone = normalizePhone(req.query.phone);
  if (!phone) return res.json({ success: true, banned: false });
  try {
    const { data } = await supabase
      .from('banned_phones').select('phone, reason, banned_at').eq('phone', phone).maybeSingle();
    res.json({ success: true, banned: !!data, info: data || null });
  } catch (err) {
    console.error('[checkBan]', err);
    res.json({ success: true, banned: false });
  }
}

/* ── helper: ใช้ใน createDeliveryOrder ──────────────────────── */
async function isPhoneBanned(phone) {
  const norm = normalizePhone(phone);
  if (!norm) return false;
  const { data } = await supabase
    .from('banned_phones').select('phone').eq('phone', norm).maybeSingle();
  return !!data;
}

module.exports = { listBanned, banPhone, unbanPhone, checkBan, isPhoneBanned };
