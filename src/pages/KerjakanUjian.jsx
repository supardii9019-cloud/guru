import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function KerjakanUjian() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
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
    setSoal(data || [])
    setSelectedUjian(ujian)
    setWaktuSisa(ujian.durasi * 60)
    setStarted(true)
    setCurrentSoal(0)
    setJawaban({})
    setLoading(false)

    // Start timer
    timerRef.current = setInterval(() => {
      setWaktuSisa(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSelesai(data, {})
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleJawab = (soalId, jawaban_pilihan) => {
    setJawaban(prev => ({ ...prev, [soalId]: jawaban_pilihan }))
  }

  const handleSelesai = async (soalData, jawabanData) => {
    clearInterval(timerRef.current)
    const s = soalData || soal
    const j = jawabanData || jawaban

    let benar = 0
    let totalPoin = 0
    let poinDidapat = 0

    s.forEach(soalItem => {
      totalPoin += soalItem.poin || 1
      if (j[soalItem.id] === soalItem.jawaban_benar) {
        benar++
        poinDidapat += soalItem.poin || 1
      }
    })

    const nilai = totalPoin > 0 ? Math.round((poinDidapat / totalPoin) * 100) : 0

    setHasil({
      benar,
      salah: s.length - benar,
      total: s.length,
      nilai,
      poinDidapat,
      totalPoin,
    })
    setSelesai(true)
    toast.success(`Ujian selesai! Nilai: ${nilai}`)
  }

  const formatWaktu = (detik) => {
    const m = Math.floor(detik / 60).toString().padStart(2, '0')
    const s = (detik % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const getWaktuColor = () => {
    if (waktuSisa > 300) return 'text-green-600 bg-green-50'
    if (waktuSisa > 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50 animate-pulse'
  }

  const jawabanTerjawab = Object.keys(jawaban).length

  // === HASIL UJIAN ===
  if (selesai && hasil) {
    const lulus = hasil.nilai >= 75
    return (
      <div className="min-h-screen bg-gray-50 pb-6">
        <div className="bg-green-600 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => { setSelesai(false); setStarted(false); setSelectedUjian(null); fetchUjianAktif() }}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
          <h1 className="text-lg font-bold">Hasil Ujian</h1>
        </div>

        <div className="p-4 space-y-4">
          {/* Nilai Besar */}
          <div className={`rounded-3xl p-8 text-center shadow-lg ${lulus ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-red-500 to-red-700'} text-white`}>
            <div className="text-7xl font-black mb-2">{hasil.nilai}</div>
            <div className="text-xl font-bold">{lulus ? '🎉 LULUS!' : '😔 Belum Lulus'}</div>
            <div className="text-sm mt-1 opacity-80">{selectedUjian?.judul}</div>
          </div>

          {/* Detail */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-700 mb-3">📊 Rincian Hasil</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '✅ Benar', val: hasil.benar, color: 'bg-green-50 text-green-700' },
                { label: '❌ Salah', val: hasil.salah, color: 'bg-red-50 text-red-700' },
                { label: '📝 Total Soal', val: hasil.total, color: 'bg-blue-50 text-blue-700' },
                { label: '⭐ Poin', val: `${hasil.poinDidapat}/${hasil.totalPoin}`, color: 'bg-yellow-50 text-yellow-700' },
              ].map(item => (
                <div key={item.label} className={`${item.color} rounded-2xl p-4 text-center`}>
                  <div className="text-2xl font-black">{item.val}</div>
                  <div className="text-xs font-semibold mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Review Jawaban */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-700 mb-3">📋 Review Jawaban</h3>
            <div className="space-y-3">
              {soal.map((s, i) => {
                const jawabanSaya = jawaban[s.id]
                const benar = jawabanSaya === s.jawaban_benar
                return (
                  <div key={s.id} className={`rounded-xl p-3 border-2 ${benar ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      {i + 1}. {s.pertanyaan}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {['a', 'b', 'c', 'd'].map(opt => (
                        <div key={opt} className={`px-2 py-1 rounded-lg font-medium ${
                          opt === s.jawaban_benar ? 'bg-green-500 text-white' :
                          opt === jawabanSaya ? 'bg-red-400 text-white' :
                          'bg-white text-gray-600'
                        }`}>
                          {opt.toUpperCase()}. {s[`pilihan_${opt}`]}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs mt-2 font-bold">
                      {benar ? '✅ Benar' : `❌ Jawaban Anda: ${jawabanSaya?.toUpperCase() || 'Tidak dijawab'} | Benar: ${s.jawaban_benar?.toUpperCase()}`}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <button onClick={() => { setSelesai(false); setStarted(false); setSelectedUjian(null); fetchUjianAktif() }}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl">
            🏠 Kembali ke Daftar Ujian
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
      <div className="min-h-screen bg-gray-50 pb-6">
        {/* Header ujian */}
        <div className="bg-orange-600 text-white px-4 py-3 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-orange-200">{selectedUjian.judul}</p>
              <p className="text-sm font-bold">Soal {currentSoal + 1} dari {soal.length}</p>
            </div>
            <div className={`px-4 py-2 rounded-2xl font-black text-lg ${getWaktuColor()}`}>
              ⏱️ {formatWaktu(waktuSisa)}
            </div>
          </div>
          {/* Progress bar */}
          <div className="bg-orange-800 rounded-full h-2">
            <div className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${((currentSoal + 1) / soal.length) * 100}%` }} />
          </div>
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

          {/* Pilihan Jawaban */}
          <div className="space-y-2">
            {['a', 'b', 'c', 'd'].map(opt => {
              const teks = soalSekarang[`pilihan_${opt}`]
              if (!teks) return null
              const dipilih = jawaban[soalSekarang.id] === opt
              return (
                <button key={opt} onClick={() => handleJawab(soalSekarang.id, opt)}
                  className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all font-medium ${
                    dipilih
                      ? 'border-orange-500 bg-orange-50 text-orange-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
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
              <button onClick={() => setCurrentSoal(prev => prev - 1)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl">
                ← Sebelumnya
              </button>
            )}
            {currentSoal < soal.length - 1 ? (
              <button onClick={() => setCurrentSoal(prev => prev + 1)}
                className="flex-1 bg-orange-500 text-white font-bold py-3.5 rounded-2xl">
                Selanjutnya →
              </button>
            ) : (
              <button onClick={() => handleSelesai(soal, jawaban)}
                className="flex-1 bg-green-600 text-white font-bold py-3.5 rounded-2xl">
                ✅ Selesai & Kumpulkan
              </button>
            )}
          </div>

          {/* Navigasi Soal */}
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

  // === DAFTAR UJIAN AKTIF ===
  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-orange-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Kerjakan Ujian</h1>
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
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
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
