import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

// Acak urutan array
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)

export default function KerjakanUjian() {
  const navigate = useNavigate()
  const { pegawai, siswaProfile, role } = useAuth()
  const [ujianList, setUjianList] = useState([])
  const [selectedUjian, setSelectedUjian] = useState(null)
  const [soal, setSoal] = useState([])
  const [jawaban, setJawaban] = useState({})
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [selesai, setSelesai] = useState(false)
  const [hasil, setHasil] = useState(null)
  const [waktuSisa, setWaktuSisa] = useState(0)
  const [currentSoal, setCurrentSoal] = useState(0)
  const timerRef = useRef(null)

  // === ANTI NYONTEK ===
  const [peringatan, setPeringatan] = useState(0)
  const [kecurangan, setKecurangan] = useState([])
  const MAX_PERINGATAN = 3
  const isFullscreen = useRef(false)

  const tambahKecurangan = useCallback((jenis) => {
    const waktu = new Date().toLocaleTimeString('id-ID')
    setKecurangan(prev => [...prev, { jenis, waktu }])
    setPeringatan(prev => {
      const baru = prev + 1
      if (baru >= MAX_PERINGATAN) {
        toast.error('⛔ Terlalu banyak kecurangan! Ujian dikumpulkan otomatis.')
        handleSelesaiPaksa()
      } else {
        toast.error(`⚠️ Peringatan ${baru}/${MAX_PERINGATAN}: ${jenis}`)
      }
      return baru
    })
  }, [])

  // Deteksi pindah tab / minimize
  useEffect(() => {
    if (!started) return
    const handleVisibility = () => {
      if (document.hidden) tambahKecurangan('Berpindah tab/minimize aplikasi')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [started, tambahKecurangan])

  // Deteksi blur window (alt+tab, dll)
  useEffect(() => {
    if (!started) return
    const handleBlur = () => tambahKecurangan('Keluar dari jendela ujian')
    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [started, tambahKecurangan])

  // Blokir copy paste
  useEffect(() => {
    if (!started) return
    const block = (e) => {
      e.preventDefault()
      tambahKecurangan('Mencoba copy/paste')
    }
    document.addEventListener('copy', block)
    document.addEventListener('paste', block)
    document.addEventListener('cut', block)
    return () => {
      document.removeEventListener('copy', block)
      document.removeEventListener('paste', block)
      document.removeEventListener('cut', block)
    }
  }, [started, tambahKecurangan])

  // Blokir klik kanan
  useEffect(() => {
    if (!started) return
    const block = (e) => {
      e.preventDefault()
      tambahKecurangan('Mencoba klik kanan')
    }
    document.addEventListener('contextmenu', block)
    return () => document.removeEventListener('contextmenu', block)
  }, [started, tambahKecurangan])

  // Minta fullscreen saat ujian mulai
  const masukFullscreen = () => {
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    isFullscreen.current = true
  }

  // Deteksi keluar fullscreen
  useEffect(() => {
    if (!started) return
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement
      if (!isFull && isFullscreen.current) {
        tambahKecurangan('Keluar dari mode fullscreen')
        // Minta masuk fullscreen lagi
        setTimeout(masukFullscreen, 500)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [started, tambahKecurangan])

  useEffect(() => {
    fetchUjianAktif()
    return () => clearInterval(timerRef.current)
  }, [])

  const fetchUjianAktif = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ujian')
      .select('*, kelas(nama_kelas), pegawai(nama)')
      .eq('status', 'aktif')
      .order('created_at', { ascending: false })
    setUjianList(data || [])
    setLoading(false)
  }

  const mulaiUjian = async (ujian) => {
    setLoading(true)
    const { data } = await supabase
      .from('soal_ujian')
      .select('*')
      .eq('ujian_id', ujian.id)
      .order('created_at')

    // Acak urutan soal (anti nyontek)
    const soalAcak = shuffle(data || []).map(s => ({
      ...s,
      // Acak urutan pilihan jawaban
      _opsiAcak: shuffle(['a','b','c','d'].filter(o => s[`pilihan_${o}`]))
    }))

    setSoal(soalAcak)
    setSelectedUjian(ujian)
    setWaktuSisa(ujian.durasi * 60)
    setStarted(true)
    setCurrentSoal(0)
    setJawaban({})
    setPeringatan(0)
    setKecurangan([])
    setLoading(false)

    // Masuk fullscreen
    masukFullscreen()

    // Timer
    timerRef.current = setInterval(() => {
      setWaktuSisa(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Auto kumpul saat waktu habis
  useEffect(() => {
    if (started && waktuSisa === 0 && !selesai) {
      toast.error('⏰ Waktu habis! Ujian dikumpulkan otomatis.')
      handleSelesaiPaksa()
    }
  }, [waktuSisa, started, selesai])

  const handleSelesaiPaksa = useCallback(() => {
    clearInterval(timerRef.current)
    setJawaban(prev => {
      hitungHasil(soal, prev, true)
      return prev
    })
  }, [soal])

  const handleJawab = (soalId, pilihanAsli) => {
    setJawaban(prev => ({ ...prev, [soalId]: pilihanAsli }))
  }

  const hitungHasil = async (soalData, jawabanData, paksa = false) => {
    clearInterval(timerRef.current)

    let benar = 0
    let totalPoin = 0
    let poinDidapat = 0

    soalData.forEach(s => {
      totalPoin += s.poin
      if (jawabanData[s.id] === s.jawaban_benar) {
        benar++
        poinDidapat += s.poin
      }
    })

    const nilai = totalPoin > 0 ? Math.round((poinDidapat / totalPoin) * 100) : 0
    const hasilData = { benar, total_soal: soalData.length, nilai, poinDidapat, totalPoin }
    setHasil(hasilData)
    setSelesai(true)
    setStarted(false)

    // Keluar fullscreen
    if (document.exitFullscreen) document.exitFullscreen()

    // Simpan hasil ke database
    const siswaId = siswaProfile?.id || pegawai?.id
    if (siswaId && selectedUjian) {
      await supabase.from('hasil_ujian').upsert([{
        ujian_id: selectedUjian.id,
        siswa_id: siswaId,
        nilai,
        benar,
        total_soal: soalData.length,
        jawaban: jawabanData,
        kecurangan: kecurangan,
        peringatan_count: peringatan
      }], { onConflict: 'ujian_id,siswa_id' })
    }
  }

  const handleSelesai = () => hitungHasil(soal, jawaban)

  const formatWaktu = (detik) => {
    const m = Math.floor(detik / 60).toString().padStart(2, '0')
    const s = (detik % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const getWaktuColor = () => {
    if (waktuSisa > 300) return 'bg-green-600 text-white'
    if (waktuSisa > 60) return 'bg-yellow-500 text-white animate-pulse'
    return 'bg-red-600 text-white animate-pulse'
  }

  const jawabanTerjawab = Object.keys(jawaban).length

  // === HASIL UJIAN ===
  if (selesai && hasil) {
    const lulus = hasil.nilai >= 70
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="text-7xl mb-4">{lulus ? '🎉' : '😔'}</div>
          <h1 className="text-2xl font-black text-gray-800 mb-1">
            {lulus ? 'Selamat!' : 'Lebih Semangat!'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">{selectedUjian?.judul}</p>

          <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-5xl font-black mb-6 ${
            lulus ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
          }`}>
            {hasil.nilai}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-green-600">{hasil.benar}</p>
              <p className="text-xs text-gray-500">Benar</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-red-500">{hasil.total_soal - hasil.benar}</p>
              <p className="text-xs text-gray-500">Salah</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-blue-600">{hasil.total_soal}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>

          {peringatan > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 text-left">
              <p className="text-xs font-bold text-red-600 mb-1">⚠️ {peringatan} peringatan kecurangan tercatat</p>
              {kecurangan.slice(0, 3).map((k, i) => (
                <p key={i} className="text-xs text-red-500">• {k.waktu}: {k.jenis}</p>
              ))}
            </div>
          )}

          <button onClick={() => {
            setSelesai(false)
            setStarted(false)
            setSelectedUjian(null)
            fetchUjianAktif()
          }} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl">
            ← Kembali ke Daftar Ujian
          </button>
        </div>
      </div>
    )
  }

  // === KERJAKAN UJIAN ===
  if (started && selectedUjian) {
    const soalSekarang = soal[currentSoal]
    if (!soalSekarang) return <LoadingSpinner />

    return (
      <div className="min-h-screen bg-gray-50 pb-6 select-none" onContextMenu={e => e.preventDefault()}>
        {/* Header */}
        <div className="bg-orange-600 text-white px-4 py-3 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-orange-200 truncate max-w-[160px]">{selectedUjian.judul}</p>
              <p className="text-sm font-bold">Soal {currentSoal + 1}/{soal.length}</p>
            </div>
            <div className={`px-3 py-2 rounded-2xl font-black text-base ${getWaktuColor()}`}>
              ⏱️ {formatWaktu(waktuSisa)}
            </div>
          </div>
          <div className="bg-orange-800 rounded-full h-2">
            <div className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${((currentSoal + 1) / soal.length) * 100}%` }} />
          </div>
          {/* Indikator peringatan */}
          {peringatan > 0 && (
            <div className="mt-2 text-xs text-orange-200 font-bold">
              ⚠️ Peringatan: {peringatan}/{MAX_PERINGATAN}
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Soal */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-black text-sm">
                {currentSoal + 1}
              </span>
              <span className="text-xs text-gray-400">Poin: {soalSekarang.poin}</span>
            </div>
            <p className="text-gray-800 font-medium leading-relaxed">{soalSekarang.pertanyaan}</p>
          </div>

          {/* Pilihan — urutan diacak */}
          <div className="space-y-2">
            {soalSekarang._opsiAcak.map(opt => {
              const teks = soalSekarang[`pilihan_${opt}`]
              const dipilih = jawaban[soalSekarang.id] === opt
              return (
                <button key={opt} onClick={() => handleJawab(soalSekarang.id, opt)}
                  className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all font-medium ${
                    dipilih
                      ? 'border-orange-500 bg-orange-50 text-orange-800'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}>
                  <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-sm font-black mr-3 ${
                    dipilih ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {opt.toUpperCase()}
                  </span>
                  {teks}
                </button>
              )
            })}
          </div>

          {/* Navigasi */}
          <div className="flex gap-3">
            {currentSoal > 0 && (
              <button onClick={() => setCurrentSoal(p => p - 1)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl">
                ← Sebelumnya
              </button>
            )}
            {currentSoal < soal.length - 1 ? (
              <button onClick={() => setCurrentSoal(p => p + 1)}
                className="flex-1 bg-orange-500 text-white font-bold py-3.5 rounded-2xl">
                Selanjutnya →
              </button>
            ) : (
              <button onClick={handleSelesai}
                className="flex-1 bg-green-600 text-white font-bold py-3.5 rounded-2xl">
                ✅ Kumpulkan
              </button>
            )}
          </div>

          {/* Grid navigasi soal */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">
              Navigasi Soal ({jawabanTerjawab}/{soal.length} terjawab)
            </p>
            <div className="flex flex-wrap gap-2">
              {soal.map((s, i) => (
                <button key={s.id} onClick={() => setCurrentSoal(i)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                    i === currentSoal ? 'bg-orange-500 text-white' :
                    jawaban[s.id] ? 'bg-green-500 text-white' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // === DAFTAR UJIAN ===
  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-orange-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate(role === 'siswa' ? '/siswa-dashboard' : '/')}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Kerjakan Ujian</h1>
      </div>

      {/* Info anti nyontek */}
      <div className="mx-4 mt-4 bg-orange-50 border border-orange-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-orange-700 mb-2">⚠️ Perhatian Sebelum Mulai!</p>
        <ul className="text-xs text-orange-600 space-y-1">
          <li>• Ujian akan masuk mode <strong>layar penuh</strong></li>
          <li>• Dilarang berpindah tab/aplikasi</li>
          <li>• Copy paste & klik kanan dinonaktifkan</li>
          <li>• Urutan soal diacak secara otomatis</li>
          <li>• Maksimal {MAX_PERINGATAN}x peringatan sebelum ujian dikumpul paksa</li>
        </ul>
      </div>

      <div className="p-4 space-y-3">
        {loading ? <LoadingSpinner /> : ujianList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">📝</div>
            <p className="text-gray-400 font-medium">Tidak ada ujian aktif saat ini</p>
            <p className="text-gray-300 text-sm mt-1">Tunggu guru mempublikasikan ujian</p>
          </div>
        ) : ujianList.map(u => (
          <div key={u.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{u.judul}</h3>
                  <p className="text-sm text-gray-500">{u.mata_pelajaran} • {u.kelas?.nama_kelas}</p>
                  <p className="text-xs text-gray-400 mt-1">oleh: {u.pegawai?.nama}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                  🟢 Aktif
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 mb-4">
                <span>⏱️ {u.durasi} menit</span>
                <span>❓ {u.total_soal} soal</span>
                {u.tanggal && <span>📅 {new Date(u.tanggal).toLocaleDateString('id-ID')}</span>}
              </div>
              <button onClick={() => mulaiUjian(u)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-2xl shadow-md">
                🚀 Mulai Kerjakan Ujian
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
