// Foodorder Delivery Backend — v3 (Dockerfile build)
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const supabase   = require('./config/supabase');
const apiRoutes  = require('./routes/api');
const authRoutes = require('./routes/auth');

const app    = express();
const server = http.createServer(app);

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

/* ── Middleware ── */
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' }));

/* ── Start ── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀  Server   → http://localhost:${PORT}`);
  console.log(`📡  Socket.io ready`);
  console.log(`🌐  CORS     → *.vercel.app + ${process.env.FRONTEND_URL || 'localhost'}`);

  const { error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
  if (error) console.error(`❌  Supabase → FAILED: ${error.message}`);
  else console.log(`✅  Supabase → connected`);
});
