import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix leaflet default marker icon in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const _BASE      = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API_BASE   = `${_BASE}/api`
const SOCKET_URL = _BASE

/* ── Helpers ──────────────────────────────────────────────────────── */
function ImageWithFallback({ src, alt, className }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src)
    return <div className={`${className} flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50`}><span className="text-4xl">🍽️</span></div>
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />
}

function getCatColor(name = '') {
  const n = name.toLowerCase()
  if (n.includes('จานเดียว'))   return { bg: 'bg-amber-50',  text: 'text-amber-700'  }
  if (n.includes('เส้น'))       return { bg: 'bg-orange-50', text: 'text-blue-700' }
  if (n.includes('เครื่องดื่ม') || n.includes('ของหวาน')) return { bg: 'bg-sky-50', text: 'text-sky-700' }
  if (n.includes('ต้ม') || n.includes('แกง')) return { bg: 'bg-rose-50', text: 'text-rose-700' }
  return { bg: 'bg-stone-100', text: 'text-stone-500' }
}

const cartKey = (menuId, options, note) =>
  `${menuId}__${options.map(o => o.label).join('|')}__${(note || '').trim()}`

/* ── OptionsModal ─────────────────────────────────────────────────── */
function OptionsModal({ menu, onConfirm, onClose }) {
  const dbOptions = Array.isArray(menu?.options) ? menu.options : []
  const [selected, setSelected] = useState(new Set())
  const [note,     setNote]     = useState('')
  if (!menu) return null

  const toggleOpt = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const extraTotal = Array.from(selected).reduce((sum, id) => {
    const o = dbOptions.find(o => o.id === id)
    return sum + (Number(o?.extra_price) || 0)
  }, 0)
  const unitPrice = (menu.price || 0) + extraTotal

  const handleConfirm = () => {
    const opts = Array.from(selected).map(id => {
      const o = dbOptions.find(o => o.id === id)
      return { label: o.name, extra: Number(o.extra_price) || 0 }
    })
    onConfirm(opts, note.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="sm:hidden flex justify-center pt-3"><div className="w-12 h-1.5 bg-stone-300 rounded-full" /></div>
        <div className="overflow-y-auto max-h-[92vh] p-5 pb-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-stone-900">⚙️ ปรับแต่งเมนู</h2>
            <button onClick={onClose} className="w-9 h-9 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-3 ring-1 ring-sky-100 flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white shadow-md flex-shrink-0">
              <ImageWithFallback src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-black text-stone-900">{menu.name}</p>
              {menu.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{menu.description}</p>}
              <p className="text-blue-600 font-bold text-sm mt-1">฿{menu.price} <span className="text-stone-400 font-normal text-xs">ราคาเริ่มต้น</span></p>
            </div>
          </div>

          {dbOptions.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-stone-500 mb-2.5 uppercase tracking-widest">ตัวเลือกพิเศษ</p>
              <div className="space-y-2">
                {dbOptions.map(opt => {
                  const isSel = selected.has(opt.id)
                  return (
                    <button key={opt.id} onClick={() => toggleOpt(opt.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${isSel ? 'border-blue-500 bg-sky-50 text-blue-700 ring-2 ring-blue-500/20' : 'border-stone-200 text-stone-600 hover:border-sky-200 hover:bg-stone-50'}`}>
                      <span className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSel ? 'bg-blue-600 border-blue-600' : 'border-stone-300'}`}>
                          {isSel && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                        </span>
                        {opt.name}
                      </span>
                      <span className={`font-black ${isSel ? 'text-blue-600' : 'text-stone-400'}`}>
                        {Number(opt.extra_price) > 0 ? `+฿${Number(opt.extra_price)}` : 'ฟรี'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-black text-stone-500 mb-2.5 uppercase tracking-widest">📝 หมายเหตุถึงห้องครัว</p>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="เช่น เผ็ดน้อย, ไม่ใส่ต้นหอม..." maxLength={100} rows={2}
              className="w-full border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 placeholder-stone-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 focus:outline-none resize-none transition-all" />
            <p className="text-[10px] text-stone-400 mt-1 text-right">{note.length}/100</p>
          </div>

          <div className="flex items-center justify-between bg-stone-50 rounded-2xl px-5 py-3.5 ring-1 ring-stone-200">
            <div><p className="text-xs text-stone-500 font-semibold">ราคารวม</p><p className="text-[10px] text-stone-400">1 × ฿{unitPrice}</p></div>
            <span className="text-2xl font-black text-blue-600">฿{unitPrice}</span>
          </div>

          <button onClick={handleConfirm}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-blue-300/50 active:scale-[0.98] transition-all">
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <span className="relative flex items-center justify-center gap-2">🛒 เพิ่มลงตะกร้า · ฿{unitPrice}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── CheckoutModal ────────────────────────────────────────────────── */
function CheckoutModal({ cart, cartTotal, customerInfo, settings, onClose, onSuccess }) {
  const [step,        setStep]        = useState(1)
  const [payMethod,   setPayMethod]   = useState('transfer')
  const [slipFile,    setSlipFile]    = useState(null)
  const [slipPreview, setSlipPreview] = useState(null)
  const [payAmount,   setPayAmount]   = useState('')
  const [sending,     setSending]     = useState(false)
  const [errorMsg,    setErrorMsg]    = useState('')
  const fileRef = useRef()

  const deliveryFee = Number(settings.delivery_fee) || 30
  const grandTotal  = cartTotal + deliveryFee

  const pickSlip = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSlipFile(file)
    setSlipPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (sending) return
    setSending(true)
    setErrorMsg('')
    try {
      const orderPayload = {
        customer_name:    customerInfo.name,
        customer_phone:   customerInfo.phone,
        delivery_address: customerInfo.address,
        note:             customerInfo.note || '',
        payment_method:   payMethod,
        location_lat:     customerInfo.location ? customerInfo.location[0] : null,
        location_lng:     customerInfo.location ? customerInfo.location[1] : null,
        items: cart.map(i => ({
          menu_id:    i.menuId,
          menu_name:  i.name,
          quantity:   i.quantity,
          unit_price: i.unitPrice,
          options:    i.options,
          note:       i.note || '',
        })),
      }
      const res = await axios.post(`${API_BASE}/delivery/orders`, orderPayload)
      const order = res.data?.data
      if (!order?.id) throw new Error('ไม่ได้รับ Order ID')

      if (payMethod === 'transfer' && slipFile) {
        const fd = new FormData()
        fd.append('slip', slipFile)
        if (payAmount) fd.append('payment_amount', payAmount)
        await axios.post(`${API_BASE}/delivery/orders/${order.id}/slip`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      onSuccess(order)
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSending(false)
    }
  }

  /* ── Step indicator ── */
  const steps = ['เลือกการชำระ', 'ชำระเงิน', 'เสร็จสิ้น']

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={!sending ? onClose : undefined} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[96vh] overflow-hidden flex flex-col"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        <div className="sm:hidden flex justify-center pt-3 flex-shrink-0"><div className="w-12 h-1.5 bg-stone-200 rounded-full" /></div>

        {/* Header */}
        <div className="bg-red-800 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-white">ชำระเงิน</h2>
            <p className="text-red-300 text-xs mt-0.5">ยอดรวม <span className="text-white font-black">฿{grandTotal.toLocaleString()}</span></p>
          </div>
          {!sending && (
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-5 py-3 bg-stone-50 border-b border-stone-100 flex-shrink-0">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-1.5 ${i + 1 <= step ? 'text-red-700' : 'text-stone-400'}`}>
                <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${i + 1 < step ? 'bg-red-700 text-white' : i + 1 === step ? 'bg-red-700 text-white ring-2 ring-red-200' : 'bg-stone-200 text-stone-400'}`}>
                  {i + 1 < step ? '✓' : i + 1}
                </span>
                <span className="text-[10px] font-bold hidden xs:block">{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i + 1 < step ? 'bg-red-400' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* ── รายการอาหาร (ทั้ง 2 steps) ── */}
            <div className="bg-stone-50 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-stone-100">
                <p className="text-xs font-black text-stone-500">รายการอาหาร ({cart.length} รายการ)</p>
              </div>
              {cart.map(item => (
                <div key={item.key} className="px-4 py-3 flex items-start justify-between gap-3 border-b border-stone-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 line-clamp-1">{item.name} <span className="text-stone-400 font-normal">×{item.quantity}</span></p>
                    {item.options.length > 0 && <p className="text-[11px] text-red-500 font-semibold mt-0.5">· {item.options.map(o => o.label).join(', ')}</p>}
                    {item.note && <p className="text-[11px] text-amber-600 font-semibold mt-0.5">📝 {item.note}</p>}
                  </div>
                  <p className="text-sm font-black text-stone-800 flex-shrink-0">฿{(item.unitPrice * item.quantity).toLocaleString()}</p>
                </div>
              ))}
              <div className="px-4 py-3 space-y-1.5 bg-white">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>ค่าอาหาร</span><span>฿{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>ค่าส่ง</span><span>฿{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-stone-900 pt-1.5 border-t border-stone-100">
                  <span>รวมทั้งหมด</span>
                  <span className="text-red-700">฿{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ── STEP 1: เลือกวิธีชำระ ── */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-xs font-black text-stone-500 uppercase tracking-widest">เลือกวิธีชำระเงิน</p>

                {[
                  {
                    value: 'transfer',
                    icon: (
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20"/>
                        </svg>
                      </div>
                    ),
                    label: 'ชำระทันที',
                    sub: 'โอนผ่านแอปธนาคาร + แนบสลีป',
                  },
                  {
                    value: 'cash',
                    icon: (
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                      </div>
                    ),
                    label: 'เก็บปลายทาง',
                    sub: 'ชำระเงินสดกับไรเดอร์เมื่อรับของ',
                  },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setPayMethod(opt.value)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${payMethod === opt.value ? 'border-red-500 bg-red-50 shadow-sm' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                    {opt.icon}
                    <div className="flex-1">
                      <p className={`font-black text-sm ${payMethod === opt.value ? 'text-red-800' : 'text-stone-700'}`}>{opt.label}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{opt.sub}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${payMethod === opt.value ? 'border-red-600 bg-red-600' : 'border-stone-300'}`}>
                      {payMethod === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}

                {errorMsg && <p className="text-rose-600 text-sm font-semibold text-center py-1">{errorMsg}</p>}

                <div className="flex gap-3 pt-1">
                  <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-stone-100 text-stone-600 font-bold text-sm hover:bg-stone-200 transition-colors active:scale-95">
                    ยกเลิก
                  </button>
                  {payMethod === 'cash' ? (
                    <button onClick={handleSubmit} disabled={sending}
                      className="flex-1 py-3.5 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-black text-sm shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-60">
                      {sending ? '⏳ กำลังส่ง...' : '✅ ยืนยันสั่งอาหาร'}
                    </button>
                  ) : (
                    <button onClick={() => setStep(2)}
                      className="flex-1 py-3.5 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-black text-sm shadow-lg shadow-red-200 active:scale-95 transition-all">
                      ถัดไป →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 2: ชำระทันที ── */}
            {step === 2 && (
              <div className="space-y-4">

                {/* กล่อง QR + ข้อมูลบัญชี */}
                <div className="border-2 border-stone-200 rounded-2xl overflow-hidden">
                  {/* ยอดชำระ */}
                  <div className="bg-red-700 px-4 py-3 text-center">
                    <p className="text-red-200 text-xs font-bold">ยอดชำระ</p>
                    <p className="text-white text-3xl font-black tracking-tight">฿{grandTotal.toLocaleString()}</p>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white px-4 py-5 flex flex-col items-center gap-3">
                    {settings.payment_qr_url ? (
                      <>
                        <div className="bg-blue-900 text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest">THAI QR PAYMENT</div>
                        <div className="p-2 border-2 border-stone-200 rounded-2xl bg-white shadow-sm">
                          <img src={settings.payment_qr_url} alt="QR PromptPay"
                            className="w-44 h-44 object-contain" />
                        </div>
                        <p className="text-xs text-stone-500 font-bold">สแกน QR เพื่อโอนเข้าบัญชี</p>
                      </>
                    ) : (
                      <div className="w-44 h-44 bg-stone-100 rounded-2xl flex items-center justify-center">
                        <p className="text-stone-400 text-xs font-bold text-center">ไม่มี QR Code<br/>กรุณาโอนตามบัญชีด้านล่าง</p>
                      </div>
                    )}
                  </div>

                  {/* ข้อมูลบัญชี */}
                  <div className="border-t border-stone-200 px-4 py-4 space-y-1.5 bg-stone-50 text-center">
                    {settings.payment_account_name && (
                      <p className="text-sm font-black text-stone-800">ชื่อ: {settings.payment_account_name}</p>
                    )}
                    {settings.payment_account_number && (
                      <p className="text-base font-black text-red-700 tracking-widest">{settings.payment_account_number}</p>
                    )}
                    {settings.payment_bank_name && (
                      <p className="text-xs text-stone-500 font-bold">ธนาคาร: {settings.payment_bank_name}</p>
                    )}
                  </div>
                </div>

                {/* อัปโหลดสลีป */}
                <div>
                  <p className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">แนบหลักฐานการโอนเงิน <span className="text-red-500">*</span></p>
                  <input ref={fileRef} type="file" accept="image/*" onChange={pickSlip} className="hidden" />
                  {slipPreview ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50">
                      <img src={slipPreview} alt="slip" className="w-14 h-14 object-cover rounded-xl flex-shrink-0 shadow-sm" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-black text-emerald-700">✅ แนบสลีปแล้ว</p>
                        <button onClick={() => fileRef.current?.click()} className="text-xs text-emerald-600 underline mt-0.5">เปลี่ยนรูป</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-red-400 bg-white text-red-500 font-black text-sm hover:bg-red-50 active:scale-[0.98] transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                      เลือกสลีป
                    </button>
                  )}
                </div>

                {/* ยอดที่โอน */}
                <div>
                  <p className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">
                    ยอดที่โอน (บาท) <span className="text-red-500">*ต้องตรงกับยอดชำระ</span>
                  </p>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                    placeholder={`${grandTotal}`} min={0}
                    className={`w-full border-2 rounded-2xl px-4 py-3.5 text-xl font-black text-center focus:ring-4 focus:outline-none transition-colors ${
                      payAmount && Number(payAmount) !== grandTotal
                        ? 'border-rose-400 bg-rose-50 text-rose-600 focus:ring-rose-100'
                        : payAmount && Number(payAmount) === grandTotal
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 focus:ring-emerald-100'
                        : 'border-stone-200 text-stone-800 focus:border-red-400 focus:ring-red-100'
                    }`} />
                  {payAmount && Number(payAmount) !== grandTotal && (
                    <p className="text-rose-600 text-xs font-bold mt-1.5">⚠️ ยอดไม่ตรง — ต้องโอน ฿{grandTotal.toLocaleString()} เท่านั้น</p>
                  )}
                  {payAmount && Number(payAmount) === grandTotal && (
                    <p className="text-emerald-600 text-xs font-bold mt-1.5">✅ ยอดถูกต้อง</p>
                  )}
                </div>

                {errorMsg && <p className="text-rose-600 text-sm font-semibold text-center">{errorMsg}</p>}

                <div className="flex gap-3">
                  <button onClick={() => { setStep(1); setErrorMsg('') }}
                    className="flex-1 py-3.5 rounded-2xl bg-stone-100 text-stone-600 font-bold text-sm hover:bg-stone-200 transition-colors active:scale-95">
                    ← กลับ
                  </button>
                  <button onClick={handleSubmit}
                    disabled={sending || !slipFile || !payAmount || Number(payAmount) !== grandTotal}
                    className="flex-1 py-3.5 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-black text-sm shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {sending ? '⏳ กำลังส่ง...' : '✅ สั่งซื้อ'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

/* ── SuccessModal ─────────────────────────────────────────────────── */
function SuccessModal({ order, onClose }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 text-center space-y-5" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center text-5xl shadow-lg">✅</div>
        <div>
          <h2 className="text-2xl font-black text-stone-900">ออเดอร์สำเร็จ!</h2>
          <p className="text-stone-500 text-sm mt-1">ออเดอร์ของคุณได้รับเรียบร้อยแล้ว</p>
        </div>
        <div className="bg-sky-50 rounded-2xl px-5 py-4 ring-1 ring-sky-100">
          <p className="text-xs text-sky-500 font-black uppercase tracking-widest mb-1">หมายเลขออเดอร์</p>
          <p className="text-4xl font-black text-blue-600">#{order.id}</p>
          {order.payment_method === 'transfer' && (
            <p className="text-xs text-amber-600 font-bold mt-2 bg-amber-50 rounded-xl px-3 py-1.5 ring-1 ring-amber-100">
              🔍 กำลังตรวจสอบสลีปโอนเงิน
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold text-sm hover:bg-stone-200 transition-colors">
            สั่งต่อ
          </button>
          <button onClick={() => navigate(`/track/${order.id}`)}
            className="flex-1 py-3 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-black text-sm shadow-lg active:scale-95 transition-all">
            📍 ติดตามออเดอร์
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── LocationPickerModal ──────────────────────────────────────────── */
function MapClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]) })
  return null
}
function MapRecenter({ pos }) {
  const map = useMap()
  useEffect(() => { map.flyTo(pos, 16, { duration: 0.8 }) }, [pos[0], pos[1]])
  return null
}

function LocationPickerModal({ initialPos, onConfirm, onClose }) {
  const DEFAULT_CENTER = [13.7563, 100.5018]  // Bangkok
  const [pos,      setPos]      = useState(initialPos || DEFAULT_CENTER)
  const [hasPin,   setHasPin]   = useState(!!initialPos)
  const [locating, setLocating] = useState(false)
  const [flyTo,    setFlyTo]    = useState(null)

  const handleMapClick = (latlng) => { setPos(latlng); setHasPin(true) }

  const handleGPS = () => {
    if (!navigator.geolocation) return alert('เบราว์เซอร์ไม่รองรับ GPS')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const p = [coords.latitude, coords.longitude]
        setPos(p); setHasPin(true); setFlyTo(p); setLocating(false)
      },
      () => { setLocating(false); alert('ไม่สามารถหาตำแหน่งได้') },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white" style={{ animation: 'slideUp 0.25s ease-out' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-cyan-500 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors active:scale-90">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-white">📍 ปักหมุดที่อยู่</h2>
          <p className="text-[11px] text-sky-100 truncate">แตะบนแผนที่เพื่อเลือกตำแหน่ง</p>
        </div>
        <button onClick={handleGPS} disabled={locating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-black transition-all active:scale-90 disabled:opacity-60">
          {locating ? '⏳' : '🎯'} {locating ? 'กำลังหา...' : 'GPS'}
        </button>
      </div>

      {/* Coords bar */}
      {hasPin && (
        <div className="px-4 py-2 bg-sky-50 border-b border-sky-100 flex items-center gap-2 flex-shrink-0">
          <span className="text-sky-600 text-sm">📌</span>
          <span className="text-xs text-sky-700 font-mono font-bold">{pos[0].toFixed(5)}, {pos[1].toFixed(5)}</span>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={pos} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          <MapClickHandler onClick={handleMapClick} />
          {flyTo && <MapRecenter pos={flyTo} />}
          {hasPin && <Marker position={pos} />}
        </MapContainer>
        {!hasPin && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-black/50 backdrop-blur-sm text-white text-sm font-bold px-4 py-2.5 rounded-2xl">
              👆 แตะแผนที่เพื่อปักหมุด
            </div>
          </div>
        )}
      </div>

      {/* Confirm */}
      <div className="px-4 py-4 bg-white border-t border-stone-100 flex-shrink-0">
        <button onClick={() => hasPin && onConfirm(pos)} disabled={!hasPin}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-base shadow-xl shadow-blue-300/40 active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100">
          ✅ ยืนยันตำแหน่งนี้
        </button>
      </div>
    </div>
  )
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

/* ══════════════════════════════════════════════════════════════════
   Main Delivery Order Page
══════════════════════════════════════════════════════════════════ */
export default function DeliveryOrderPage() {
  const navigate = useNavigate()

  // ── ข้อมูลลูกค้า (โหลดจาก localStorage) ──
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', note: '', location: null })
  const customerValid = customerInfo.name.trim() && customerInfo.phone.trim() && customerInfo.address.trim()

  // ── Map Picker ──
  const [showMapPicker, setShowMapPicker] = useState(false)

  // ── เมนู ──
  const [categories,     setCategories]     = useState([])
  const [menus,          setMenus]          = useState([])
  const [settings,       setSettings]       = useState({})
  const [restaurantName, setRestaurantName] = useState('ร้านอาหาร')
  const [menuLoading,    setMenuLoading]    = useState(true)
  const [activeCat,      setActiveCat]      = useState(0)
  const [viewMode,       setViewMode]       = useState('list')
  const [optionMenu,     setOptionMenu]     = useState(null)

  // ── ตะกร้า ──
  const [cart,      setCart]      = useState([])
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  // ── Tab (เหลือแค่ menu | cart) ──
  const [activeTab, setActiveTab] = useState('menu')

  // ── Modals ──
  const [showCheckout, setShowCheckout] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [showContact,  setShowContact]  = useState(false)

  // ── Socket ──
  const [connected, setConnected] = useState(false)
  const socketRef  = useRef(null)

  // ── โหลด profile จาก localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem('delivery_profile')
    if (saved) { try { const p = JSON.parse(saved); setCustomerInfo(p) } catch {} }
  }, [])

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('menu_availability_update', ({ menu_id, is_available }) => {
      setMenus(prev => prev.map(m => m.id === menu_id ? { ...m, is_available } : m))
    })
    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    setMenuLoading(true)
    Promise.allSettled([
      axios.get(`${API_BASE}/categories`),
      axios.get(`${API_BASE}/menus`),
      axios.get(`${API_BASE}/settings`),
    ]).then(([catRes, menuRes, settingsRes]) => {
      if (catRes.status === 'fulfilled') {
        setCategories([{ id: 0, name: 'ทั้งหมด' }, ...(catRes.value.data?.data ?? [])])
      }
      if (menuRes.status === 'fulfilled') {
        setMenus((menuRes.value.data?.data ?? []).map(m => ({ ...m, price: Number(m.price) })))
      }
      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value.data?.data || {}
        setSettings(s)
        if (s.restaurant_name) setRestaurantName(s.restaurant_name)
      }
    }).finally(() => setMenuLoading(false))
  }, [])

  /* ── Cart helpers ── */
  const addCartItem = useCallback((menuId, options, note) => {
    const key = cartKey(menuId, options, note)
    setCart(prev => {
      const ex = prev.find(i => i.key === key)
      if (ex) return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i)
      const menu = menus.find(m => m.id === menuId)
      if (!menu) return prev
      const optExtra = options.reduce((s, o) => s + (Number(o.extra) || 0), 0)
      return [...prev, { key, menuId, name: menu.name, basePrice: menu.price, unitPrice: menu.price + optExtra, options, note: note || '', quantity: 1, image_url: menu.image_url }]
    })
    setOptionMenu(null)
  }, [menus])

  const increment = useCallback((key) => setCart(prev => prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i)), [])
  const decrement = useCallback((key) => setCart(prev => {
    const item = prev.find(i => i.key === key)
    if (!item) return prev
    return item.quantity <= 1 ? prev.filter(i => i.key !== key) : prev.map(i => i.key === key ? { ...i, quantity: i.quantity - 1 } : i)
  }), [])

  const filtered    = activeCat === 0 ? menus : menus.filter(m => m.category_id === activeCat)
  const menuQty     = (menuId) => cart.filter(i => i.menuId === menuId).reduce((s, i) => s + i.quantity, 0)

  const handleSuccess = (order) => {
    setSuccessOrder(order)
    setCart([])
    setShowCheckout(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* ── Modals ── */}
      {showContact && <ContactModal settings={settings} onClose={() => setShowContact(false)} />}
      {optionMenu && (
        <OptionsModal menu={optionMenu} onConfirm={(opts, note) => addCartItem(optionMenu.id, opts, note)} onClose={() => setOptionMenu(null)} />
      )}
      {showCheckout && (
        <CheckoutModal
          cart={cart} cartTotal={cartTotal} customerInfo={customerInfo}
          settings={settings} onClose={() => setShowCheckout(false)} onSuccess={handleSuccess}
        />
      )}
      {successOrder && (
        <SuccessModal order={successOrder} onClose={() => { setSuccessOrder(null); setActiveTab('menu') }} />
      )}
      {showMapPicker && (
        <LocationPickerModal
          initialPos={customerInfo.location}
          onConfirm={(pos) => { setCustomerInfo(p => ({ ...p, location: pos })); setShowMapPicker(false) }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* ── Header ── */}
      <div className="bg-red-900 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        {/* Home/back button — circle "1" */}
        <button onClick={() => navigate('/', { state: { edit: true } })}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0 active:scale-90 transition-all">
          1
        </button>
        <div className="flex-1" />
        {/* ℹ️ Contact */}
        <button onClick={() => setShowContact(true)}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-base active:scale-90 transition-all">
          ℹ️
        </button>
        {/* ⏱ History */}
        <button onClick={() => navigate('/history')}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-base active:scale-90 transition-all">
          🕐
        </button>
        {/* 👤 Profile */}
        <button onClick={() => navigate('/', { state: { edit: true } })}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-base active:scale-90 transition-all">
          👤
        </button>
      </div>

      {/* Restaurant name + status strip */}
      <div className="bg-red-800 px-4 py-2 flex items-center justify-between">
        <span className="text-white/90 font-bold text-sm truncate">{restaurantName}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-300 animate-pulse' : 'bg-white/40'}`} />
          <span className="text-[10px] text-white/80 font-bold">{connected ? 'ออนไลน์' : 'ออฟไลน์'}</span>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* ─── TAB: เมนู ─── */}
        {activeTab === 'menu' && (
          <>
            {/* Category bar */}
            <div className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur-md border-b border-stone-200/60">
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-black transition-all duration-200 ${activeCat === cat.id ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-300/40 scale-105' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-sky-300 hover:text-blue-600'}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
                <button onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white ring-1 ring-stone-200 flex items-center justify-center text-stone-500 hover:ring-blue-400 hover:text-blue-600 transition-all shadow-sm active:scale-90">
                  {viewMode === 'list'
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
                  }
                </button>
              </div>
            </div>

            {menuLoading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3 p-4' : 'flex flex-col gap-2.5 px-4 py-3'}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-2xl h-24 shadow-sm border border-stone-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-sky-50 rounded-full flex items-center justify-center text-4xl mb-3">🍽️</div>
                  <p className="text-stone-700 font-bold">ยังไม่มีเมนู</p>
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className="flex flex-col gap-2.5 px-4 py-3">
                {filtered.map((menu, idx) => {
                  const qty     = menuQty(menu.id)
                  const isAvail = menu.is_available !== false
                  const cc      = getCatColor(menu.category_name)
                  return (
                    <div key={menu.id} style={{ animationDelay: `${idx * 20}ms`, animation: 'slideUp 0.3s ease-out both' }}
                      className={`group flex overflow-hidden bg-white rounded-2xl shadow-sm border transition-all duration-300 ${!isAvail ? 'border-stone-100 opacity-55' : qty > 0 ? 'border-blue-200 shadow-blue-50 hover:shadow-lg hover:shadow-blue-100/60' : 'border-stone-100 hover:shadow-lg hover:shadow-blue-100/60 hover:border-sky-100'}`}>
                      <div className="relative w-[92px] flex-shrink-0 self-stretch">
                        <ImageWithFallback src={menu.image_url} alt={menu.name} className={`w-full h-full object-cover transition-transform duration-500 ${isAvail ? 'group-hover:scale-105' : ''}`} />
                        {!isAvail && <div className="absolute inset-0 bg-stone-900/35 flex items-center justify-center"><span className="text-[9px] font-black text-white text-center px-1">หมด<br/>ชั่วคราว</span></div>}
                        {qty > 0 && isAvail && <div className="absolute top-1.5 left-1.5 min-w-[20px] h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-md">×{qty}</div>}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center px-3 py-2.5 gap-0.5">
                        {menu.category_name && <span className={`self-start text-[9px] font-black px-1.5 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>{menu.category_name}</span>}
                        <p className={`text-sm font-bold line-clamp-1 leading-snug ${isAvail ? 'text-stone-800' : 'text-stone-400'}`}>{menu.name}</p>
                        {menu.description && <p className="text-[11px] text-stone-400 line-clamp-1">{menu.description}</p>}
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`font-black text-base ${isAvail ? 'text-blue-600' : 'text-stone-400'}`}>฿{menu.price}</span>
                          {isAvail && (
                            <button onClick={() => {
                              const opts = Array.isArray(menu.options) ? menu.options : []
                              if (opts.length === 0) addCartItem(menu.id, [], '')
                              else setOptionMenu(menu)
                            }} className="w-8 h-8 bg-red-700 hover:bg-red-800 text-white rounded-full flex items-center justify-center text-xl font-black shadow-md active:scale-90 hover:scale-110 transition-all ring-2 ring-white">+</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4">
                {filtered.map((menu, idx) => {
                  const qty     = menuQty(menu.id)
                  const isAvail = menu.is_available !== false
                  const cc      = getCatColor(menu.category_name)
                  return (
                    <div key={menu.id} style={{ animationDelay: `${idx * 20}ms`, animation: 'slideUp 0.3s ease-out both' }}
                      className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 transition-all duration-300 ${isAvail ? 'hover:shadow-xl hover:shadow-blue-100 hover:-translate-y-1' : 'opacity-60'}`}>
                      <div className="relative h-36 overflow-hidden">
                        <ImageWithFallback src={menu.image_url} alt={menu.name} className={`w-full h-full object-cover transition-transform duration-500 ${isAvail ? 'group-hover:scale-110' : ''}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        {!isAvail && <span className="absolute top-2 left-2 bg-stone-800/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full">🚫 หมด</span>}
                        {qty > 0 && isAvail && <span className="absolute top-2 right-2 bg-white/95 text-blue-600 text-xs font-black px-2 py-0.5 rounded-full shadow-md ring-1 ring-blue-200">×{qty}</span>}
                        {isAvail && <button onClick={() => { const opts = Array.isArray(menu.options) ? menu.options : []; if (opts.length === 0) addCartItem(menu.id, [], ''); else setOptionMenu(menu) }} className="absolute bottom-2 right-2 w-10 h-10 bg-red-700 hover:bg-red-800 text-white rounded-full flex items-center justify-center text-2xl font-black shadow-lg active:scale-90 hover:scale-110 transition-transform ring-2 ring-white/30">+</button>}
                      </div>
                      <div className="p-3">
                        {menu.category_name && <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded-full mb-1.5 ${cc.bg} ${cc.text}`}>{menu.category_name}</span>}
                        <p className={`text-sm font-bold line-clamp-2 leading-snug mb-1.5 min-h-[2.5rem] ${isAvail ? 'text-stone-800' : 'text-stone-400'}`}>{menu.name}</p>
                        <span className={`font-black text-lg ${isAvail ? 'text-blue-600' : 'text-stone-400'}`}>฿{menu.price}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ─── TAB: ตะกร้า ─── */}
        {activeTab === 'cart' && (
          <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
            {cart.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-12 text-center">
                <div className="w-20 h-20 mx-auto bg-sky-50 rounded-full flex items-center justify-center text-4xl mb-4">🛒</div>
                <p className="text-stone-700 font-bold">ตะกร้าว่างเปล่า</p>
                <p className="text-stone-400 text-xs mt-1">ไปเลือกเมนูก่อนนะคะ</p>
                <button onClick={() => setActiveTab('menu')} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
                  ไปเลือกเมนู →
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-stone-100">
                    <h3 className="font-black text-stone-800">รายการอาหาร ({cartCount} รายการ)</h3>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {cart.map(item => (
                      <div key={item.key} className="px-4 py-3.5 flex items-start gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          <ImageWithFallback src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-stone-800 line-clamp-1">{item.name}</p>
                          {item.options.length > 0 && <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{item.options.map(o => o.label).join(', ')}</p>}
                          {item.note && <p className="text-[11px] text-rose-500 mt-0.5">📝 {item.note}</p>}
                          <p className="text-blue-600 font-black text-sm mt-1">฿{(item.unitPrice * item.quantity).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => decrement(item.key)} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-black transition-colors active:scale-90">−</button>
                          <span className="text-sm font-black w-5 text-center text-stone-800">{item.quantity}</span>
                          <button onClick={() => increment(item.key)} className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white font-black transition-colors active:scale-90">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ยอดรวม */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-5 py-4 space-y-2">
                  <div className="flex justify-between text-sm text-stone-600"><span>ค่าอาหาร</span><span className="font-bold">฿{cartTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-stone-600"><span>ค่าส่ง</span><span className="font-bold">฿{Number(settings.delivery_fee) || 30}</span></div>
                  <div className="flex justify-between font-black text-lg text-stone-900 pt-2 border-t border-stone-100">
                    <span>ยอดรวม</span><span className="text-blue-600">฿{(cartTotal + (Number(settings.delivery_fee) || 30)).toLocaleString()}</span>
                  </div>
                </div>

                {!customerValid && (
                  <div className="bg-amber-50 rounded-2xl px-4 py-3 ring-1 ring-amber-100 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-800">ยังไม่ได้กรอกข้อมูลจัดส่ง</p>
                      <button onClick={() => navigate('/profile')} className="text-xs text-amber-700 font-black underline">กดที่นี่เพื่อกรอกข้อมูล →</button>
                    </div>
                  </div>
                )}

                <button onClick={() => setShowCheckout(true)} disabled={!customerValid}
                  className="w-full py-4 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-black text-base shadow-xl shadow-red-300/40 active:scale-[0.98] transition-all disabled:opacity-40">
                  ✅ สั่งอาหาร · ฿{(cartTotal + (Number(settings.delivery_fee) || 30)).toLocaleString()}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Floating Cart Button (เมื่ออยู่ที่ Tab เมนู + มีสินค้า) ── */}
      {activeTab === 'menu' && cartCount > 0 && (
        <div className="fixed bottom-[4.5rem] left-1/2 -translate-x-1/2 z-30">
          <button onClick={() => setActiveTab('cart')}
            className="flex items-center gap-3 px-6 py-3.5 bg-red-700 hover:bg-red-800 text-white font-black rounded-full shadow-2xl shadow-red-400/50 active:scale-95 transition-all ring-2 ring-white"
            style={{ animation: 'slideUp 0.3s ease-out' }}>
            <span>🛒 ดูตะกร้า</span>
            <span className="w-6 h-6 bg-white text-red-600 rounded-full text-xs font-black flex items-center justify-center">{cartCount}</span>
            <span className="font-bold text-white/90 text-sm">฿{cartTotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* ── Bottom Nav Bar (2 tabs only) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-stone-200 shadow-lg">
        <div className="flex items-center h-16 max-w-lg mx-auto">
          {/* เมนูอาหาร */}
          <button onClick={() => setActiveTab('menu')}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90
              ${activeTab === 'menu' ? 'text-red-700' : 'text-stone-400 hover:text-stone-600'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10"/>
            </svg>
            <span className="text-[10px] font-bold">เมนูอาหาร</span>
            {activeTab === 'menu' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-red-600 rounded-full" />}
          </button>

          {/* ตะกร้า */}
          <button onClick={() => setActiveTab('cart')}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90
              ${activeTab === 'cart' ? 'text-red-700' : 'text-stone-400 hover:text-stone-600'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span className="text-[10px] font-bold">ตะกร้า</span>
            {cartCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-16px)] w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
            {activeTab === 'cart' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-red-600 rounded-full" />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
