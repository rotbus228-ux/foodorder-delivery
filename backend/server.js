// Foodorder Delivery Backend — v4 (Nixpacks + error logging)
console.log('[Boot] Node version:', process.version);
console.log('[Boot] PORT env:', process.env.PORT);
console.log('[Boot] NODE_ENV:', process.env.NODE_ENV);

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  // Log only — do NOT exit. Some modules (Supabase, etc.) may fire
  // rejections that are harmless but would crash the server if we exit.
  console.error('[WARN] unhandledRejection (non-fatal):', reason);
});

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const supabase   = require('./config/supabase');
const apiRoutes  = require('./routes/api');
const authRoutes = require('./routes/auth');

const app    = express();
const server = http.createServer(app);

server.on('error', (err) => {
  console.error('[FATAL] server.on(error):', err.code, err.message);
  process.exit(1);
});

/* ── CORS: allow localhost + all *.vercel.app + FRONTEND_URL env ── */
const allowOrigin = (origin, cb) => {
  if (!origin) return cb(null, true);
  const allowed = (process.env.FRONTEND_URL || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (
    allowed.includes(origin) ||
    /\.vercel\.app$/.test(origin) ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1')
  ) return cb(null, true);
  cb(new Error('Not allowed by CORS'));
};

const corsOptions = {
  origin:  allowOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
};

const io = new Server(server, { cors: corsOptions });
app.set('io', io);

/* ── Socket.io ── */
io.on('connection', (socket) => {
  console.log(`[Socket.io] connected    : ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Socket.io] disconnected : ${socket.id}`));
});

/* ── Rate Limiters ── */
// Login: max 10 ครั้งต่อ 15 นาที (ป้องกัน brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ใน 15 นาที' },
});
// Order creation: max 30 ออเดอร์ต่อนาที ต่อ IP
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'ส่งคำขอมากเกินไป กรุณารอสักครู่' },
});
// General API: max 200 requests/min per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'ส่ง request มากเกินไป กรุณารอสักครู่' },
});

/* ── Middleware ── */
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/* ── Routes ── */
app.get('/',       (req, res) => res.json({ message: 'Delivery Server is running', status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health/db', async (req, res) => {
  try {
    const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: 'ok', db: 'supabase connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/delivery/orders', orderLimiter);
app.use('/api', generalLimiter, apiRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' }));

/* ── Start ── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  try {
    console.log(`🚀  Server   → http://localhost:${PORT}`);
    console.log(`📡  Socket.io ready`);
    console.log(`🌐  CORS     → *.vercel.app + ${process.env.FRONTEND_URL || 'localhost'}`);

    const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
    if (error) console.error(`❌  Supabase → FAILED: ${error.message}`);
    else console.log(`✅  Supabase → connected`);
  } catch (err) {
    console.error('[FATAL] listen callback threw:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});
