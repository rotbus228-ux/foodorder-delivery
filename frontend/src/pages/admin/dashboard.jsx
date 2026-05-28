import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { getAuthHeaders, adminLogout, handleAuthError } from '../../utils/adminAuth'

const _BASE      = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API_BASE   = `${_BASE}/api`
const SOCKET_URL = _BASE

/* ── Status config (3 ขั้นตอนหลัก + pending_payment) ──────────── */
const STATUS_CONFIG = {
  pending_payment:  { label: 'รอตรวจสลีป',   icon: '💳', color: 'bg-blue-100 text-blue-700     border-blue-200',    pulse: true  },
  pending:          { label: 'สั่งซื้อแล้ว',  icon: '🔔', color: 'bg-orange-100 text-orange-700 border-orange-200',  pulse: true  },
  out_for_delivery: { label: 'กำลังไปส่ง',    icon: '🛵', color: 'bg-violet-100 text-violet-700 border-violet-200',  pulse: true  },
  delivered:        { label: 'เสร็จสิ้น',     icon: '✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', pulse: false },
  cancelled:        { label: 'ยกเลิก',        icon: '❌', color: 'bg-stone-100 text-stone-500   border-stone-200',   pulse: false },
}

const NEXT_STATUS = {
  pending_payment:  [{ next: 'pending',          label: '✅ ยืนยันสลีป → รับออเดอร์', primary: true  }, { next: 'cancelled', label: '❌ ปฏิเสธ', primary: false }],
  pending:          [{ next: 'out_for_delivery', label: '🛵 ส่งออกไปแล้ว',            primary: true  }, { next: 'cancelled', label: '❌ ยกเลิก', primary: false }],
  out_for_delivery: [{ next: 'delivered',        label: '✅ ส่งถึงแล้ว',               primary: true  }],
  delivered:        [],
  cancelled:        [],
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function elapsed(dateStr) {
  if (!dateStr) return ''
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (mins < 1)  return 'เพิ่งสั่ง'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  return `${Math.floor(mins / 60)} ชม. ${mins % 60} นาที`
}

function playAlert() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const play = (freq, start, dur) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      gain.gain.setValueAtTime(0.35, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur)
    }
    play(880, 0, 0.12); play(1100, 0.15, 0.12); play(1320, 0.30, 0.18)
  } catch (_) {}
}

/* ── SlipModal ──────────────────────────────────────────────────── */
function SlipModal({ order, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-black text-base">💳 สลีปโอนเงิน #{order.id}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {order.payment_slip_url ? (
            <>
              <img src={order.payment_slip_url} alt="payment slip"
                className="w-full max-h-96 object-contain rounded-2xl border border-stone-200 bg-stone-50" />
              <a href={order.payment_slip_url} target="_blank" rel="noreferrer"
                className="block text-center text-sm font-bold text-blue-600 hover:underline">
                ↗ เปิดในแท็บใหม่
              </a>
            </>
          ) : (
            <div className="py-10 text-center text-stone-400">
              <p className="text-3xl">📭</p>
              <p className="text-sm font-bold mt-2">ยังไม่มีสลีป</p>
            </div>
          )}
          <div className="bg-blue-50 rounded-2xl px-4 py-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">ยอดสั่ง</span><span className="font-black text-stone-800">฿{Number(order.total_price).toLocaleString()}</span></div>
            {order.payment_amount && (
              <div className="flex justify-between"><span className="text-stone-500">ยอดที่โอน</span><span className="font-black text-blue-700">฿{Number(order.payment_amount).toLocaleString()}</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── OrderCard ──────────────────────────────────────────────────── */
function OrderCard({ order, isNew, onAction, isLoading, onSlipView }) {
  const sc         = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const nextActions = NEXT_STATUS[order.status] || []
  const waitMins   = Math.floor((Date.now() - new Date(order.created_at)) / 60000)
  const urgency    = waitMins >= 15 ? 'critical' : waitMins >= 7 ? 'warning' : 'normal'
  const urgencyStyle = {
    normal:   'border-stone-100',
    warning:  'border-yellow-300 ring-1 ring-yellow-200/50',
    critical: 'border-rose-300 ring-1 ring-rose-200/50',
  }[urgency]

  return (
    <div className={`group bg-white rounded-2xl shadow-sm border-l-4 ${urgencyStyle} overflow-hidden transition-all duration-300 ${isNew ? 'ring-2 ring-orange-400' : ''}`}>
      {/* Card Header */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-stone-900 text-base">#{order.id}</span>
            {isNew && <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse">NEW</span>}
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${sc.color} ${sc.pulse ? 'animate-pulse' : ''}`}>
              {sc.icon} {sc.label}
            </span>
            {urgency !== 'normal' && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${urgency === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-yellow-100 text-yellow-700'}`}>
                ⏱ {waitMins}น.
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-stone-500">
            <span>👤 {order.customer_name}</span>
            <span>📞 {order.customer_phone}</span>
            <span className="text-[10px]">{elapsed(order.created_at)}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-black text-orange-600">฿{Number(order.total_price).toLocaleString()}</p>
          <p className="text-[10px] text-stone-400">{order.payment_method === 'transfer' ? '💳 โอน' : '💵 เงินสด'}</p>
        </div>
      </div>

      {/* ที่อยู่ */}
      <div className="px-4 py-2 bg-stone-50 border-y border-stone-100">
        <p className="text-xs text-stone-600 flex items-start gap-1.5">
          <span className="flex-shrink-0 mt-0.5">📍</span>
          <span className="line-clamp-2">{order.delivery_address}</span>
        </p>
        {order.note && <p className="text-xs text-amber-600 mt-1 flex items-start gap-1.5"><span>📝</span><span>{order.note}</span></p>}
      </div>

      {/* รายการอาหาร */}
      <div className="px-4 py-2.5 space-y-1">
        {(order.items || []).map((item, i) => (
          <div key={i} className="flex items-baseline gap-1.5 text-xs text-stone-600">
            <span className="font-bold text-stone-800">{item.name}</span>
            <span className="text-stone-400">×{item.quantity}</span>
            {Array.isArray(item.options) && item.options.length > 0 && (
              <span className="text-orange-500 font-semibold">· {item.options.map(o => o.label || o.name).join(', ')}</span>
            )}
            {item.note && <span className="text-rose-500 font-bold">[📝 {item.note}]</span>}
          </div>
        ))}
      </div>

      {/* Actions */}
      {(nextActions.length > 0 || order.payment_method === 'transfer') && (
        <div className="px-4 pb-3.5 flex gap-2 flex-wrap">
          {order.payment_method === 'transfer' && (
            <button onClick={() => onSlipView(order)}
              className="flex-shrink-0 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors active:scale-95">
              🧾 ดูสลีป
            </button>
          )}
          {nextActions.map(action => (
            <button key={action.next}
              onClick={() => onAction(order.id, action.next)}
              disabled={isLoading}
              className={`flex-1 min-w-fit py-2.5 px-3 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${action.primary
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-200 hover:shadow-lg'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {isLoading ? '⏳' : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── SettingsModal ──────────────────────────────────────────────── */
function SettingsModal({ onClose }) {
  const FIELDS = [
    { key: 'restaurant_name',        label: '🏪 ชื่อร้าน',        placeholder: 'ร้านอาหารอร่อย',  type: 'text'   },
    { key: 'delivery_fee',           label: '🛵 ค่าส่ง (บาท)',     placeholder: '30',               type: 'number' },
    { key: 'contact_phone',          label: '📞 เบอร์โทรร้าน',     placeholder: '0891234567',       type: 'tel'    },
    { key: 'contact_line',           label: '💬 LINE ID ร้าน',     placeholder: '@myshop',          type: 'text'   },
    { key: 'payment_bank_name',      label: '🏦 ชื่อธนาคาร',       placeholder: 'ธนาคารกสิกรไทย',  type: 'text'   },
    { key: 'payment_account_number', label: '💳 เลขบัญชี',         placeholder: '000-0-00000-0',   type: 'text'   },
    { key: 'payment_account_name',   label: '👤 ชื่อบัญชี',        placeholder: 'นาย...',           type: 'text'   },
    { key: 'payment_qr_url',         label: '📷 QR Code URL',       placeholder: 'https://...',      type: 'url'    },
  ]
  const [values,  setValues]  = useState({})
  const [loadingS, setLoadingS] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    axios.get(`${API_BASE}/settings`, { headers: getAuthHeaders() })
      .then(res => setValues(res.data?.data || {}))
      .catch(() => {})
      .finally(() => setLoadingS(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await Promise.all(
        FIELDS.map(f =>
          axios.put(`${API_BASE}/settings/${f.key}`, { value: values[f.key] || '' }, { headers: getAuthHeaders() })
        )
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (_) { alert('บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden">
        <div className="sm:hidden flex justify-center pt-3"><div className="w-12 h-1.5 bg-stone-300 rounded-full" /></div>
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-black text-base">⚙️ ตั้งค่าร้าน</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3" style={{ maxHeight: 'calc(92vh - 130px)' }}>
          {loadingS ? (
            <div className="py-10 text-center text-stone-400 font-bold">กำลังโหลด...</div>
          ) : FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5 block">{f.label}</label>
              <input type={f.type} value={values[f.key] || ''}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 focus:outline-none transition-all" />
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-stone-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-600 font-bold text-sm hover:bg-stone-200 transition-colors">ยกเลิก</button>
          <button onClick={save} disabled={saving || loadingS}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm shadow-lg shadow-orange-200/50 active:scale-95 transition-all disabled:opacity-60">
            {saved ? '✅ บันทึกแล้ว!' : saving ? '⏳...' : '💾 บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Admin Delivery Dashboard
══════════════════════════════════════════════════════════════════ */
export default function AdminDeliveryDashboard() {
  const navigate     = useNavigate()
  const [orders,     setOrders]     = useState([])
  const [stats,      setStats]      = useState({ totalOrders: 0, totalRevenue: 0, pending: 0, delivered: 0 })
  const [loading,    setLoading]    = useState(true)
  const [newIds,     setNewIds]     = useState(new Set())
  const [actionLoading, setActionLoading] = useState(null)
  const [connected,  setConnected]  = useState(false)
  const [slipOrder,  setSlipOrder]  = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  // ── Filter ──
  const [filterStatus, setFilterStatus] = useState('active')  // 'active' | 'all' | status key
  const [dateFilter,   setDateFilter]   = useState('')

  const socketRef = useRef(null)

  /* ── Fetch ── */
  const fetchOrders = useCallback(async () => {
    try {
      const params = {}
      if (dateFilter) params.date = dateFilter
      const res = await axios.get(`${API_BASE}/delivery/orders`, { headers: getAuthHeaders(), params })
      setOrders(res.data?.data ?? [])
    } catch (err) {
      handleAuthError(err, navigate)
    } finally {
      setLoading(false)
    }
  }, [navigate, dateFilter])

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats/today`, { headers: getAuthHeaders() })
      setStats(res.data?.data ?? {})
    } catch (_) {}
  }, [])

  useEffect(() => { fetchOrders(); fetchStats() }, [fetchOrders, fetchStats])

  /* ── Socket ── */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('new_delivery_order', (order) => {
      playAlert()
      setOrders(prev => {
        const exists = prev.some(o => o.id === order.id)
        if (exists) return prev.map(o => o.id === order.id ? order : o)
        return [order, ...prev]
      })
      setNewIds(prev => new Set(prev).add(order.id))
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(order.id); return n }), 8000)
      fetchStats()
    })

    socket.on('delivery_status_update', ({ order_id, status, order: updatedOrder }) => {
      setOrders(prev => prev.map(o =>
        o.id === order_id ? (updatedOrder || { ...o, status }) : o
      ))
      fetchStats()
    })

    return () => socket.disconnect()
  }, [fetchStats])

  /* ── Update Status ── */
  const handleAction = useCallback(async (orderId, newStatus) => {
    setActionLoading(orderId)
    try {
      await axios.patch(
        `${API_BASE}/delivery/orders/${orderId}/status`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      )
    } catch (err) {
      handleAuthError(err, navigate)
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(null)
    }
  }, [navigate])

  /* ── Filtered orders ── */
  const ACTIVE_STATUSES = ['pending_payment', 'pending', 'out_for_delivery']
  const displayed = orders.filter(o => {
    if (filterStatus === 'active') return ACTIVE_STATUSES.includes(o.status)
    if (filterStatus === 'all')    return true
    return o.status === filterStatus
  })

  /* ── Logout ── */
  const logout = () => { adminLogout(); navigate('/admin/login') }

  return (
    <div className="min-h-screen bg-stone-50">

      {slipOrder    && <SlipModal     order={slipOrder} onClose={() => setSlipOrder(null)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-orange-500 via-orange-600 to-rose-600 text-white shadow-xl">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-xl">🛵</div>
            <div className="min-w-0">
              <h1 className="font-black text-base leading-tight truncate">Delivery Dashboard</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-300 animate-pulse' : 'bg-white/40'}`} />
                <span className="text-[10px] text-white/80">{connected ? 'Real-time' : 'ออฟไลน์'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/menu"
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors">
              🍽️ เมนู
            </Link>
            <Link to="/admin/customers"
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors">
              👥 ลูกค้า
            </Link>
            <button onClick={() => setShowSettings(true)}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors">
              ⚙️ ตั้งค่า
            </button>
            <button onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors">
              ออก
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'ออเดอร์วันนี้', value: stats.totalOrders, icon: '📋', color: 'text-orange-600' },
            { label: 'รายได้วันนี้',  value: `฿${Number(stats.totalRevenue || 0).toLocaleString()}`, icon: '💰', color: 'text-emerald-600' },
            { label: 'รอดำเนินการ',   value: stats.pending,     icon: '⏳', color: 'text-amber-600' },
            { label: 'ส่งสำเร็จ',     value: stats.delivered,   icon: '✅', color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-stone-100 px-4 py-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl">{s.icon}</span>
                <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-xs text-stone-500 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            { key: 'active',          label: '🔥 กำลังดำเนินการ' },
            { key: 'all',             label: '📋 ทั้งหมด' },
            { key: 'pending_payment', label: '💳 รอสลีป' },
            { key: 'pending',         label: '🔔 สั่งซื้อแล้ว' },
            { key: 'out_for_delivery',label: '🛵 กำลังส่ง' },
            { key: 'delivered',       label: '✅ ส่งแล้ว' },
            { key: 'cancelled',       label: '❌ ยกเลิก' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-black transition-all ${filterStatus === f.key ? 'bg-orange-500 text-white shadow-md shadow-orange-300/40' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-orange-300 hover:text-orange-600'}`}>
              {f.label}
            </button>
          ))}

          <div className="flex-shrink-0 ml-auto">
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none" />
          </div>
        </div>

        {/* ── Order List ── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-36 animate-pulse border border-stone-100" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 py-16 text-center">
            <p className="text-5xl">📭</p>
            <p className="text-stone-600 font-bold mt-3">ไม่มีออเดอร์</p>
            <p className="text-stone-400 text-xs mt-1">
              {filterStatus === 'active' ? 'ยังไม่มีออเดอร์ที่รอดำเนินการ' : 'ไม่มีออเดอร์ในสถานะนี้'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                isNew={newIds.has(order.id)}
                onAction={handleAction}
                isLoading={actionLoading === order.id}
                onSlipView={setSlipOrder}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
