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

function getDeviceId() {
  let id = localStorage.getItem('device_id')
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('device_id', id)
  }
  return id
}

const STATUS_COLOR = {
  hadir: 'text-green-600 bg-green-50',
  terlambat: 'text-orange-600 bg-orange-50',
  sakit: 'text-yellow-600 bg-yellow-50',
  izin: 'text-blue-600 bg-blue-50',
  alpha: 'text-red-600 bg-red-50',
}

export default function AbsensiMandiri() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const deviceId = useRef(getDeviceId())
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [tab, setTab] = useState('masuk')
  const [cfg, setCfg] = useState(null)
  const [lokasi, setLokasi] = useState(null)
  const [lokasiError, setLokasiError] = useState('')
  const [loadingLokasi, setLoadingLokasi] = useState(false)
  const [jarak, setJarak] = useState(null)
  const [dalamRadius, setDalamRadius] = useState(false)
  const [absenHariIni, setAbsenHariIni] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [loadingAbsen, setLoadingAbsen] = useState(false)
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)
  const [sudahMasuk, setSudahMasuk] = useState(false)
  const [sudahKeluar, setSudahKeluar] = useState(false)
  const [kameraAktif, setKameraAktif] = useState(false)
  const [fotoDataUrl, setFotoDataUrl] = useState(null)
  const [loadingKamera, setLoadingKamera] = useState(false)
  const [kameraError, setKameraError] = useState('')
  const [modeFoto, setModeFoto] = useState('gps')

  const tanggal = new Date().toISOString().split('T')[0]
  const jamSekarang = new Date().toTimeString().slice(0, 5)

  useEffect(() => {
    fetchSettings()
    if (pegawai) cekAbsenHariIni()
    return () => stopKamera()
  }, [pegawai])

  useEffect(() => {
    if (tab === 'riwayat') fetchRiwayat()
    if (tab !== 'masuk' && tab !== 'keluar') stopKamera()
  }, [tab])

  useEffect(() => {
    if (cfg && lokasi) {
      const j = hitungJarak(lokasi.latitude, lokasi.longitude, cfg.lat, cfg.lng)
      setJarak(Math.round(j))
      setDalamRadius(j <= cfg.radius)
    }
  }, [cfg, lokasi])

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*')
    if (data && data.length > 0) {
      const map = {}
      data.forEach(d => { map[d.key] = d.value })
      setCfg({
        lat: parseFloat(map.sekolah_lat || '-6.2'),
        lng: parseFloat(map.sekolah_lng || '106.816'),
        radius: parseInt(map.radius_meter || '100'),
        jamMasukBatas: map.jam_masuk_batas || '08:00',
        jamKeluarMulai: map.jam_keluar_mulai || '12:00',
      })
    } else {
      setCfg({ lat: -6.2, lng: 106.816, radius: 100, jamMasukBatas: '08:00', jamKeluarMulai: '12:00' })
    }
  }

  const cekAbsenHariIni = async () => {
    const { data } = await supabase
      .from('absensi_pegawai').select('*')
      .eq('pegawai_id', pegawai.id).eq('tanggal', tanggal).single()
    if (data) {
      setAbsenHariIni(data)
      setSudahMasuk(!!data.jam_masuk)
      setSudahKeluar(!!data.jam_keluar)
    }
  }

  const fetchRiwayat = async () => {
    setLoadingRiwayat(true)
    const { data } = await supabase
      .from('absensi_pegawai').select('*')
      .eq('pegawai_id', pegawai.id)
      .order('tanggal', { ascending: false }).limit(30)
    setRiwayat(data || [])
    setLoadingRiwayat(false)
  }

  const ambilLokasi = () => {
    setLoadingLokasi(true)
    setLokasiError('')
    if (!navigator.geolocation) { setLokasiError('Browser tidak mendukung GPS'); setLoadingLokasi(false); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLokasi({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setLoadingLokasi(false)
      },
      (err) => {
        setLokasiError(err.code === 1 ? 'Izin lokasi ditolak.' : err.code === 2 ? 'Lokasi tidak dapat ditentukan.' : 'Timeout. Pastikan GPS aktif.')
        setLoadingLokasi(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const startKamera = async () => {
    setKameraError('')
    setLoadingKamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setKameraAktif(true)
      setFotoDataUrl(null)
    } catch { setKameraError('Kamera tidak dapat diakses. Pastikan izin kamera diberikan.') }
    setLoadingKamera(false)
  }

  const stopKamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setKameraAktif(false)
  }

  const ambilFoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setFotoDataUrl(canvas.toDataURL('image/jpeg', 0.7))
    stopKamera()
    toast.success('Foto berhasil diambil!')
  }

  const cekDevice = () => {
    const stored = localStorage.getItem(`device_pegawai_${pegawai.id}`)
    if (stored && stored !== deviceId.current) { toast.error('Absensi hanya bisa dari 1 perangkat yang sama!'); return false }
    return true
  }

  const handleAbsen = async (tipe) => {
    if (!cfg) return
    if (modeFoto === 'gps' && !lokasi) return toast.error('Ambil lokasi GPS dulu!')
    if (modeFoto === 'gps' && !dalamRadius) return toast.error(`Kamu di luar area sekolah (${jarak}m)`)
    if (modeFoto === 'kamera' && !fotoDataUrl) return toast.error('Ambil foto selfie dulu!')
    if (!cekDevice()) return

    const jam = new Date().toTimeString().slice(0, 5)

    if (tipe === 'masuk') {
      if (sudahMasuk) return toast.error('Sudah absen masuk hari ini!')
      setLoadingAbsen(true)
      const terlambat = jam > cfg.jamMasukBatas
      const payload = { pegawai_id: pegawai.id, tanggal, jam_masuk: jam, status: terlambat ? 'terlambat' : 'hadir', device_id: deviceId.current }
      if (lokasi) { payload.latitude_masuk = lokasi.latitude; payload.longitude_masuk = lokasi.longitude }
      if (fotoDataUrl) payload.foto_masuk = fotoDataUrl
      const { error } = await supabase.from('absensi_pegawai').upsert([payload], { onConflict: 'pegawai_id,tanggal' })
      if (error) { toast.error('Gagal: ' + error.message) }
      else { localStorage.setItem(`device_pegawai_${pegawai.id}`, deviceId.current); toast.success(`✅ Absen Masuk ${jam}${terlambat ? ' — ⚠️ Terlambat' : ''}`); setSudahMasuk(true); setFotoDataUrl(null); cekAbsenHariIni() }
    } else {
      if (!sudahMasuk) return toast.error('Belum absen masuk!')
      if (sudahKeluar) return toast.error('Sudah absen keluar hari ini!')
      if (jam < cfg.jamKeluarMulai) return toast.error(`Absen keluar baru bisa setelah ${cfg.jamKeluarMulai}`)
      setLoadingAbsen(true)
      const payload = { jam_keluar: jam }
      if (lokasi) { payload.latitude_keluar = lokasi.latitude; payload.longitude_keluar = lokasi.longitude }
      if (fotoDataUrl) payload.foto_keluar = fotoDataUrl
      const { error } = await supabase.from('absensi_pegawai').update(payload).eq('pegawai_id', pegawai.id).eq('tanggal', tanggal)
      if (error) { toast.error('Gagal: ' + error.message) }
      else { toast.success(`✅ Absen Keluar ${jam}`); setSudahKeluar(true); setFotoDataUrl(null); cekAbsenHariIni() }
    }
    setLoadingAbsen(false)
  }

  const isMasuk = tab === 'masuk'
  const sudah = isMasuk ? sudahMasuk : sudahKeluar
  const warnaBg = isMasuk ? 'bg-emerald-600' : 'bg-red-500'
  const warnaBtn = isMasuk ? 'bg-emerald-600' : 'bg-red-500'
  const batasJam = !isMasuk && cfg && jamSekarang < cfg.jamKeluarMulai

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className={`${isMasuk ? 'bg-emerald-600' : 'bg-red-500'} text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md transition-colors`}>
        <button onClick={() => { stopKamera(); navigate('/') }} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">🕐 Absensi Mandiri</h1>
          <p className="text-white/70 text-xs">{pegawai?.nama} • {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {absenHariIni && (
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">📋 Status Hari Ini</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-gray-50 rounded-xl p-2">
              <p className="text-[10px] text-gray-400">Status</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[absenHariIni.status] || 'text-gray-500 bg-gray-100'}`}>{absenHariIni.status || '-'}</span>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-2">
              <p className="text-[10px] text-gray-400">Masuk</p>
              <p className="text-sm font-bold text-gray-700">{absenHariIni.jam_masuk || '-'}</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-2">
              <p className="text-[10px] text-gray-400">Keluar</p>
              <p className="text-sm font-bold text-gray-700">{absenHariIni.jam_keluar || '-'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex bg-white mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
        {[{ key: 'masuk', label: '🟢 Masuk' }, { key: 'keluar', label: '🔴 Keluar' }, { key: 'riwayat', label: '📅 Riwayat' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === t.key ? (t.key === 'masuk' ? 'bg-emerald-600' : t.key === 'keluar' ? 'bg-red-500' : 'bg-gray-600') + ' text-white' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* ── TAB MASUK / KELUAR ── */}
        {(tab === 'masuk' || tab === 'keluar') && (
          <>
            {sudah ? (
              <div className={`${isMasuk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-2xl p-6 text-center`}>
                <div className="text-4xl mb-2">✅</div>
                <p className={`font-bold ${isMasuk ? 'text-green-700' : 'text-red-700'}`}>Sudah Absen {isMasuk ? 'Masuk' : 'Keluar'}</p>
                <p className={`text-sm mt-1 ${isMasuk ? 'text-green-600' : 'text-red-600'}`}>Jam: {isMasuk ? absenHariIni?.jam_masuk : absenHariIni?.jam_keluar}</p>
                {isMasuk && absenHariIni?.foto_masuk && <img src={absenHariIni.foto_masuk} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mt-3 border-4 border-green-300" />}
                {!isMasuk && absenHariIni?.foto_keluar && <img src={absenHariIni.foto_keluar} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mt-3 border-4 border-red-300" />}
              </div>
            ) : (!isMasuk && !sudahMasuk) ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="font-bold text-yellow-700">Belum Absen Masuk</p>
                <p className="text-sm text-yellow-600 mt-1">Lakukan absen masuk terlebih dahulu</p>
              </div>
            ) : (
              <>
                {/* Info ketentuan */}
                <div className={`${isMasuk ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'} border rounded-2xl p-4`}>
                  <p className={`text-sm font-semibold ${isMasuk ? 'text-emerald-800' : 'text-orange-800'}`}>ℹ️ Ketentuan Absen {isMasuk ? 'Masuk' : 'Keluar'}</p>
                  <ul className={`text-xs mt-2 space-y-1 ${isMasuk ? 'text-emerald-700' : 'text-orange-700'}`}>
                    {modeFoto === 'gps'
                      ? <li>• Harus dalam radius <strong>{cfg?.radius}m</strong> dari sekolah</li>
                      : <li>• Selfie wajah sebagai bukti kehadiran</li>}
                    {isMasuk
                      ? <li>• Batas masuk: <strong>{cfg?.jamMasukBatas}</strong> (lewat = terlambat)</li>
                      : <li>• Absen keluar mulai jam <strong>{cfg?.jamKeluarMulai}</strong></li>}
                    <li>• Hanya dari <strong>1 perangkat</strong> terdaftar</li>
                  </ul>
                </div>

                {/* Toggle mode */}
                <div className="flex bg-white rounded-2xl overflow-hidden shadow-sm">
                  <button onClick={() => { setModeFoto('gps'); stopKamera(); setFotoDataUrl(null) }}
                    className={`flex-1 py-3 text-xs font-bold transition-colors ${modeFoto === 'gps' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>
                    📍 Mode GPS
                  </button>
                  <button onClick={() => { setModeFoto('kamera'); setLokasi(null) }}
                    className={`flex-1 py-3 text-xs font-bold transition-colors ${modeFoto === 'kamera' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>
                    📸 Mode Selfie
                  </button>
                </div>

                {/* Panel GPS */}
                {modeFoto === 'gps' && (
                  <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500">📍 Verifikasi Lokasi GPS</p>
                    {lokasi ? (
                      <div className={`rounded-xl p-3 text-center ${dalamRadius ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="text-2xl mb-1">{dalamRadius ? '✅' : '❌'}</div>
                        <p className={`font-bold text-sm ${dalamRadius ? 'text-green-700' : 'text-red-700'}`}>{dalamRadius ? 'Dalam Area Sekolah' : 'Di Luar Area Sekolah'}</p>
                        <p className="text-xs text-gray-500 mt-1">Jarak: <strong>{jarak} m</strong> dari sekolah {lokasi.accuracy && <span>(±{Math.round(lokasi.accuracy)}m)</span>}</p>
                        <p className="text-[10px] text-gray-400">{lokasi.latitude.toFixed(6)}, {lokasi.longitude.toFixed(6)}</p>
                      </div>
                    ) : lokasiError ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><p className="text-red-600 text-sm">⚠️ {lokasiError}</p></div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-3 text-center text-gray-400 text-sm">Tekan tombol untuk ambil lokasi GPS</div>
                    )}
                    <button onClick={ambilLokasi} disabled={loadingLokasi}
                      className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                      {loadingLokasi ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Mengambil GPS...</> : lokasi ? '🔄 Perbarui GPS' : '📍 Ambil Lokasi GPS'}
                    </button>
                  </div>
                )}

                {/* Panel Kamera */}
                {modeFoto === 'kamera' && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 pb-2"><p className="text-xs font-semibold text-gray-500">📸 Selfie Absensi</p></div>
                    {fotoDataUrl ? (
                      <div className="p-4 space-y-3">
                        <img src={fotoDataUrl} alt="Selfie" className="w-full rounded-xl object-cover" style={{ maxHeight: 300 }} />
                        <button onClick={() => { setFotoDataUrl(null); startKamera() }} className="w-full bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-sm">🔄 Ulangi Foto</button>
                      </div>
                    ) : (
                      <>
                        <div className="relative bg-black" style={{ aspectRatio: '1/1', maxHeight: 320 }}>
                          <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} playsInline muted />
                          <canvas ref={canvasRef} className="hidden" />
                          {!kameraAktif && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                              <div className="text-5xl mb-3">📸</div>
                              <p className="text-sm font-medium">Kamera belum aktif</p>
                            </div>
                          )}
                          {kameraAktif && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-48 h-48 rounded-full border-4 border-white/60 border-dashed"></div>
                            </div>
                          )}
                        </div>
                        <div className="p-4 pt-3 space-y-2">
                          {kameraError && <div className="bg-red-50 text-red-600 rounded-xl p-3 text-xs text-center">⚠️ {kameraError}</div>}
                          {!kameraAktif ? (
                            <button onClick={startKamera} disabled={loadingKamera}
                              className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                              {loadingKamera ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Membuka...</> : '📷 Buka Kamera Selfie'}
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={stopKamera} className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm">✕ Tutup</button>
                              <button onClick={ambilFoto} className="bg-purple-600 text-white font-bold py-3 rounded-xl text-sm">📸 Ambil Foto</button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Device ID */}
                <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span>📱</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400">Device ID (terkunci per pegawai)</p>
                    <p className="text-xs font-mono text-gray-600 truncate">{deviceId.current}</p>
                  </div>
                </div>

                {/* Tombol Absen */}
                <button
                  onClick={() => handleAbsen(tab)}
                  disabled={loadingAbsen || (modeFoto === 'gps' && (!lokasi || !dalamRadius)) || (modeFoto === 'kamera' && !fotoDataUrl) || batasJam}
                  className={`w-full ${warnaBtn} text-white font-bold py-4 rounded-2xl disabled:opacity-40 shadow-lg flex items-center justify-center gap-2 text-base`}>
                  {loadingAbsen ? (
                    <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Menyimpan...</>
                  ) : batasJam ? (
                    <>⏳ Absen keluar mulai {cfg?.jamKeluarMulai}</>
                  ) : (
                    <>{isMasuk ? '🟢' : '🔴'} Absen {isMasuk ? 'Masuk' : 'Keluar'} — {jamSekarang}</>
                  )}
                </button>
              </>
            )}
          </>
        )}

        {/* ── TAB RIWAYAT ── */}
        {tab === 'riwayat' && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">📅 Riwayat 30 Hari Terakhir</p>
            {loadingRiwayat ? (
              <div className="text-center py-8 text-gray-400">Memuat...</div>
            ) : riwayat.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Belum ada data absensi</div>
            ) : (
              <div className="space-y-2">
                {riwayat.map(r => (
                  <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    {r.foto_masuk
                      ? <img src={r.foto_masuk} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-gray-200" />
                      : <div className="text-xl">{r.status === 'hadir' ? '✅' : r.status === 'terlambat' ? '⚠️' : r.status === 'sakit' ? '🤒' : r.status === 'izin' ? '📝' : '❌'}</div>}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{new Date(r.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="text-xs text-gray-400">Masuk: {r.jam_masuk || '-'} • Keluar: {r.jam_keluar || '-'}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[r.status] || 'text-gray-500 bg-gray-100'}`}>{r.status || '-'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
