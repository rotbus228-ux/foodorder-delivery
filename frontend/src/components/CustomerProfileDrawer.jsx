import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/adminAuth'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

const STATUS_LABEL = {
  pending_payment:  { label: 'รอสลีป',     color: 'bg-blue-50 text-blue-700'        },
  pending:          { label: 'สั่งซื้อแล้ว', color: 'bg-orange-50 text-orange-700'    },
  preparing:        { label: 'กำลังเตรียม', color: 'bg-orange-50 text-orange-700'    },
  out_for_delivery: { label: 'กำลังส่ง',    color: 'bg-violet-50 text-violet-700'    },
  delivered:        { label: 'เสร็จสิ้น',   color: 'bg-emerald-50 text-emerald-700'  },
  cancelled:        { label: 'ยกเลิก',      color: 'bg-stone-100 text-stone-500'     },
}

const normPhone = p => String(p || '').replace(/\D/g, '')

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
function timeAgo(s) {
  const mins = Math.floor((Date.now() - parseUTC(s)) / 60000)
  if (mins < 1)    return 'เพิ่งสั่ง'
  if (mins < 60)   return `${mins} นาทีที่แล้ว`
  if (mins < 1440) return `${Math.floor(mins/60)} ชม.ที่แล้ว`
  return `${Math.floor(mins/1440)} วันที่แล้ว`
}

export default function CustomerProfileDrawer({ phone, customerName, onClose, onBanChanged }) {
  const np = normPhone(phone)
  const [banned,     setBanned]     = useState(false)
  const [checking,   setChecking]   = useState(true)
  const [banLoading, setBanLoading] = useState(false)
  const [orders,     setOrders]     = useState([])
  const [loading,    setLoading]    = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [banRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE}/delivery/check-ban`, { params: { phone: np } }),
        axios.get(`${API_BASE}/delivery/orders`, { headers: getAuthHeaders() }),
      ])
      setBanned(!!banRes.data?.banned)
      const all = ordersRes.data?.data || []
      setOrders(all.filter(o => normPhone(o.customer_phone) === np))
    } catch (err) {
      console.error('[CustomerProfileDrawer]', err)
    } finally {
      setChecking(false)
      setLoading(false)
    }
  }, [np])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleBan = async () => {
    if (!banned && !confirm(`แบนเบอร์ ${phone} ใช่หรือไม่?\n\nลูกค้าจะไม่สามารถสั่งอาหารได้อีก จนกว่าจะปลดแบน`)) return
    setBanLoading(true)
    try {
      if (banned) {
        await axios.delete(`${API_BASE}/admin/ban-phone/${np}`, { headers: getAuthHeaders() })
        setBanned(false)
      } else {
        await axios.post(`${API_BASE}/admin/ban-phone`, { phone: np }, { headers: getAuthHeaders() })
        setBanned(true)
      }
      onBanChanged?.(np, !banned)
    } catch (err) {
      alert(err.response?.data?.message || 'ทำรายการไม่สำเร็จ')
    } finally {
      setBanLoading(false)
    }
  }

  const latest      = orders[0]
  const totalSpent  = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_price || 0), 0)
  const displayName = customerName || latest?.customer_name || '—'
  const address     = latest?.delivery_address

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: 'fadeIn .2s ease-out' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
        style={{ animation: 'slideUp .3s cubic-bezier(.16,1,.3,1)' }}>

        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>

        {/* Header */}
        <div className={`px-5 py-4 flex items-center gap-3 flex-shrink-0 ${banned ? 'bg-gradient-to-r from-stone-700 to-stone-900' : 'bg-gradient-to-r from-red-900 to-red-700'}`}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
            {banned ? '🚫' : (displayName?.charAt(0) || '?')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-black text-white text-base truncate">{displayName}</p>
              {banned && (
                <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                  BANNED
                </span>
              )}
            </div>
            <a href={`tel:${phone}`} className={`text-sm font-bold ${banned ? 'text-stone-300' : 'text-red-200'}`}>{phone}</a>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Ban action bar */}
        <div className="px-5 py-3 border-b border-stone-100 flex-shrink-0 bg-stone-50">
          {checking ? (
            <div className="text-center py-1 text-xs text-stone-400 font-bold">⏳ กำลังตรวจสถานะ...</div>
          ) : banned ? (
            <button onClick={toggleBan} disabled={banLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-sm shadow-emerald-200 active:scale-95 transition-all disabled:opacity-60">
              {banLoading ? '⏳ กำลังประมวลผล...' : '✅ ปลดแบนเบอร์นี้'}
            </button>
          ) : (
            <button onClick={toggleBan} disabled={banLoading}
              className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black text-sm active:scale-95 transition-all disabled:opacity-60">
              {banLoading ? '⏳ กำลังประมวลผล...' : '🚫 แบนเบอร์นี้ — ไม่ให้สั่งได้อีก'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100 flex-shrink-0">
          {[
            { label: 'ออเดอร์',         value: orders.length,                  unit: 'ครั้ง' },
            { label: 'ยอดรวม',          value: `฿${totalSpent.toLocaleString()}`, unit: '' },
            { label: 'ล่าสุด',           value: latest ? timeAgo(latest.created_at) : '—', unit: '' },
          ].map((s, i) => (
            <div key={i} className="px-3 py-3 text-center">
              <p className="text-sm font-black text-stone-800 truncate">{s.value}<span className="text-[10px] font-normal text-stone-400 ml-1">{s.unit}</span></p>
              <p className="text-[10px] text-stone-400 font-bold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Address */}
        {address && (
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex-shrink-0">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">📍 ที่อยู่ล่าสุด</p>
            <p className="text-sm font-bold text-stone-700">{address}</p>
          </div>
        )}

        {/* Order list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            <p className="text-xs font-black text-stone-400 px-1">ประวัติออเดอร์ ({orders.length})</p>
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="bg-stone-100 rounded-xl h-14 animate-pulse" />)
            ) : orders.length === 0 ? (
              <div className="text-center py-10 text-stone-400">
                <p className="text-3xl">📭</p>
                <p className="text-sm font-bold mt-2">ยังไม่มีออเดอร์</p>
              </div>
            ) : (
              orders.map(o => {
                const sc = STATUS_LABEL[o.status] || STATUS_LABEL.pending
                return (
                  <div key={o.id} className="bg-white rounded-xl border border-stone-100 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-700">#{o.id}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5">{fmtDate(o.created_at)}</p>
                    </div>
                    <p className="text-sm font-black text-red-700 flex-shrink-0">฿{Number(o.total_price).toLocaleString()}</p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
