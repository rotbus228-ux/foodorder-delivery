import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'

const _BASE      = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API_BASE   = `${_BASE}/api`
const SOCKET_URL = _BASE

/* ── Status config ─────────────────────────────────────────────── */
const CASH_STEPS = [
  { key: 'pending',          icon: '🔔', emoji: '🔔', label: 'สั่งซื้อแล้ว',  desc: 'ร้านได้รับออเดอร์แล้ว',            color: 'from-orange-400 to-amber-400'   },
  { key: 'out_for_delivery', icon: '🛵', emoji: '🛵', label: 'กำลังไปส่ง',   desc: 'ไรเดอร์กำลังนำอาหารมาหาคุณแล้ว!', color: 'from-violet-500 to-purple-400'  },
  { key: 'delivered',        icon: '✅', emoji: '✅', label: 'เสร็จสิ้น',     desc: 'ได้รับอาหารเรียบร้อย ขอบคุณครับ', color: 'from-emerald-500 to-green-400'  },
]

const TRANSFER_STEPS = [
  { key: 'pending_payment',  icon: '💳', emoji: '💳', label: 'รอตรวจสลีป',  desc: 'กำลังตรวจสอบการโอนเงิน',           color: 'from-blue-400   to-indigo-400'  },
  { key: 'pending',          icon: '🔔', emoji: '🔔', label: 'สั่งซื้อแล้ว', desc: 'ยืนยันการชำระแล้ว กำลังดำเนินการ',  color: 'from-orange-400 to-amber-400'   },
  { key: 'out_for_delivery', icon: '🛵', emoji: '🛵', label: 'กำลังไปส่ง',   desc: 'ไรเดอร์กำลังนำอาหารมาหาคุณแล้ว!', color: 'from-violet-500 to-purple-400'  },
  { key: 'delivered',        icon: '✅', emoji: '✅', label: 'เสร็จสิ้น',     desc: 'ได้รับอาหารเรียบร้อย ขอบคุณครับ', color: 'from-emerald-500 to-green-400'  },
]

const STATUS_GRADIENT = {
  pending_payment:  'from-blue-600 via-indigo-500 to-blue-700',
  pending:          'from-red-800  via-red-700    to-rose-700',
  preparing:        'from-red-800  via-red-700    to-rose-700',
  out_for_delivery: 'from-violet-600 via-purple-500 to-fuchsia-600',
  delivered:        'from-emerald-500 via-green-500 to-teal-500',
  cancelled:        'from-stone-500 via-slate-500 to-stone-600',
}

/* ── Animated Rider ─────────────────────────────────────────────── */
function AnimatedRider({ status }) {
  if (status !== 'out_for_delivery') return null
  return (
    <div className="flex flex-col items-center justify-center py-4" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="relative">
        {/* Road */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/50 rounded-full" style={{ animation: 'roadScroll 1s linear infinite', width: '200%' }} />
        </div>
        {/* Moto */}
        <div className="text-5xl" style={{ animation: 'bikeRide 0.4s ease-in-out infinite alternate, slideInRight 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
          🛵
        </div>
        {/* Speed lines */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 -translate-x-8 opacity-60">
          {[12, 8, 10].map((w, i) => (
            <div key={i} className="h-0.5 bg-white rounded-full" style={{ width: w, animation: `speedLine 0.5s ease-out ${i * 0.1}s infinite` }} />
          ))}
        </div>
      </div>
      <p className="text-white/80 text-xs font-bold mt-3 animate-pulse">กำลังรีบนำอาหารมาให้คุณ... 🔥</p>
    </div>
  )
}

/* ── Cooking Animation ──────────────────────────────────────────── */
function CookingAnimation({ status }) {
  if (status !== 'preparing') return null
  return (
    <div className="flex flex-col items-center py-3" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="relative">
        <div className="text-5xl" style={{ animation: 'cookSpin 1s ease-in-out infinite alternate' }}>🍳</div>
        <div className="absolute -top-3 -right-1 text-xl" style={{ animation: 'steamRise 1.2s ease-in-out infinite' }}>💨</div>
      </div>
      <p className="text-white/80 text-xs font-bold mt-2 animate-pulse">กำลังทำอาหารด้วยความตั้งใจ...</p>
    </div>
  )
}

/* ── Success Celebration ────────────────────────────────────────── */
function SuccessCelebration({ status }) {
  if (status !== 'delivered') return null
  return (
    <div className="flex flex-col items-center py-3" style={{ animation: 'bounceIn 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="text-6xl" style={{ animation: 'celebrateBounce 0.8s ease-out infinite alternate' }}>🎉</div>
      <p className="text-white font-black text-base mt-2">ได้รับอาหารแล้ว!</p>
      <p className="text-white/80 text-xs mt-0.5">ขอบคุณที่ใช้บริการครับ 😊</p>
    </div>
  )
}

/* ── Progress Steps ─────────────────────────────────────────────── */
function ProgressSteps({ steps, activeIdx }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
      <h3 className="font-black text-stone-800 mb-4 text-sm">สถานะการจัดส่ง</h3>
      {/* Mobile: vertical list */}
      <div className="flex flex-col gap-0 sm:hidden">
        {steps.map((step, si) => {
          const done    = si < activeIdx
          const current = si === activeIdx
          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Icon column */}
              <div className="flex flex-col items-center">
                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-base font-black transition-all duration-500 flex-shrink-0
                  ${done    ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-md shadow-green-200'
                  : current ? `bg-gradient-to-br ${step.color} text-white shadow-lg ring-4 ring-white`
                  : 'bg-stone-100 text-stone-400'}`}>
                  {current && <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />}
                  <span className="relative">{done ? '✓' : step.emoji}</span>
                </div>
                {si < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[24px] my-1 rounded-full transition-all duration-700 ${done ? 'bg-emerald-400' : 'bg-stone-100'}`} />
                )}
              </div>
              {/* Text */}
              <div className="pb-5 flex-1">
                <p className={`text-sm font-black leading-tight ${done ? 'text-emerald-600' : current ? 'text-stone-900' : 'text-stone-300'}`}>
                  {step.label}
                  {current && <span className="ml-2 text-[10px] font-bold bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full">ตอนนี้</span>}
                </p>
                {current && <p className="text-xs text-stone-500 mt-0.5">{step.desc}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-start">
        {steps.map((step, si) => (
          <div key={step.key} className="flex items-center" style={{ flex: si < steps.length - 1 ? '1 1 0%' : 'none' }}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500
                ${si < activeIdx   ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-md shadow-green-200'
                : si === activeIdx ? `bg-gradient-to-br ${step.color} text-white shadow-lg ring-4 ring-white`
                : 'bg-stone-100 text-stone-400'}`}>
                {si === activeIdx && <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />}
                <span className="relative">{si < activeIdx ? '✓' : step.emoji}</span>
              </div>
              <p className={`text-[10px] mt-1.5 font-black text-center leading-tight ${si < steps.length - 1 ? 'w-14' : 'w-16'}
                ${si < activeIdx   ? 'text-emerald-600'
                : si === activeIdx ? 'text-stone-900'
                : 'text-stone-300'}`}>
                {step.label}
              </p>
            </div>
            {si < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-1 mb-6 rounded-full transition-all duration-700 ${si < activeIdx ? 'bg-gradient-to-r from-emerald-400 to-green-400' : 'bg-stone-100'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── ContactModal ───────────────────────────────────────────────── */
function ContactModal({ settings, onClose }) {
  const phone   = settings?.contact_phone || ''
  const lineId  = settings?.contact_line  || ''
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 bg-stone-300 rounded-full" /></div>
        <div className="px-6 pt-4 pb-6 space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2">📞</div>
            <h2 className="text-lg font-black text-stone-900">ติดต่อร้าน</h2>
            <p className="text-xs text-stone-500 mt-0.5">ต้องการสอบถามหรือแจ้งปัญหา</p>
          </div>
          <div className="space-y-3">
            {phone ? (
              <a href={`tel:${phone}`}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-sm shadow-lg shadow-blue-300/40 active:scale-95 transition-all">
                <span className="text-xl">📞</span>
                <div className="flex-1 text-left">
                  <p className="text-xs text-white/70 font-normal">โทรหาร้าน</p>
                  <p className="text-base font-black">{phone}</p>
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </a>
            ) : (
              <div className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-stone-100 text-stone-400 text-sm">
                <span className="text-xl">📞</span><span>ไม่ได้ตั้งค่าเบอร์โทร</span>
              </div>
            )}
            {lineId ? (
              <a href={`https://line.me/R/ti/p/${lineId.replace('@', '')}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-[#06C755] text-white font-black text-sm shadow-lg shadow-green-300/40 active:scale-95 transition-all">
                <span className="text-xl">💬</span>
                <div className="flex-1 text-left">
                  <p className="text-xs text-white/70 font-normal">LINE</p>
                  <p className="text-base font-black">{lineId}</p>
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </a>
            ) : (
              <div className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-stone-100 text-stone-400 text-sm">
                <span className="text-xl">💬</span><span>ไม่ได้ตั้งค่า LINE ID</span>
              </div>
            )}
          </div>
          <button onClick={onClose}
            className="w-full py-3 rounded-2xl bg-stone-100 text-stone-600 font-bold text-sm hover:bg-stone-200 transition-colors active:scale-95">
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   TrackPage
══════════════════════════════════════════════════════════════════ */
export default function TrackPage() {
  const { orderId } = useParams()
  const navigate    = useNavigate()

  const [order,       setOrder]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [connected,   setConnected]   = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)
  const [settings,    setSettings]    = useState({})
  const [showContact, setShowContact] = useState(false)
  const socketRef   = useRef(null)
  const prevStatus  = useRef(null)

  /* ── Fetch ── */
  useEffect(() => {
    if (!orderId) return
    Promise.allSettled([
      axios.get(`${API_BASE}/delivery/orders/${orderId}`),
      axios.get(`${API_BASE}/settings`),
    ]).then(([orderRes, settingsRes]) => {
      if (orderRes.status === 'fulfilled') {
        setOrder(orderRes.value.data?.data)
        prevStatus.current = orderRes.value.data?.data?.status
      } else {
        setError('ไม่พบออเดอร์นี้')
      }
      if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value.data?.data || {})
    }).finally(() => setLoading(false))
  }, [orderId])

  /* ── Socket ── */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('delivery_status_update', ({ order_id, status, order: updated }) => {
      if (String(order_id) === String(orderId)) {
        if (prevStatus.current && prevStatus.current !== status) {
          setJustUpdated(true)
          setTimeout(() => setJustUpdated(false), 3000)
        }
        prevStatus.current = status
        setOrder(prev => updated || { ...prev, status })
      }
    })
    return () => socket.disconnect()
  }, [orderId])

  /* ── Loading / Error ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-red-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-stone-500 font-bold text-sm">กำลังโหลด...</p>
        </div>
      </div>
    )
  }
  if (error || !order) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="text-6xl">😕</div>
          <p className="text-stone-700 font-bold text-lg">{error || 'ไม่พบออเดอร์'}</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-red-700 text-white rounded-2xl font-bold text-sm hover:bg-red-800 transition-colors active:scale-95">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    )
  }

  const isCancelled = order.status === 'cancelled'
  const steps       = order.payment_method === 'transfer' ? TRANSFER_STEPS : CASH_STEPS
  const activeIdx   = isCancelled ? -1 : steps.findIndex(s => s.key === order.status)
  const gradient    = STATUS_GRADIENT[order.status] || STATUS_GRADIENT.pending
  const currentStep = steps[Math.max(0, activeIdx)]

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Contact Modal ── */}
      {showContact && <ContactModal settings={settings} onClose={() => setShowContact(false)} />}

      {/* ── Hero Header ── */}
      <div className={`relative bg-gradient-to-br ${gradient} text-white overflow-hidden transition-all duration-1000`}>
        {/* Blobs */}
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        <div className="relative px-4 pt-4 pb-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center font-black text-white text-base transition-colors active:scale-90">
              1
            </button>
            <div className="flex items-center gap-2">
              {justUpdated && (
                <span className="text-[10px] font-black bg-white/20 text-white px-2.5 py-1 rounded-full animate-pulse" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  🔔 อัปเดตแล้ว!
                </span>
              )}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 ring-white/20 ${connected ? 'bg-white/15' : 'bg-white/10'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-300 animate-pulse' : 'bg-white/40'}`} />
                <span className="text-[10px] text-white/90 font-bold">{connected ? 'Real-time' : 'ออฟไลน์'}</span>
              </div>
            </div>
          </div>

          {/* Order ID + Queue */}
          <div className="text-center">
            <p className="text-white/70 text-xs font-bold tracking-widest uppercase">ติดตามออเดอร์</p>
            <p className="text-5xl font-black mt-1 drop-shadow-lg">#{order.id}</p>
            {order.daily_queue_number && (
              <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full ring-1 ring-white/30">
                <span className="text-white/80 text-xs font-bold">คิวที่</span>
                <span className="text-white font-black text-xl leading-none">{order.daily_queue_number}</span>
                <span className="text-white/80 text-xs font-bold">วันนี้</span>
              </div>
            )}
          </div>

          {/* Contact button */}
          <div className="absolute bottom-4 right-4">
            <button onClick={() => setShowContact(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-black ring-1 ring-white/20 transition-all active:scale-90">
              <span className="text-sm">📞</span> ติดต่อร้าน
            </button>
          </div>

          {/* Status animation */}
          {!isCancelled && (
            <div className="mt-2">
              <AnimatedRider    status={order.status} />
              <CookingAnimation status={order.status} />
              <SuccessCelebration status={order.status} />

              {/* Default: show icon + label for other statuses */}
              {!['out_for_delivery', 'preparing', 'delivered'].includes(order.status) && currentStep && (
                <div className="flex flex-col items-center py-3" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                  <div className="text-5xl">{currentStep.emoji}</div>
                  <p className="text-xl font-black text-white mt-2">{currentStep.label}</p>
                  <p className="text-white/80 text-sm mt-1 text-center">{currentStep.desc}</p>
                </div>
              )}
            </div>
          )}

          {/* Cancelled state */}
          {isCancelled && (
            <div className="flex flex-col items-center py-4">
              <div className="text-5xl" style={{ animation: 'shakeX 0.5s ease-out' }}>❌</div>
              <p className="text-xl font-black text-white mt-2">ออเดอร์ถูกยกเลิก</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Progress */}
        {!isCancelled && <ProgressSteps steps={steps} activeIdx={activeIdx} />}

        {/* รายละเอียดออเดอร์ */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          <button
            onClick={() => {/* expandable if needed */}}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-stone-100"
          >
            <h3 className="font-black text-stone-800 text-sm flex items-center gap-2">
              <span>📦</span> รายการอาหาร ({(order.items || []).length} รายการ)
            </h3>
            <span className="font-black text-red-700">฿{Number(order.total_price).toLocaleString()}</span>
          </button>

          <div className="divide-y divide-stone-50">
            {(order.items || []).map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800">{item.name}</p>
                  {Array.isArray(item.options) && item.options.length > 0 && (
                    <p className="text-[11px] text-red-600 font-semibold mt-0.5">
                      {item.options.map(o => o.label || o.name).join(', ')}
                    </p>
                  )}
                  {item.note && <p className="text-[11px] text-rose-500 mt-0.5">📝 {item.note}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-stone-800">฿{(Number(item.unit_price) * item.quantity).toLocaleString()}</p>
                  <p className="text-[10px] text-stone-400">฿{Number(item.unit_price)} × {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3.5 bg-stone-50 space-y-1.5 border-t border-stone-100">
            <div className="flex justify-between text-sm text-stone-500">
              <span>ค่าอาหาร</span><span>฿{Number(order.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500">
              <span>ค่าส่ง</span><span>฿{Number(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between font-black text-base text-stone-900 pt-1.5 border-t border-stone-200">
              <span>ยอดรวม</span>
              <span className="text-red-700">฿{Number(order.total_price).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ข้อมูลจัดส่ง */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-5 py-4">
          <h3 className="font-black text-stone-800 text-sm mb-3 flex items-center gap-2"><span>👤</span> ข้อมูลจัดส่ง</h3>
          <div className="space-y-2.5">
            {[
              { icon: '👤', label: 'ชื่อ',    value: order.customer_name },
              { icon: '📞', label: 'เบอร์',   value: order.customer_phone },
              { icon: '📍', label: 'ที่อยู่', value: order.delivery_address },
              order.note ? { icon: '📝', label: 'หมายเหตุ', value: order.note } : null,
            ].filter(Boolean).map(f => (
              <div key={f.label} className="flex gap-3 items-start">
                <span className="text-base flex-shrink-0 w-5 mt-0.5">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm text-stone-700 font-semibold leading-snug break-words">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* การชำระเงิน */}
        <div className={`rounded-2xl px-4 py-3.5 ring-1 flex items-center gap-3 ${order.payment_method === 'transfer' ? 'bg-blue-50 ring-blue-100' : 'bg-green-50 ring-green-100'}`}>
          <span className="text-2xl flex-shrink-0">{order.payment_method === 'transfer' ? '💳' : '💵'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-stone-800">{order.payment_method === 'transfer' ? 'โอนเงิน' : 'เงินสด'}</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {order.payment_method === 'transfer'
                ? order.payment_slip_url ? `โอน ฿${Number(order.payment_amount || 0).toLocaleString()} · รอตรวจสอบ` : 'ยังไม่ได้อัปโหลดสลีป'
                : 'ชำระเงินสดกับไรเดอร์'}
            </p>
          </div>
          {order.payment_slip_url && (
            <a href={order.payment_slip_url} target="_blank" rel="noreferrer"
              className="flex-shrink-0 text-xs font-bold text-blue-600 underline hover:text-blue-800">
              ดูสลีป
            </a>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/history')}
            className="flex-1 py-3.5 rounded-2xl bg-white border border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50 transition-colors active:scale-95 shadow-sm">
            📦 ดูออเดอร์อื่น
          </button>
          <button onClick={() => navigate('/order')}
            className="flex-1 py-3.5 rounded-2xl bg-red-700 text-white font-black text-sm shadow-xl shadow-red-300/40 hover:bg-red-800 hover:shadow-2xl active:scale-[0.98] transition-all">
            🛒 สั่งใหม่
          </button>
        </div>
      </div>

      {/* ── Global Animations ── */}
      <style>{`
        @keyframes fadeIn        { from { opacity:0; transform:translateY(-6px)} to { opacity:1; transform:translateY(0)} }
        @keyframes slideUp       { from { opacity:0; transform:translateY(20px)} to { opacity:1; transform:translateY(0)} }
        @keyframes slideInRight  { from { opacity:0; transform:translateX(40px)} to { opacity:1; transform:translateX(0)} }
        @keyframes bikeRide      { from { transform:translateY(0) rotate(-2deg)} to { transform:translateY(-4px) rotate(2deg)} }
        @keyframes roadScroll    { from { transform:translateX(0)} to { transform:translateX(-50%)} }
        @keyframes speedLine     { 0%{ opacity:0; transform:translateX(8px)} 50%{ opacity:1; transform:translateX(0)} 100%{ opacity:0; transform:translateX(-4px)} }
        @keyframes cookSpin      { from { transform:rotate(-8deg)} to { transform:rotate(8deg)} }
        @keyframes steamRise     { 0%{ opacity:0; transform:translateY(0) scale(0.8)} 50%{ opacity:0.9; transform:translateY(-8px) scale(1)} 100%{ opacity:0; transform:translateY(-16px) scale(1.2)} }
        @keyframes celebrateBounce { from { transform:scale(1) rotate(-5deg)} to { transform:scale(1.15) rotate(5deg)} }
        @keyframes bounceIn      { 0%{ opacity:0; transform:scale(0.6)} 70%{ transform:scale(1.1)} 100%{ opacity:1; transform:scale(1)} }
        @keyframes shakeX        { 0%,100%{ transform:translateX(0)} 20%,60%{ transform:translateX(-6px)} 40%,80%{ transform:translateX(6px)} }
      `}</style>
    </div>
  )
}
