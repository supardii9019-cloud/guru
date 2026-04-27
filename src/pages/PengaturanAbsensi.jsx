import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function hitungJarak(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function PengaturanAbsensi() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [settings, setSettings] = useState({
    sekolah_lat: '',
    sekolah_lng: '',
    radius_meter: '100',
    jam_masuk_batas: '08:00',
    jam_keluar_mulai: '12:00',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lokasiSaya, setLokasiSaya] = useState(null)
  const [loadingGPS, setLoadingGPS] = useState(false)
  const [preview, setPreview] = useState(null) // jarak preview ke titik sekolah

  useEffect(() => {
    if (role !== 'admin') { navigate('/'); return }
    fetchSettings()
  }, [role])

  const fetchSettings = async () => {
    setLoading(true)
    const { data } = await supabase.from('app_settings').select('*')
    if (data) {
      const map = {}
      data.forEach(d => { map[d.key] = d.value })
      setSettings(prev => ({ ...prev, ...map }))
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!settings.sekolah_lat || !settings.sekolah_lng) {
      return toast.error('Koordinat sekolah belum diisi!')
    }
    setSaving(true)
    const entries = Object.entries(settings).map(([key, value]) => ({ key, value }))
    for (const entry of entries) {
      await supabase
        .from('app_settings')
        .upsert({ key: entry.key, value: entry.value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    toast.success('✅ Pengaturan berhasil disimpan!')
    setSaving(false)
  }

  // Ambil lokasi saya sekarang
  const ambilLokasiSaya = () => {
    setLoadingGPS(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLokasiSaya({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoadingGPS(false)
        toast.success('Lokasi GPS berhasil diambil')
      },
      () => {
        toast.error('Gagal ambil GPS. Aktifkan lokasi di browser.')
        setLoadingGPS(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  // Pakai lokasi saya sebagai titik sekolah
  const pakaiLokasiSaya = () => {
    if (!lokasiSaya) return
    setSettings(prev => ({
      ...prev,
      sekolah_lat: lokasiSaya.lat.toFixed(7),
      sekolah_lng: lokasiSaya.lng.toFixed(7),
    }))
    toast.success('Koordinat sekolah diperbarui!')
  }

  // Preview jarak dari lokasi saya ke titik sekolah
  useEffect(() => {
    if (lokasiSaya && settings.sekolah_lat && settings.sekolah_lng) {
      const j = hitungJarak(
        lokasiSaya.lat, lokasiSaya.lng,
        parseFloat(settings.sekolah_lat), parseFloat(settings.sekolah_lng)
      )
      setPreview(Math.round(j))
    }
  }, [lokasiSaya, settings.sekolah_lat, settings.sekolah_lng])

  const RADIUS_OPTIONS = [50, 100, 150, 200, 300, 500]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-indigo-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">⚙️ Pengaturan Absensi</h1>
          <p className="text-indigo-200 text-xs">Titik lokasi, radius & jam absensi</p>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ─── TITIK KOORDINAT SEKOLAH ─── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <p className="font-bold text-gray-700 text-sm">📍 Titik Lokasi Sekolah</p>

          {/* Ambil GPS saya */}
          <button
            onClick={ambilLokasiSaya}
            disabled={loadingGPS}
            className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingGPS
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Mengambil GPS...</>
              : '📱 Ambil Lokasi GPS Saya Sekarang'}
          </button>

          {lokasiSaya && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700">📱 Lokasi Saya:</p>
              <p className="text-xs font-mono text-blue-600">
                {lokasiSaya.lat.toFixed(7)}, {lokasiSaya.lng.toFixed(7)}
              </p>
              {preview !== null && (
                <p className="text-xs text-blue-600">
                  Jarak ke titik sekolah: <strong>{preview} meter</strong>
                  {preview <= parseInt(settings.radius_meter)
                    ? ' ✅ (dalam radius)'
                    : ' ⚠️ (di luar radius)'}
                </p>
              )}
              <button
                onClick={pakaiLokasiSaya}
                className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg"
              >
                ✅ Gunakan Lokasi Ini Sebagai Titik Sekolah
              </button>
            </div>
          )}

          {/* Input manual koordinat */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium">Atau isi manual:</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0000001"
                  value={settings.sekolah_lat}
                  onChange={e => setSettings(p => ({ ...p, sekolah_lat: e.target.value }))}
                  placeholder="-6.2000000"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0000001"
                  value={settings.sekolah_lng}
                  onChange={e => setSettings(p => ({ ...p, sekolah_lng: e.target.value }))}
                  placeholder="106.8166660"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {settings.sekolah_lat && settings.sekolah_lng && (
            <a
              href={`https://maps.google.com/?q=${settings.sekolah_lat},${settings.sekolah_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-blue-600 underline"
            >
              🗺️ Lihat di Google Maps
            </a>
          )}
        </div>

        {/* ─── RADIUS ─── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="font-bold text-gray-700 text-sm">📏 Radius Area Absensi</p>
          <div className="grid grid-cols-3 gap-2">
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setSettings(p => ({ ...p, radius_meter: String(r) }))}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                  settings.radius_meter === String(r)
                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {r} m
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Atau ketik sendiri (meter)</label>
            <input
              type="number"
              value={settings.radius_meter}
              onChange={e => setSettings(p => ({ ...p, radius_meter: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* ─── JAM ABSENSI ─── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="font-bold text-gray-700 text-sm">🕐 Pengaturan Jam</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Batas Jam Masuk</label>
              <input
                type="time"
                value={settings.jam_masuk_batas}
                onChange={e => setSettings(p => ({ ...p, jam_masuk_batas: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">Lewat waktu ini = terlambat</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Jam Keluar Mulai</label>
              <input
                type="time"
                value={settings.jam_keluar_mulai}
                onChange={e => setSettings(p => ({ ...p, jam_keluar_mulai: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">Sebelum ini = belum bisa keluar</p>
            </div>
          </div>
        </div>

        {/* ─── RINGKASAN ─── */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-indigo-700">📋 Ringkasan Pengaturan Aktif:</p>
          <div className="space-y-1 text-xs text-indigo-600">
            <p>📍 Koordinat: <strong>{settings.sekolah_lat || '?'}, {settings.sekolah_lng || '?'}</strong></p>
            <p>📏 Radius: <strong>{settings.radius_meter} meter</strong></p>
            <p>🕐 Batas masuk: <strong>{settings.jam_masuk_batas}</strong> | Keluar mulai: <strong>{settings.jam_keluar_mulai}</strong></p>
          </div>
        </div>

        {/* Simpan */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 text-base"
        >
          {saving
            ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Menyimpan...</>
            : '💾 Simpan Pengaturan'}
        </button>
      </div>
    </div>
  )
}
