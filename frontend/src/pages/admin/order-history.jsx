import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getAuthHeaders, adminLogout, handleAuthError } from '../../utils/adminAuth'
import CustomerProfileDrawer from '../../components/CustomerProfileDrawer'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

const STATUS_CFG = {
  pending_payment:  { label: 'รอสลีป',    dot: 'bg-blue-400'    },
  pending:          { label: 'สั่งซื้อแล้ว', dot: 'bg-orange-400' },
  out_for_delivery: { label: 'กำลังส่ง',   dot: 'bg-violet-500'  },
  delivered:        { label: 'เสร็จสิ้น',  dot: 'bg-emerald-500' },
  cancelled:        { label: 'ยกเลิก',     dot: 'bg-stone-400'   },
}

function parseUTC(s) {
  if (!s) return new Date()
  return /Z$|[+-]\d{2}:\d{2}$/.test(s) ? new Date(s) : new Date(s + 'Z')
}
function fmtDate(s) {
  return parseUTC(s).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ════════════════════════════════════════════════════════
   SlipModal
════════════════════════════════════════════════════════ */
function SlipModal({ order, onClose }) {
  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: 'fadeIn .2s ease-out' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-sm bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp .3s cubic-bezier(.16,1,.3,1)' }}>

        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>

        <div className="px-5 pt-3 pb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 font-bold">หลักฐานการโอนเงิน</p>
            <h2 className="font-black text-stone-900 text-lg">ออเดอร์ #{order.id}</h2>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {order.payment_slip_url ? (
            <div className="relative rounded-2xl overflow-hidden border border-stone-100 bg-stone-50">
              <img src={order.payment_slip_url} alt="payment slip" className="w-full max-h-80 object-contain" />
              <a href={order.payment_slip_url} target="_blank" rel="noreferrer"
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-sm transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                เต็มจอ
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-stone-200 py-12 flex flex-col items-center gap-2 text-stone-400">
              <span className="text-4xl">📭</span>
              <p className="text-sm font-bold">ยังไม่มีสลีป</p>
            </div>
          )}

          <div className="bg-stone-50 rounded-2xl px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">ยอดที่ต้องโอน</span>
              <span className="font-black text-stone-800">฿{Number(order.total_price).toLocaleString()}</span>
            </div>
            {order.payment_amount && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">ยอดที่โอนมา</span>
                <span className={`font-black ${Number(order.payment_amount) === Number(order.total_price) ? 'text-emerald-600' : 'text-red-600'}`}>
                  ฿{Number(order.payment_amount).toLocaleString()}
                  <span className="ml-1">{Number(order.payment_amount) === Number(order.total_price) ? '✓' : '⚠️'}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   OrderCard
════════════════════════════════════════════════════════ */
function OrderCard({ order, onSlip, onCustomer }) {
  const sc         = STATUS_CFG[order.status] || STATUS_CFG.pending
  const isTransfer = order.payment_method === 'transfer'
  const hasSlip    = !!order.payment_slip_url

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">

      {/* ── top bar ── */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-stone-50">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
          <span className="font-black text-stone-800 text-sm">#{order.id}</span>
          {order.daily_queue_number && (
            <span className="text-[10px] text-stone-400 font-bold">คิวที่ {order.daily_queue_number}</span>
          )}
          <span className="text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
            {sc.label}
          </span>
        </div>
        <span className="font-black text-red-700">฿{Number(order.total_price).toLocaleString()}</span>
      </div>

      {/* ── body ── */}
      <div className="px-4 py-3 space-y-3">

        {/* ข้อมูลลูกค้า — กดเปิด profile ได้ */}
        <button onClick={() => onCustomer?.(order)}
          className="w-full text-left space-y-1 rounded-lg hover:bg-stone-50 -mx-1 px-1 py-0.5 transition-colors group">
          <p className="font-black text-stone-900 text-sm group-hover:text-red-700">
            {order.customer_name}
            <span className="ml-1.5 text-[10px] text-stone-400 group-hover:text-red-500 font-bold">👤 ดูโปรไฟล์</span>
          </p>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>📞 {order.customer_phone}</span>
            <span>🕐 {fmtDate(order.created_at)}</span>
          </div>
          <p className="text-xs text-stone-500 line-clamp-1">📍 {order.delivery_address}</p>
        </button>

        {/* รายการ */}
        <div className="border-t border-stone-50 pt-2.5">
          <p className="text-xs text-stone-400 line-clamp-2">
            {(order.items || []).map(i => `${i.name} ×${i.quantity}`).join(' · ')}
          </p>
        </div>

        {/* การชำระ */}
        <div className="border-t border-stone-50 pt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isTransfer ? (
              <>
                <span className="text-xs text-stone-500 font-bold">💳 โอนเงิน</span>
                {order.payment_amount && (
                  <span className={`text-xs font-black ${Number(order.payment_amount) === Number(order.total_price) ? 'text-emerald-600' : 'text-red-600'}`}>
                    ฿{Number(order.payment_amount).toLocaleString()}
                    {Number(order.payment_amount) === Number(order.total_price) ? ' ✓' : ' ⚠️'}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-stone-500 font-bold">💵 เงินสด</span>
            )}
          </div>

          {/* ปุ่มดูสลีป */}
          {isTransfer && (
            <button
              onClick={() => onSlip(order)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
                hasSlip
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-300/40'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-500'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              {hasSlip ? 'ดูสลีป' : 'ไม่มีสลีป'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════ */
export default function AdminOrderHistoryPage() {
  const navigate = useNavigate()

  const [orders,       setOrders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [slipView,     setSlipView]     = useState(null)
  const [customerView, setCustomerView] = useState(null)  // { phone, name } | null

  const logout = () => { adminLogout(); navigate('/admin/login') }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/delivery/orders`, { headers: getAuthHeaders() })
      setOrders(res.data?.data ?? [])
    } catch (err) {
      handleAuthError(err, navigate)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  return (
    <div className="min-h-screen bg-stone-50">

      {slipView && (
        <SlipModal order={slipView} onClose={() => setSlipView(null)} />
      )}

      {customerView && (
        <CustomerProfileDrawer
          phone={customerView.phone}
          customerName={customerView.name}
          onClose={() => setCustomerView(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard"
              className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center text-stone-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </Link>
            <div>
              <h1 className="font-black text-stone-900 text-base">ประวัติออเดอร์</h1>
              <p className="text-stone-400 text-[10px]">{orders.length} รายการ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchOrders}
              className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center text-stone-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button onClick={logout}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold transition-colors">
              ออก
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 h-36 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 py-20 text-center">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-stone-500 font-bold">ยังไม่มีออเดอร์</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onSlip={setSlipView}
                onCustomer={o => setCustomerView({ phone: o.customer_phone, name: o.customer_name })}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
