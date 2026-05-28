const express = require('express')
const jwt     = require('jsonwebtoken')
const crypto  = require('crypto')
const router  = express.Router()

// ถ้าไม่ได้ set JWT_SECRET ใน env → ใช้ derived secret ที่แข็งแกร่งกว่า fallback เดิม
// (บวก SUPABASE_URL ทำให้ไม่ซ้ำกับ server อื่น)
const _DEFAULT_SECRET = crypto
  .createHmac('sha256', process.env.SUPABASE_URL || 'foodorder-delivery-2024')
  .update('rotbus228-admin-secret-v1')
  .digest('hex')

const JWT_SECRET     = process.env.JWT_SECRET     || _DEFAULT_SECRET
const ADMIN_EMAILS   = (process.env.ADMIN_EMAILS  || 'rotbus228@gmail.com').split(',').map(e => e.trim())
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1214'

if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY] ⚠️  JWT_SECRET not set — using derived secret. Set JWT_SECRET in Railway for production.')
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[SECURITY] ⚠️  ADMIN_PASSWORD not set — using default. Set ADMIN_PASSWORD in Railway for production.')
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' })
  }

  const emailOk    = ADMIN_EMAILS.includes(email.toLowerCase().trim())
  const passwordOk = password === ADMIN_PASSWORD

  // ไม่บอกว่าผิดตรงไหน (กันไม่ให้ enumerate email/password แยกกัน)
  if (!emailOk || !passwordOk) {
    return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  }

  const token = jwt.sign(
    { email: email.toLowerCase().trim(), isAdmin: true },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
  return res.json({ success: true, token, email })
})

module.exports = router
