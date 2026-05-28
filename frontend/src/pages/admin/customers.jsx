import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getAuthHeaders, adminLogout, handleAuthError } from '../../utils/adminAuth'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

const STATUS_CONFIG = {
  pending_payment:  { label: 'รอตรวจสลีป',  icon: '💳', color: 'text-blue-600   bg-blue-50   border-blue-200'   },
  pending:          { label: 'สั่งซื้อแล้ว', icon: '🔔', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  preparing:        { label: 'กำลังเตรียม',  icon: '🍳', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  out_for_delivery: { label: 'กำลังไปส่ง',   icon: '🛵', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  delivered:        { label: 'เสร็จสิ้น',    icon: '✅', color: 'text-emerald-600 bg-emerald-50 border-emerald-200'},
  cancelled:        { label: 'ยกเลิก',       icon: '❌', color: 'text-stone-500  bg-stone-50  border-stone-200'  },
}

function formatDate(d) {
  return new Date(d).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(d) {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000)
  if (mins < 1)   return 'เพิ่งสั่ง'
  if (mins < 60)  return `${mins} นาทีที่แล้ว`
  if (mins < 1440)return `${Math.floor(mins/60)} ชม.ที่แล้ว`
  return `${Math.floor(mins/1440)} วันที่แล้ว`
}

/* ── Customer Detail Drawer ────────────────────────────────────────── */
function CustomerDrawer({ customer, onClose }) {
  if (!customer) return null
  const { name, phone, address, orders } = customer
  const active = orders.filter(o => !['delivered','cancelled'].includes(o.status))
  const done   = orders.filter(o =>  ['delivered','cancelled'].includes(o.status))
  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total_price || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-red-700 px-5 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black text-white">
            {name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-base truncate">{name}</p>
            <a href={`tel:${phone}`} className="text-red-200 text-sm font-bold">{phone}</a>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100 flex-shrink-0">
          {[
            { label: 'ออเดอร์ทั้งหมด', value: orders.length, unit: 'ครั้ง' },
            { label: 'ยอดรวม',         value: `฿${totalSpent.toLocaleString()}`, unit: '' },
            { label: 'ออเดอร์ล่าสุด',  value: timeAgo(orders[0]?.created_at), unit: '' },
          ].map((s, i) => (
            <div key={i} className="px-4 py-3 text-center">
              <p className="text-base font-black text-stone-800">{s.value}<span className="text-xs font-normal text-stone-400 ml-1">{s.unit}</span></p>
              <p className="text-[10px] text-stone-400 font-bold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Address */}
        {address && (
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex-shrink-0">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">📍 ที่อยู่จัดส่งล่าสุด</p>
            <p className="text-sm font-bold text-stone-700">{address}</p>
          </div>
        )}

        {/* Order list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">

            {active.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-xs font-black text-stone-700">กำลังดำเนินการ ({active.length})</p>
                </div>
                {active.map(o => <OrderRow key={o.id} order={o} />)}
              </div>
            )}

            {done.length > 0 && (
              <div>
                <p className="text-xs font-black text-stone-400 mb-2">ออเดอร์ที่ผ่านมา ({done.length})</p>
                {done.map(o => <OrderRow key={o.id} order={o} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

function OrderRow({ order }) {
  const [expanded, setExpanded] = useState(false)
  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-stone-700">#{order.id}</span>
            {order.daily_queue_number && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">คิว {order.daily_queue_number}</span>
            )}
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${sc.color}`}>{sc.icon} {sc.label}</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-0.5">{formatDate(order.created_at)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-black text-red-700">฿{Number(order.total_price).toLocaleString()}</p>
          <span className={`text-stone-300 text-xs transition-transform inline-block ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-stone-100 px-4 py-3 bg-stone-50/60 space-y-1.5">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-stone-600">{item.name} <span className="text-stone-400">×{item.quantity}</span></span>
              <span className="font-bold text-stone-700">฿{(Number(item.unit_price)*item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs text-stone-400 pt-1 border-t border-stone-200">
            <span>ค่าส่ง</span><span>฿{Number(order.delivery_fee)}</span>
          </div>
          {order.delivery_address && (
            <p className="text-[10px] text-stone-400 pt-1">📍 {order.delivery_address}</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   AdminCustomersPage
══════════════════════════════════════════════════════════════════ */
export default function AdminCustomersPage() {
  const navigate  = useNavigate()
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)  // customer object

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/delivery/orders`, { headers: getAuthHeaders() })
      setOrders(res.data?.data || [])
    } catch (err) {
      handleAuthError(err, navigate)
    } finally {
      setLoading(false)
    }
  }

  /* Group orders by phone */
  const customers = Object.values(
    orders.reduce((acc, order) => {
      const phone = order.customer_phone
      if (!acc[phone]) {
        acc[phone] = {
          phone,
          name:    order.customer_name,
          address: order.delivery_address,
          orders:  [],
        }
      }
      acc[phone].orders.push(order)
      // ใช้ชื่อจากออเดอร์ล่าสุด
      acc[phone].name    = order.customer_name
      acc[phone].address = order.delivery_address
      return acc
    }, {})
  )
    .map(c => ({
      ...c,
      totalOrders:  c.orders.length,
      totalSpent:   c.orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_price || 0), 0),
      lastOrderAt:  c.orders[0]?.created_at,
      hasActive:    c.orders.some(o => !['delivered','cancelled'].includes(o.status)),
    }))
    .sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt))

  const filtered = customers.filter(c =>
    !search || c.name.includes(search) || c.phone.includes(search)
  )

  return (
    <div className="min-h-screen bg-stone-50">

      {selected && (
        <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />
      )}

      {/* Header */}
      <div className="bg-red-900 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')}
          className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-white text-base">ประวัติลูกค้า</h1>
          <p className="text-red-200 text-xs">{customers.length} คน · {orders.length} ออเดอร์</p>
        </div>
        <button onClick={fetchOrders}
          className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all">
          🔄
        </button>
      </div>

      {/* Search */}
      <div className="bg-red-800 px-4 pb-3">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ หรือเบอร์โทร..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white text-stone-800 font-bold text-sm placeholder-stone-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 bg-white border-b border-stone-100 divide-x divide-stone-100">
        {[
          { icon: '👥', label: 'ลูกค้าทั้งหมด', value: customers.length },
          { icon: '📦', label: 'ออเดอร์ทั้งหมด', value: orders.length },
          { icon: '🔴', label: 'กำลังดำเนินการ', value: customers.filter(c => c.hasActive).length },
        ].map((s, i) => (
          <div key={i} className="px-3 py-3 text-center">
            <p className="text-lg font-black text-stone-800">{s.value}</p>
            <p className="text-[10px] text-stone-400 font-bold">{s.icon} {s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-stone-100" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl py-16 text-center border border-stone-100">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-stone-600 font-bold">ยังไม่มีลูกค้า</p>
          </div>
        )}

        {!loading && filtered.map(c => (
          <button key={c.phone} onClick={() => setSelected(c)}
            className="w-full bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden text-left hover:border-red-200 hover:shadow-md active:scale-[0.99] transition-all">
            <div className="px-4 py-4 flex items-center gap-3">

              {/* Avatar */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0 ${c.hasActive ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-stone-400 to-stone-500'}`}>
                {c.name?.charAt(0) || '?'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-black text-stone-900 text-sm truncate">{c.name}</p>
                  {c.hasActive && (
                    <span className="flex-shrink-0 flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      มีออเดอร์
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 font-bold">{c.phone}</p>
                <p className="text-[10px] text-stone-400 mt-0.5 truncate">📍 {c.address || 'ไม่มีที่อยู่'}</p>
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0 space-y-1">
                <p className="text-sm font-black text-red-700">฿{c.totalSpent.toLocaleString()}</p>
                <p className="text-[10px] text-stone-400 font-bold">{c.totalOrders} ออเดอร์</p>
                <p className="text-[9px] text-stone-300">{timeAgo(c.lastOrderAt)}</p>
              </div>

              <svg className="w-4 h-4 text-stone-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
