import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getAuthHeaders, adminLogout, handleAuthError } from '../../utils/adminAuth'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

const STATUS_CONFIG = {
  pending_payment:  { label: 'รอตรวจสลีป',  icon: '💳', color: 'bg-blue-100 text-blue-700 border-blue-200'      },
  pending:          { label: 'สั่งซื้อแล้ว', icon: '🔔', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  out_for_delivery: { label: 'กำลังไปส่ง',   icon: '🛵', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  delivered:        { label: 'เสร็จสิ้น',    icon: '✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200'},
  cancelled:        { label: 'ยกเลิก',       icon: '❌', color: 'bg-stone-100 text-stone-500 border-stone-200'    },
}

/* ── parse timestamp as UTC (same as dashboard) ──────────────────── */
function parseUTC(dateStr) {
  if (!dateStr) return new Date()
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(dateStr)) return new Date(dateStr + 'Z')
  return new Date(dateStr)
}

function formatDateTime(dateStr) {
  return parseUTC(dateStr).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ── SlipCard ─────────────────────────────────────────────────────── */
function SlipCard({ order, adminName, onViewSlip }) {
  const sc        = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const mismatch  = order.payment_name_mismatch
  const slipName  = order.payment_slip_name || ''
  const hasSlip   = !!order.payment_slip_url
  const isTransfer = order.payment_method === 'transfer'

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${mismatch ? 'border-red-300 ring-1 ring-red-200' : 'border-stone-100'}`}>
      <div className="flex gap-0">

        {/* ── สลีป thumbnail ── */}
        {isTransfer && (
          <div className="flex-shrink-0 w-28 sm:w-36">
            {hasSlip ? (
              <button onClick={() => onViewSlip(order)}
                className="relative w-full h-full min-h-[120px] group overflow-hidden bg-stone-50">
                <img
                  src={order.payment_slip_url}
                  alt="slip"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white font-black text-xs bg-black/50 px-2 py-1 rounded-lg transition-opacity">
                    ดูสลีป
                  </span>
                </div>
                {mismatch && (
                  <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    ⚠️ ชื่อ
                  </div>
                )}
              </button>
            ) : (
              <div className="w-full h-full min-h-[120px] bg-stone-100 flex flex-col items-center justify-center gap-1 text-stone-400">
                <span className="text-2xl">📭</span>
                <p className="text-[10px] font-bold">ยังไม่มีสลีป</p>
              </div>
            )}
          </div>
        )}

        {/* ── ข้อมูล ── */}
        <div className="flex-1 min-w-0 p-4 space-y-2.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-stone-900 text-sm">#{order.id}</span>
              {order.daily_queue_number && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                  คิว {order.daily_queue_number}
                </span>
              )}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${sc.color}`}>
                {sc.icon} {sc.label}
              </span>
              {mismatch && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  ⚠️ ชื่อไม่ตรง
                </span>
              )}
            </div>
            <p className="font-black text-red-700 text-sm flex-shrink-0">
              ฿{Number(order.total_price).toLocaleString()}
            </p>
          </div>

          {/* ลูกค้า */}
          <div className="text-xs text-stone-600 space-y-0.5">
            <p className="font-bold text-stone-800">{order.customer_name} · {order.customer_phone}</p>
            <p className="text-stone-400 text-[10px]">{formatDateTime(order.created_at)}</p>
            <p className="text-stone-500 line-clamp-1">📍 {order.delivery_address}</p>
          </div>

          {/* รายการอาหาร */}
          <p className="text-xs text-stone-500 line-clamp-2">
            {(order.items || []).map(i => `${i.name} ×${i.quantity}`).join(', ')}
          </p>

          {/* การชำระเงิน */}
          <div className="pt-1 border-t border-stone-100 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span>{isTransfer ? '💳 โอนเงิน' : '💵 เงินสด'}</span>
              {isTransfer && order.payment_amount && (
                <span className={`font-black ${Number(order.payment_amount) === Number(order.total_price) ? 'text-emerald-700' : 'text-red-700'}`}>
                  โอนมา ฿{Number(order.payment_amount).toLocaleString()}
                  {Number(order.payment_amount) !== Number(order.total_price) ? ' ⚠️' : ' ✓'}
                </span>
              )}
            </div>

            {/* Name verification */}
            {isTransfer && (
              <div className="flex items-center gap-2 flex-wrap">
                {slipName ? (
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black ${mismatch ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {mismatch ? '⚠️' : '✅'}
                    <span>ชื่อในสลีป: <span className="font-black">{slipName}</span></span>
                    {adminName && <span className="text-stone-400 font-normal">/ ร้าน: {adminName}</span>}
                  </div>
                ) : (
                  <span className="text-[10px] text-stone-400 font-bold">— ไม่ได้กรอกชื่อบัญชีปลายทาง</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── SlipViewModal ────────────────────────────────────────────────── */
function SlipViewModal({ order, adminName, onClose }) {
  if (!order) return null
  const mismatch = order.payment_name_mismatch
  const slipName = order.payment_slip_name || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className={`px-5 py-4 flex items-center justify-between ${mismatch ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}>
          <div>
            <h2 className="text-white font-black text-base">💳 สลีป #{order.id}</h2>
            {mismatch && <p className="text-red-100 text-xs mt-0.5">⚠️ ชื่อไม่ตรง — ตรวจสอบด้วยตนเอง</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {order.payment_slip_url ? (
            <>
              <img src={order.payment_slip_url} alt="payment slip"
                className="w-full max-h-96 object-contain rounded-2xl border border-stone-200 bg-stone-50" />
              <a href={order.payment_slip_url} target="_blank" rel="noreferrer"
                className="block text-center text-sm font-bold text-blue-600 hover:underline">↗ เปิดในแท็บใหม่</a>
            </>
          ) : (
            <div className="py-10 text-center text-stone-400">
              <p className="text-3xl">📭</p><p className="text-sm font-bold mt-2">ยังไม่มีสลีป</p>
            </div>
          )}

          {/* Name check */}
          {slipName && (
            <div className={`rounded-2xl px-4 py-3 space-y-2 text-sm border ${mismatch ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">ตรวจสอบชื่อบัญชี</p>
              <div className="flex justify-between"><span className="text-stone-500 text-xs">ชื่อในสลีป</span>
                <span className={`font-black ${mismatch ? 'text-red-700' : 'text-emerald-700'}`}>{slipName}</span>
              </div>
              {adminName && (
                <div className="flex justify-between"><span className="text-stone-500 text-xs">ชื่อบัญชีร้าน</span>
                  <span className="font-black text-stone-800">{adminName}</span>
                </div>
              )}
              <div className={`text-xs font-black text-center py-1 rounded-xl ${mismatch ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {mismatch ? '⚠️ ชื่อไม่ตรง — ตรวจสอบด้วยตนเอง' : '✅ ชื่อตรงกัน'}
              </div>
            </div>
          )}
          {!slipName && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-400 font-bold text-center">
              ลูกค้าไม่ได้กรอกชื่อบัญชีปลายทาง
            </div>
          )}

          <div className="bg-blue-50 rounded-2xl px-4 py-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">ยอดสั่ง</span>
              <span className="font-black text-stone-800">฿{Number(order.total_price).toLocaleString()}</span>
            </div>
            {order.payment_amount && (
              <div className="flex justify-between">
                <span className="text-stone-500">ยอดที่โอน</span>
                <span className={`font-black ${Number(order.payment_amount) === Number(order.total_price) ? 'text-emerald-700' : 'text-red-700'}`}>
                  ฿{Number(order.payment_amount).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   AdminOrderHistoryPage
══════════════════════════════════════════════════════════════════ */
export default function AdminOrderHistoryPage() {
  const navigate = useNavigate()

  const [orders,     setOrders]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [settings,   setSettings]   = useState({})
  const [slipView,   setSlipView]   = useState(null)

  /* ── Filter state ── */
  const [dateFilter,    setDateFilter]    = useState('')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [payFilter,     setPayFilter]     = useState('all')   // 'all' | 'transfer' | 'cash'
  const [mismatchOnly,  setMismatchOnly]  = useState(false)
  const [search,        setSearch]        = useState('')

  const logout = () => { adminLogout(); navigate('/admin/login') }

  /* ── Fetch ── */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (dateFilter)                       params.date   = dateFilter
      if (statusFilter !== 'all')           params.status = statusFilter
      const res = await axios.get(`${API_BASE}/delivery/orders`, { headers: getAuthHeaders(), params })
      setOrders(res.data?.data ?? [])
    } catch (err) {
      handleAuthError(err, navigate)
    } finally {
      setLoading(false)
    }
  }, [navigate, dateFilter, statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    axios.get(`${API_BASE}/settings`, { headers: getAuthHeaders() })
      .then(r => setSettings(r.data?.data || {}))
      .catch(() => {})
  }, [])

  /* ── Filter locally ── */
  const displayed = orders.filter(o => {
    if (payFilter === 'transfer' && o.payment_method !== 'transfer') return false
    if (payFilter === 'cash'     && o.payment_method !== 'cash')     return false
    if (mismatchOnly && !o.payment_name_mismatch)                     return false
    if (search) {
      const q = search.toLowerCase()
      if (!o.customer_name?.toLowerCase().includes(q) &&
          !o.customer_phone?.includes(q) &&
          !String(o.id).includes(q)) return false
    }
    return true
  })

  const mismatchCount  = orders.filter(o => o.payment_name_mismatch).length
  const transferCount  = orders.filter(o => o.payment_method === 'transfer').length
  const slippedCount   = orders.filter(o => o.payment_slip_url).length

  return (
    <div className="min-h-screen bg-stone-50">

      {slipView && (
        <SlipViewModal
          order={slipView}
          adminName={settings.payment_account_name || ''}
          onClose={() => setSlipView(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-xl">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard"
              className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </Link>
            <div>
              <h1 className="font-black text-base leading-tight">🧾 ประวัติออเดอร์</h1>
              <p className="text-blue-200 text-[10px]">ตรวจสอบสลีปและชื่อบัญชี</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/dashboard"
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold">
              📊 Dashboard
            </Link>
            <button onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold">
              ออก
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'ออเดอร์โอน',   value: transferCount,  icon: '💳', color: 'text-blue-600'   },
            { label: 'มีสลีป',        value: slippedCount,   icon: '📎', color: 'text-violet-600' },
            { label: 'ชื่อไม่ตรง',   value: mismatchCount,  icon: '⚠️', color: 'text-red-600',
              extra: mismatchCount > 0 ? 'animate-pulse' : '' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl shadow-sm border px-4 py-3 ${s.extra || ''} ${s.label === 'ชื่อไม่ตรง' && mismatchCount > 0 ? 'border-red-200' : 'border-stone-100'}`}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-lg">{s.icon}</span>
                <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-[10px] text-stone-500 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-3">
          {/* Row 1: search + date */}
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ / เบอร์ / #ID"
              className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* Row 2: status + payment + mismatch */}
          <div className="flex gap-2 flex-wrap">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 focus:border-blue-400 focus:outline-none bg-white"
            >
              <option value="all">📋 ทุกสถานะ</option>
              <option value="pending_payment">💳 รอสลีป</option>
              <option value="pending">🔔 สั่งซื้อแล้ว</option>
              <option value="out_for_delivery">🛵 กำลังส่ง</option>
              <option value="delivered">✅ เสร็จสิ้น</option>
              <option value="cancelled">❌ ยกเลิก</option>
            </select>

            {/* Payment method filter */}
            <div className="flex gap-1">
              {[['all','ทั้งหมด'],['transfer','💳 โอน'],['cash','💵 เงินสด']].map(([v, l]) => (
                <button key={v} onClick={() => setPayFilter(v)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${payFilter === v ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Mismatch only toggle */}
            <button onClick={() => setMismatchOnly(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all ${mismatchOnly ? 'bg-red-600 text-white shadow-md shadow-red-300/40' : 'bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-700'}`}>
              ⚠️ ชื่อไม่ตรงเท่านั้น {mismatchCount > 0 && <span className={`px-1 py-0.5 rounded-full text-[9px] ${mismatchOnly ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>{mismatchCount}</span>}
            </button>

            {(dateFilter || statusFilter !== 'all' || payFilter !== 'all' || mismatchOnly || search) && (
              <button onClick={() => { setDateFilter(''); setStatusFilter('all'); setPayFilter('all'); setMismatchOnly(false); setSearch('') }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-all">
                ✕ ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* ── Result count ── */}
        <p className="text-xs text-stone-400 font-bold px-1">
          แสดง {displayed.length} จาก {orders.length} ออเดอร์
        </p>

        {/* ── Order list ── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border border-stone-100" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 py-16 text-center">
            <p className="text-5xl">📭</p>
            <p className="text-stone-600 font-bold mt-3">ไม่พบออเดอร์</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(order => (
              <SlipCard
                key={order.id}
                order={order}
                adminName={settings.payment_account_name || ''}
                onViewSlip={setSlipView}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
