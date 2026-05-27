import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

/* ── Status config ─────────────────────────────────────────────── */
const STATUS = {
  pending_payment:  { label: 'รอตรวจสลีป',  icon: '💳', color: 'text-blue-600   bg-blue-50   border-blue-200'   },
  pending:          { label: 'รอดำเนินการ', icon: '🔔', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  preparing:        { label: 'กำลังปรุง',   icon: '🍳', color: 'text-sky-600    bg-sky-50    border-sky-200'    },
  out_for_delivery: { label: 'กำลังส่ง',    icon: '🛵', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  delivered:        { label: 'ส่งแล้ว',     icon: '✅', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelled:        { label: 'ยกเลิก',      icon: '❌', color: 'text-stone-500  bg-stone-50  border-stone-200'  },
}

function timeAgo(dateStr) {
  const d    = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'เพิ่งสั่ง'
  if (mins < 60)  return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs} ชั่วโมงที่แล้ว`
  const days = Math.floor(hrs / 24)
  return `${days} วันที่แล้ว`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

/* ── OrderHistoryCard ───────────────────────────────────────────── */
function OrderHistoryCard({ order, onTrack }) {
  const [expanded, setExpanded] = useState(false)
  const sc  = STATUS[order.status] || STATUS.pending
  const isActive = !['delivered', 'cancelled'].includes(order.status)

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${isActive ? 'border-sky-200' : 'border-stone-100'}`}>
      {/* Header */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full px-4 pt-3.5 pb-3 flex items-start justify-between gap-3 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-black text-stone-900">ออเดอร์ #{order.id}</span>
            {order.daily_queue_number && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200">
                คิว {order.daily_queue_number}
              </span>
            )}
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${sc.color}`}>
              {sc.icon} {sc.label}
            </span>
          </div>
          <p className="text-xs text-stone-400">{formatDate(order.created_at)} · {timeAgo(order.created_at)}</p>
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">📍 {order.delivery_address}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-black text-blue-600">฿{Number(order.total_price).toLocaleString()}</p>
          <p className="text-[10px] text-stone-400">{order.payment_method === 'transfer' ? '💳 โอน' : '💵 เงินสด'}</p>
          <span className={`text-stone-400 text-xs transition-transform inline-block mt-1 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {/* Expanded: รายการอาหาร */}
      {expanded && (
        <div style={{ animation: 'slideDown 0.2s ease-out' }}>
          <div className="border-t border-stone-100 px-4 py-3 space-y-1.5 bg-stone-50/50">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between items-baseline text-sm">
                <span className="text-stone-700">
                  {item.name} <span className="text-stone-400">×{item.quantity}</span>
                  {Array.isArray(item.options) && item.options.length > 0 && (
                    <span className="text-orange-500 text-xs ml-1">· {item.options.map(o => o.label || o.name).join(', ')}</span>
                  )}
                </span>
                <span className="text-stone-600 font-semibold ml-2 flex-shrink-0">
                  ฿{(Number(item.unit_price) * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-stone-200 flex justify-between text-xs text-stone-500">
              <span>ค่าส่ง</span><span>฿{Number(order.delivery_fee)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-3.5 flex gap-2">
            {isActive && (
              <button onClick={() => onTrack(order.id)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-xs shadow-md shadow-blue-200 active:scale-95 transition-all">
                📍 ติดตามสถานะ
              </button>
            )}
            {!isActive && order.status === 'delivered' && (
              <div className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs text-center border border-emerald-200">
                ✅ ส่งสำเร็จแล้ว
              </div>
            )}
            {order.status === 'cancelled' && (
              <div className="flex-1 py-2.5 rounded-xl bg-stone-50 text-stone-400 font-black text-xs text-center border border-stone-200">
                ❌ ออเดอร์ถูกยกเลิก
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   HistoryPage
══════════════════════════════════════════════════════════════════ */
export default function HistoryPage() {
  const navigate  = useNavigate()
  const inputRef  = useRef()

  const [phone,    setPhone]    = useState('')
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [error,    setError]    = useState('')

  const search = async () => {
    const p = phone.trim()
    if (!p) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API_BASE}/delivery/history`, { params: { phone: p } })
      setOrders(res.data?.data ?? [])
      setSearched(true)
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') search() }

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const doneOrders   = orders.filter(o => ['delivered', 'cancelled'].includes(o.status))

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Header ── */}
      <div className="relative bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 text-white overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

        <div className="relative px-4 pt-safe-top pt-4 pb-6">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate('/')}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center transition-colors active:scale-90">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-black drop-shadow">📦 ประวัติออเดอร์</h1>
              <p className="text-xs text-orange-50/80">กรอกเบอร์โทรเพื่อดูออเดอร์ของคุณ</p>
            </div>
          </div>

          {/* Search box */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-base">📞</span>
              <input
                ref={inputRef}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={handleKey}
                placeholder="0xx-xxx-xxxx"
                maxLength={10}
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white text-stone-800 font-bold text-base placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-md"
              />
            </div>
            <button onClick={search} disabled={loading || !phone.trim()}
              className="px-5 py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-black text-sm border border-white/30 transition-all active:scale-95 disabled:opacity-50">
              {loading ? '⏳' : '🔍 ค้นหา'}
            </button>
          </div>
          {error && <p className="text-rose-200 text-xs font-bold mt-2 text-center">{error}</p>}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ยังไม่ค้นหา */}
        {!searched && !loading && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 py-14 text-center px-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-50 to-amber-50 rounded-full flex items-center justify-center text-4xl mb-4">📦</div>
            <p className="text-stone-700 font-bold text-base">ดูออเดอร์ของคุณ</p>
            <p className="text-stone-400 text-sm mt-1.5 leading-relaxed">
              กรอกเบอร์โทรที่ใช้สั่งอาหาร<br />เพื่อดูออเดอร์ทั้งหมดของคุณ
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-stone-100" />
            ))}
          </div>
        )}

        {/* ค้นหาแล้วไม่เจอ */}
        {searched && !loading && orders.length === 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 py-14 text-center px-6">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-stone-700 font-bold">ไม่พบออเดอร์</p>
            <p className="text-stone-400 text-sm mt-1.5">ไม่มีออเดอร์สำหรับเบอร์ {phone}</p>
            <button onClick={() => navigate('/order')}
              className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">
              สั่งอาหารเลย →
            </button>
          </div>
        )}

        {/* ออเดอร์กำลังดำเนินการ */}
        {activeOrders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-sm font-black text-stone-700">กำลังดำเนินการ ({activeOrders.length})</p>
            </div>
            <div className="space-y-3">
              {activeOrders.map(order => (
                <OrderHistoryCard key={order.id} order={order} onTrack={id => navigate(`/track/${id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* ออเดอร์เสร็จสิ้น */}
        {doneOrders.length > 0 && (
          <div>
            <p className="text-sm font-black text-stone-500 mb-3">ออเดอร์ที่ผ่านมา ({doneOrders.length})</p>
            <div className="space-y-3">
              {doneOrders.map(order => (
                <OrderHistoryCard key={order.id} order={order} onTrack={id => navigate(`/track/${id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* ปุ่มสั่งใหม่ */}
        {orders.length > 0 && (
          <button onClick={() => navigate('/order')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-base shadow-xl shadow-blue-300/40 hover:shadow-2xl active:scale-[0.98] transition-all">
            🛒 สั่งอาหารอีกครั้ง
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
