import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

/* ── Status — 3 ขั้นตอนหลัก ──────────────────────────────────────── */
const STATUS = {
  pending_payment:  { label: 'รอตรวจสลีป',   icon: '💳', color: 'text-blue-600   bg-blue-50   border-blue-200'    },
  pending:          { label: 'สั่งซื้อแล้ว',  icon: '🔔', color: 'text-orange-600 bg-orange-50 border-orange-200'  },
  preparing:        { label: 'สั่งซื้อแล้ว',  icon: '🔔', color: 'text-orange-600 bg-orange-50 border-orange-200'  },
  out_for_delivery: { label: 'กำลังไปส่ง',    icon: '🛵', color: 'text-violet-600 bg-violet-50 border-violet-200'  },
  delivered:        { label: 'เสร็จสิ้น',     icon: '✅', color: 'text-emerald-600 bg-emerald-50 border-emerald-200'},
  cancelled:        { label: 'ยกเลิก',        icon: '❌', color: 'text-stone-500  bg-stone-50  border-stone-200'   },
}

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (mins < 1)  return 'เพิ่งสั่ง'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ── Contact Modal ───────────────────────────────────────────────── */
function ContactModal({ settings, onClose }) {
  const line  = settings?.contact_line  || '@artiwara_lb'
  const phone = settings?.contact_phone || '0968931933'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-xs">
        <div className="bg-red-900 px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-black text-base">ติดต่อร้านค้า</h2>
          <button onClick={onClose} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white font-black text-xs">LINE</div>
            <span className="text-base font-bold text-stone-800">{line}</span>
          </div>
          <hr className="border-stone-100" />
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xl">📞</div>
            <a href={`tel:${phone}`} className="text-base font-bold text-stone-800">{phone}</a>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-3 rounded-xl border-2 border-stone-200 font-bold text-stone-700">ปิด</button>
        </div>
      </div>
    </div>
  )
}

/* ── OrderHistoryCard ───────────────────────────────────────────── */
function OrderHistoryCard({ order, onTrack }) {
  const [expanded, setExpanded] = useState(false)
  const sc       = STATUS[order.status] || STATUS.pending
  const isActive = !['delivered', 'cancelled'].includes(order.status)

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${isActive ? 'border-red-200' : 'border-stone-100'}`}>
      <button onClick={() => setExpanded(e => !e)}
        className="w-full px-4 pt-3.5 pb-3 flex items-start justify-between gap-3 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-black text-stone-900 text-sm">#{order.id}</span>
            {order.daily_queue_number && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                คิวที่ {order.daily_queue_number}
              </span>
            )}
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${sc.color}`}>
              {sc.icon} {sc.label}
            </span>
          </div>
          <p className="text-xs text-stone-400">{formatDate(order.created_at)} · {timeAgo(order.created_at)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-black text-red-700">฿{Number(order.total_price).toLocaleString()}</p>
          <p className="text-[10px] text-stone-400">{order.payment_method === 'transfer' ? '💳 โอน' : '💵 เงินสด'}</p>
          <span className={`text-stone-400 text-xs inline-block mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

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
            <div className="flex justify-between text-sm font-black text-stone-800 pt-1">
              <span>รวมทั้งหมด</span>
              <span className="text-red-700">฿{Number(order.total_price).toLocaleString()}</span>
            </div>
          </div>

          <div className="px-4 pb-4 pt-2 flex gap-2">
            {isActive && (
              <button onClick={() => onTrack(order.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-black text-xs active:scale-95 transition-all">
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
  const navigate = useNavigate()
  const inputRef = useRef()

  const [phone,       setPhone]       = useState('')
  const [orders,      setOrders]      = useState([])
  const [loading,     setLoading]     = useState(false)
  const [searched,    setSearched]    = useState(false)
  const [error,       setError]       = useState('')
  const [showContact, setShowContact] = useState(false)
  const [settings,    setSettings]    = useState({})

  const search = async (phoneOverride) => {
    const p = (phoneOverride || phone).trim()
    if (!p) return
    setLoading(true); setError('')
    try {
      const res = await axios.get(`${API_BASE}/delivery/history`, { params: { phone: p } })
      setOrders(res.data?.data ?? [])
      setSearched(true)
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setLoading(false) }
  }

  /* โหลดเบอร์โทรจาก profile + auto-search ทันที */
  useEffect(() => {
    axios.get(`${API_BASE}/settings`).then(r => setSettings(r.data?.data || {})).catch(() => {})
    const saved = localStorage.getItem('delivery_profile')
    if (saved) {
      try {
        const p = JSON.parse(saved)
        if (p.phone) {
          setPhone(p.phone)
          search(p.phone)   // ส่งเบอร์โดยตรง ไม่รอ state update
        }
      } catch {}
    }
  }, []) // eslint-disable-line

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const doneOrders   = orders.filter(o =>  ['delivered', 'cancelled'].includes(o.status))

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {showContact && <ContactModal settings={settings} onClose={() => setShowContact(false)} />}

      {/* ── Header ── */}
      <div className="bg-red-900 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <button onClick={() => navigate('/order')}
          className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0 active:scale-90">
          1
        </button>
        <div className="flex-1" />
        <button onClick={() => setShowContact(true)}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-base active:scale-90">ℹ️</button>
        <button className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center text-white text-base ring-2 ring-white/60">🕐</button>
        <button onClick={() => navigate('/', { state: { edit: true } })}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-base active:scale-90">👤</button>
      </div>

      {/* ── Search bar ── */}
      <div className="bg-red-800 px-4 py-3 flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">📞</span>
          <input
            ref={inputRef} type="tel" value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="0xx-xxx-xxxx" maxLength={10}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white text-stone-800 font-bold text-sm placeholder-stone-400 focus:outline-none"
          />
        </div>
        <button onClick={() => search()} disabled={loading || !phone.trim()}
          className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-sm disabled:opacity-50 active:scale-95 transition-all">
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

          <h1 className="font-black text-stone-800 text-lg">ประวัติการสั่งซื้อ</h1>
          {searched && <p className="text-sm text-stone-500">รายการออเดอร์ทั้งหมดของคุณ</p>}

          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-stone-100" />)}
            </div>
          )}

          {!searched && !loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 py-14 text-center px-6">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-stone-700 font-bold">กรอกเบอร์โทรเพื่อดูออเดอร์</p>
            </div>
          )}

          {searched && !loading && orders.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 py-14 text-center px-6">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-stone-700 font-bold">ไม่พบออเดอร์สำหรับเบอร์นี้</p>
              <button onClick={() => navigate('/order')}
                className="mt-4 px-5 py-2.5 bg-red-700 text-white rounded-xl font-bold text-sm">
                สั่งอาหารเลย →
              </button>
            </div>
          )}

          {activeOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-sm font-black text-stone-700">กำลังดำเนินการ ({activeOrders.length})</p>
              </div>
              <div className="space-y-3">
                {activeOrders.map(o => <OrderHistoryCard key={o.id} order={o} onTrack={id => navigate(`/track/${id}`)} />)}
              </div>
            </div>
          )}

          {doneOrders.length > 0 && (
            <div>
              <p className="text-sm font-black text-stone-500 mb-3">ออเดอร์ที่ผ่านมา ({doneOrders.length})</p>
              <div className="space-y-3">
                {doneOrders.map(o => <OrderHistoryCard key={o.id} order={o} onTrack={id => navigate(`/track/${id}`)} />)}
              </div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm font-bold text-center">{error}</p>}
        </div>
      </div>

      {/* ── Bottom Nav ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-stone-200 shadow-lg">
        <div className="flex items-center h-16 max-w-lg mx-auto">
          <button onClick={() => navigate('/order')}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-stone-400 hover:text-stone-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10"/>
            </svg>
            <span className="text-[10px] font-bold">เมนูอาหาร</span>
          </button>
          <button onClick={() => navigate('/order')}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-stone-400 hover:text-stone-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span className="text-[10px] font-bold">ตะกร้า</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
