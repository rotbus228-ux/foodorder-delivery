import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const API_BASE    = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`
const PROFILE_KEY = 'delivery_profile'

/* ── Map helpers ─────────────────────────────────────────────────── */
function MapClickHandler({ onClick }) {
  useMapEvents({ click: e => onClick([e.latlng.lat, e.latlng.lng]) })
  return null
}
function MapRecenter({ pos }) {
  const map = useMap()
  useEffect(() => { map.flyTo(pos, 16, { duration: 0.8 }) }, [pos[0], pos[1]])
  return null
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
          <button onClick={onClose} className="w-full py-3 rounded-xl border-2 border-stone-200 font-bold text-stone-700 hover:bg-stone-50 transition-colors">ปิด</button>
        </div>
      </div>
    </div>
  )
}

/* ── Map Picker Modal ────────────────────────────────────────────── */
function MapPickerModal({ initialPos, onConfirm, onClose }) {
  const DEFAULT = [13.7563, 100.5018]
  const [pos,      setPos]      = useState(initialPos || DEFAULT)
  const [hasPin,   setHasPin]   = useState(!!initialPos)
  const [locating, setLocating] = useState(false)
  const [flyTo,    setFlyTo]    = useState(null)

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
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="bg-red-900 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold">✕</button>
        <div className="flex-1">
          <h2 className="text-base font-black text-white">📍 ปักหมุดที่อยู่</h2>
          <p className="text-[11px] text-red-200">แตะบนแผนที่เพื่อเลือกตำแหน่ง</p>
        </div>
        <button onClick={handleGPS} disabled={locating}
          className="px-3 py-1.5 rounded-xl bg-white/20 text-white text-xs font-black disabled:opacity-60">
          {locating ? '⏳ กำลังหา...' : '🎯 GPS'}
        </button>
      </div>
      {hasPin && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex-shrink-0">
          <span className="text-xs text-red-700 font-mono font-bold">📌 {pos[0].toFixed(5)}, {pos[1].toFixed(5)}</span>
        </div>
      )}
      <div className="flex-1 relative">
        <MapContainer center={pos} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onClick={p => { setPos(p); setHasPin(true) }} />
          {flyTo && <MapRecenter pos={flyTo} />}
          {hasPin && <Marker position={pos} />}
        </MapContainer>
        {!hasPin && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-black/50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl">👆 แตะแผนที่เพื่อปักหมุด</div>
          </div>
        )}
      </div>
      <div className="px-4 py-4 bg-white border-t border-stone-100 flex-shrink-0">
        <button onClick={() => hasPin && onConfirm(pos)} disabled={!hasPin}
          className="w-full py-4 rounded-2xl bg-red-700 text-white font-black text-base disabled:opacity-40">
          ✅ ยืนยันตำแหน่งนี้
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Profile Page  (ใช้เป็น Home Page ด้วย)
══════════════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  // ถ้า state.edit = true = มาจากหน้าเมนู (ต้องการแก้ไข) → ไม่ auto-redirect
  const isEditMode = location.state?.edit === true

  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '', location: null })
  const [hasProfile,   setHasProfile]   = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [showMap,      setShowMap]      = useState(false)
  const [showContact,  setShowContact]  = useState(false)
  const [settings,     setSettings]     = useState({})

  /* ── โหลด profile จาก localStorage ── */
  useEffect(() => {
    const s = localStorage.getItem(PROFILE_KEY)
    if (s) {
      try {
        const p = JSON.parse(s)
        setForm(p)
        const complete = !!(p.name?.trim() && p.phone?.trim() && p.address?.trim())
        setHasProfile(complete)
        // ถ้าข้อมูลครบและไม่ใช่ edit mode → ไปหน้าเมนูเลย
        if (complete && !isEditMode) {
          navigate('/order', { replace: true })
          return
        }
      } catch {}
    }
    axios.get(`${API_BASE}/settings`).then(r => setSettings(r.data?.data || {})).catch(() => {})
  }, [])

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      alert('กรุณากรอก ชื่อ, เบอร์โทร และที่อยู่ให้ครบ')
      return
    }
    setSaving(true)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(form))
    setSaved(true)
    setSaving(false)
    // หลัง save → ไปหน้าเมนูเลย
    setTimeout(() => navigate('/order', { replace: true }), 600)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* ── Contact Modal ── */}
      {showContact && <ContactModal settings={settings} onClose={() => setShowContact(false)} />}

      {/* ── Map Picker ── */}
      {showMap && (
        <MapPickerModal
          initialPos={form.location}
          onConfirm={pos => { setField('location', pos); setShowMap(false) }}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* ── Header ── */}
      <div className="bg-red-900 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        {/* ปุ่ม back (แสดงเฉพาะ edit mode) */}
        {isEditMode ? (
          <button onClick={() => navigate('/order')}
            className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            1
          </button>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center text-white text-2xl flex-shrink-0">🛵</div>
        )}
        <div className="flex-1 px-1">
          <p className="text-white font-black text-sm leading-none">ข้อมูลที่อยู่</p>
          <p className="text-red-200 text-[10px] mt-0.5">กรอกข้อมูลเพื่อรับอาหาร</p>
        </div>
        <button onClick={() => setShowContact(true)}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-base">ℹ️</button>
        <button onClick={() => navigate('/history', { state: { edit: true } })}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-base">🕐</button>
        <button
          className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center text-white text-base ring-2 ring-white/60">👤</button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="px-4 pt-5 pb-2 max-w-lg mx-auto">

          {/* Banner — ถ้ามีข้อมูลแล้ว แสดงปุ่มข้ามเข้าเมนูด่วน */}
          {hasProfile && isEditMode && (
            <button onClick={() => navigate('/order')}
              className="w-full mb-4 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-300/40 active:scale-[0.98] transition-all">
              ✅ ข้อมูลครบแล้ว — เข้าสู่เมนูอาหาร →
            </button>
          )}

          <h1 className="text-xl font-black text-stone-800 mb-1">ข้อมูลที่อยู่</h1>
          <p className="text-sm text-stone-500 mb-4">กรอกข้อมูลเพื่อให้เราส่งอาหารถึงบ้านคุณ</p>
        </div>

        <div className="px-4 max-w-lg mx-auto space-y-4">
          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-4">

            {/* ชื่อ */}
            <div>
              <label className="text-sm font-bold text-stone-600 block mb-1.5">
                ชื่อ-นามสกุล <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.name} onChange={e => setField('name', e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base text-stone-800 placeholder-stone-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none bg-stone-50" />
            </div>

            {/* เบอร์โทรศัพท์ */}
            <div>
              <label className="text-sm font-bold text-stone-600 block mb-1.5">
                เบอร์โทรศัพท์ <span className="text-red-500">*</span>
              </label>
              <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                placeholder="08x-xxx-xxxx"
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base text-stone-800 placeholder-stone-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none bg-stone-50" />
            </div>

            {/* ที่อยู่ */}
            <div>
              <label className="text-sm font-bold text-stone-600 block mb-1.5">
                ที่อยู่จัดส่ง <span className="text-red-500">*</span>
              </label>
              <textarea value={form.address} onChange={e => setField('address', e.target.value)}
                placeholder="บ้านเลขที่ / หมู่บ้าน / ซอย / ถนน / แขวง / เขต"
                rows={3}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base text-stone-800 placeholder-stone-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none resize-none bg-stone-50" />
            </div>

            {/* หมายเหตุ */}
            <div>
              <label className="text-sm font-bold text-stone-600 block mb-1.5">หมายเหตุ (ถ้ามี)</label>
              <textarea value={form.note || ''} onChange={e => setField('note', e.target.value)}
                placeholder="เช่น บ้านอยู่ปลายซอย / สีบ้าน / สัญลักษณ์..."
                rows={2}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base text-stone-800 placeholder-stone-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none resize-none bg-stone-50" />
            </div>

            {/* ปักหมุด */}
            <div>
              <label className="text-sm font-bold text-stone-600 block mb-1.5">ปักหมุดที่อยู่ (ไม่บังคับ)</label>
              <button onClick={() => setShowMap(true)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${form.location ? 'border-red-300 bg-red-50' : 'border-dashed border-stone-300 hover:border-red-300 hover:bg-red-50'}`}>
                <span className="text-2xl">🗺️</span>
                <div className="flex-1 text-left">
                  {form.location
                    ? <>
                        <p className="text-sm font-bold text-red-800">{form.location[0].toFixed(5)}, {form.location[1].toFixed(5)}</p>
                        <p className="text-[11px] text-red-600 mt-0.5">แตะเพื่อเปลี่ยนตำแหน่ง</p>
                      </>
                    : <p className="text-sm text-stone-500 font-bold">กดเพื่อปักหมุดบนแผนที่</p>
                  }
                </div>
                {form.location && (
                  <button onClick={e => { e.stopPropagation(); setField('location', null) }}
                    className="w-7 h-7 bg-stone-200 hover:bg-red-100 rounded-full flex items-center justify-center text-stone-500 text-xs">✕</button>
                )}
                <span className="text-red-600 text-lg">✏️</span>
              </button>
            </div>
          </div>

          {/* Save success message */}
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
              <span className="text-green-700 font-bold text-sm">✅ บันทึกแล้ว! กำลังเข้าสู่เมนู...</span>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3 pb-2">
            {/* Save + เข้าเมนู */}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-4 rounded-2xl bg-red-700 text-white font-black text-base hover:bg-red-800 active:scale-[0.98] transition-all shadow-lg shadow-red-300/40 disabled:opacity-60">
              {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก & เข้าสู่เมนูอาหาร →'}
            </button>

            {/* ข้ามไปเลย (ไม่กรอก) */}
            <button onClick={() => navigate('/order')}
              className="w-full py-3 rounded-2xl border-2 border-stone-300 text-stone-500 font-bold text-sm hover:bg-stone-100 transition-colors">
              ข้ามขั้นตอนนี้ — เข้าดูเมนูก่อน
            </button>
          </div>
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
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
