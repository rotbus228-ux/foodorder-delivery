import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function LandingPage() {
  const [restaurantName, setRestaurantName] = useState('ร้านอาหาร Delivery')
  const navigate = useNavigate()

  useEffect(() => {
    axios.get(`${API_BASE}/api/settings`)
      .then(res => {
        const name = res.data?.data?.restaurant_name
        if (name) setRestaurantName(name)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 flex flex-col items-center justify-center p-6">

      {/* ─── Decorative Blobs ─── */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-cyan-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute top-1/3 right-10 w-40 h-40 bg-sky-200/20 rounded-full blur-2xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      {/* ─── Brand ─── */}
      <div className="relative text-center mb-10" style={{ animation: 'fadeIn 0.6s ease-out' }}>
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-white/30 blur-2xl rounded-full" />
          <div className="relative w-28 h-28 bg-white/25 backdrop-blur-xl rounded-3xl flex items-center justify-center text-7xl mx-auto shadow-2xl ring-1 ring-white/40 hover:scale-105 transition-transform duration-500">
            🛵
          </div>
        </div>
        <h1 className="mt-6 text-4xl font-black text-white tracking-tight drop-shadow-lg">
          {restaurantName}
        </h1>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
          <p className="text-sky-50 text-xs font-medium tracking-wide">บริการ Delivery — ส่งถึงบ้านคุณ</p>
        </div>
      </div>

      {/* ─── Card ─── */}
      <div className="relative w-full max-w-sm">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-300 to-cyan-300 rounded-[2rem] blur opacity-40" />
        <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl p-7 space-y-4 ring-1 ring-white/60">

          <div className="text-center pb-2">
            <h2 className="text-2xl font-black text-gray-900">ยินดีต้อนรับ 👋</h2>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              สั่งอาหารง่ายๆ แค่กดปุ่มเดียว<br />
              เราส่งให้ถึงหน้าบ้านคุณ
            </p>
          </div>

          {/* ปุ่มสั่งอาหาร Delivery */}
          <button
            onClick={() => navigate('/order')}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white rounded-2xl py-5 font-black text-lg shadow-xl shadow-blue-400/40 active:scale-[0.98] transition-all hover:shadow-2xl hover:shadow-blue-400/50"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <span className="relative flex items-center justify-center gap-3">
              <span className="text-2xl">🛒</span>
              สั่งอาหาร Delivery
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </span>
          </button>

          {/* ─── Feature Pills ─── */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { icon: '⚡', text: 'รวดเร็ว' },
              { icon: '🔥', text: 'อาหารร้อน' },
              { icon: '📍', text: 'ติดตามได้' },
            ].map(f => (
              <div key={f.text} className="flex flex-col items-center gap-1 bg-sky-50 rounded-2xl py-3 ring-1 ring-sky-100">
                <span className="text-xl">{f.icon}</span>
                <span className="text-[11px] font-bold text-sky-700">{f.text}</span>
              </div>
            ))}
          </div>

          {/* ─── History Link ─── */}
          <button
            onClick={() => navigate('/history')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-sky-100 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-sm transition-all active:scale-[0.98]"
          >
            <span className="text-base">📦</span>
            ดูประวัติออเดอร์ของฉัน
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Admin link ─── */}
      <div className="relative mt-10">
        <a href="/admin/login" className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20 text-white/80 text-sm font-medium hover:bg-white/20 hover:text-white transition-all">
          <span>🔧</span>
          <span>Admin Dashboard</span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
