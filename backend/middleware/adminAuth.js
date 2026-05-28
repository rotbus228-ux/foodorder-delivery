const jwt    = require('jsonwebtoken')
const crypto = require('crypto')

// ต้อง consistent กับ routes/auth.js
const _DEFAULT_SECRET = crypto
  .createHmac('sha256', process.env.SUPABASE_URL || 'foodorder-delivery-2024')
  .update('rotbus228-admin-secret-v1')
  .digest('hex')

const JWT_SECRET   = process.env.JWT_SECRET   || _DEFAULT_SECRET
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'rotbus228@gmail.com').split(',').map(e => e.trim())

module.exports = function adminAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' })
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET)
    if (!payload.isAdmin || !ADMIN_EMAILS.includes(payload.email)) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงส่วน Admin' })
    }
    req.admin = payload
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' })
  }
}
