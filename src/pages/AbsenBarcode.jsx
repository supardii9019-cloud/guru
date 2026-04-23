import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AbsenBarcode() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  const [tab, setTab] = useState('scan') // scan | qrcode | rekap
  const [scanning, setScanning] = useState(false)
  const [kelas, setKelas] = useState([])
  const [siswaList, setSiswaList] = useState([])
  const [selectedKelas, setSelectedKelas] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [mapel, setMapel] = useState('Umum')
  const [absenHari, setAbsenHari] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [manualNIS, setManualNIS] = useState('')

  const mataPelajaran = ['Umum', 'Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PKn', 'Bahasa Inggris', 'PAI', 'PJOK']

  useEffect(() => {
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (selectedKelas) {
      fetchSiswa()
      fetchAbsenHari()
    }
  }, [selectedKelas, tanggal])

  const fetchSiswa = async () => {
    const { data } = await supabase.from('siswa').select('*').eq('kelas_id', selectedKelas).order('nama')
    setSiswaList(data || [])
  }

  const fetchAbsenHari = async () => {
    const { data } = await supabase
      .from('absensi_siswa')
      .select('*, siswa(nama, nis)')
      .eq('kelas_id', selectedKelas)
      .eq('tanggal', tanggal)
    setAbsenHari(data || [])
  }

  // Start Kamera
  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 400, height: 400 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setScanning(true)
      startScanLoop()
    } catch (err) {
      setCameraError('Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan.')
      toast.error('Gagal membuka kamera!')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setScanning(false)
  }

  // Scan Loop — capture frame & decode QR
  const startScanLoop = () => {
    intervalRef.current = setInterval(() => {
      captureAndDecode()
    }, 500)
  }

  const captureAndDecode = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Gunakan BarcodeDetector API jika tersedia
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] })
      detector.detect(canvas).then(barcodes => {
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue
          handleScanResult(value)
        }
      }).catch(() => {})
    }
  }

  const handleScanResult = async (value) => {
    if (!selectedKelas) {
      toast.error('Pilih kelas dulu!')
      return
    }

    // Cari siswa berdasarkan NIS dari QR
    const nis = value.trim()
    const siswa = siswaList.find(s => s.nis === nis)

    if (!siswa) {
      toast.error(`NIS ${nis} tidak ditemukan di kelas ini!`)
      return
    }

    // Cek sudah absen belum
    const sudahAbsen = absenHari.find(a => a.siswa_id === siswa.id)
    if (sudahAbsen) {
      toast(`${siswa.nama} sudah absen (${sudahAbsen.status})`, { icon: 'ℹ️' })
      return
    }

    await simpanAbsensi(siswa, 'hadir')
    setLastScan({ nama: siswa.nama, nis: siswa.nis, waktu: new Date().toLocaleTimeString('id-ID') })
  }

  const simpanAbsensi = async (siswa, status) => {
    const { error } = await supabase.from('absensi_siswa').upsert([{
      siswa_id: siswa.id,
      kelas_id: selectedKelas,
      guru_id: pegawai?.id,
      tanggal,
      mata_pelajaran: mapel,
      status,
    }], { onConflict: 'siswa_id,tanggal,mata_pelajaran' })

    if (!error) {
      toast.success(`✅ ${siswa.nama} — ${status}`)
      fetchAbsenHari()
    }
  }

  const handleManualInput = async () => {
    if (!manualNIS.trim()) return toast.error('Masukkan NIS!')
    if (!selectedKelas) return toast.error('Pilih kelas dulu!')

    const siswa = siswaList.find(s => s.nis === manualNIS.trim())
    if (!siswa) return toast.error(`NIS ${manualNIS} tidak ditemukan!`)

    await simpanAbsensi(siswa, 'hadir')
    setManualNIS('')
  }

  const updateStatus = async (absenId, status) => {
    await supabase.from('absensi_siswa').update({ status }).eq('id', absenId)
    toast.success('Status diupdate!')
    fetchAbsenHari()
  }

  const STATUS_COLOR = {
    hadir: 'bg-green-500 text-white',
    sakit: 'bg-yellow-500 text-white',
    izin: 'bg-blue-500 text-white',
    alpha: 'bg-red-500 text-white',
  }

  // Generate QR Data URL menggunakan API
  const getQRUrl = (nis) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(nis)}&bgcolor=ffffff&color=000000&margin=10`

  const stats = {
    hadir: absenHari.filter(a => a.status === 'hadir').length,
    sakit: absenHari.filter(a => a.status === 'sakit').length,
    izin: absenHari.filter(a => a.status === 'izin').length,
    alpha: absenHari.filter(a => a.status === 'alpha').length,
    belum: siswaList.length - absenHari.length,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => { stopCamera(); navigate('/') }}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">📱 Absen Barcode</h1>
          <p className="text-purple-200 text-xs">Scan QR Code Siswa</p>
        </div>
      </div>

      {/* Tab */}
      <div className="flex bg-white mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
        {[
          { key: 'scan', label: '📷 Scan' },
          { key: 'qrcode', label: '🔲 QR Siswa' },
          { key: 'rekap', label: '📊 Rekap' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== 'scan') stopCamera() }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === t.key ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">📅 Tanggal</label>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">🏫 Kelas</label>
              <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Pilih Kelas</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">📚 Mata Pelajaran</label>
            <select value={mapel} onChange={e => setMapel(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              {mataPelajaran.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Stats */}
        {selectedKelas && (
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: 'Hadir', val: stats.hadir, color: 'bg-green-500' },
              { label: 'Sakit', val: stats.sakit, color: 'bg-yellow-500' },
              { label: 'Izin', val: stats.izin, color: 'bg-blue-500' },
              { label: 'Alpha', val: stats.alpha, color: 'bg-red-500' },
              { label: 'Belum', val: stats.belum, color: 'bg-gray-400' },
            ].map(s => (
              <div key={s.label} className={`${s.color} text-white rounded-xl p-2 text-center`}>
                <div className="text-lg font-black">{s.val}</div>
                <div className="text-[9px] font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* TAB SCAN */}
        {tab === 'scan' && (
          <div className="space-y-3">
            {/* Kamera */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="relative bg-black" style={{ aspectRatio: '1' }}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay scanner */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-52 h-52">
                      <div className="absolute inset-0 border-2 border-white/30 rounded-2xl"></div>
                      {/* Corner brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl-xl"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr-xl"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl-xl"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br-xl"></div>
                      {/* Scan line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-purple-400 animate-bounce" style={{ top: '50%' }}></div>
                    </div>
                  </div>
                )}

                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                    <div className="text-5xl mb-3">📷</div>
                    <p className="text-sm font-medium">Kamera belum aktif</p>
                  </div>
                )}

                {/* Last scan result */}
                {lastScan && scanning && (
                  <div className="absolute bottom-3 left-3 right-3 bg-green-500 text-white rounded-xl px-4 py-2 text-center">
                    <p className="font-bold text-sm">✅ {lastScan.nama}</p>
                    <p className="text-xs text-green-100">NIS: {lastScan.nis} • {lastScan.waktu}</p>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div className="p-4">
                {cameraError && (
                  <div className="bg-red-50 text-red-600 rounded-xl p-3 text-xs mb-3 text-center">
                    ⚠️ {cameraError}
                  </div>
                )}
                <button
                  onClick={scanning ? stopCamera : startCamera}
                  disabled={!selectedKelas}
                  className={`w-full font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 ${
                    scanning
                      ? 'bg-red-500 text-white'
                      : 'bg-purple-600 text-white'
                  }`}>
                  {scanning ? '⏹️ Stop Kamera' : '📷 Aktifkan Kamera & Scan'}
                </button>
              </div>
            </div>

            {/* Manual Input */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">
                ⌨️ Input Manual (jika kamera tidak tersedia)
              </p>
              <div className="flex gap-2">
                <input
                  value={manualNIS}
                  onChange={e => setManualNIS(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualInput()}
                  placeholder="Ketik NIS siswa..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
                <button onClick={handleManualInput}
                  className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm">
                  ✅
                </button>
              </div>
            </div>

            {/* Daftar absen hari ini */}
            {absenHari.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 mb-3">
                  📋 Sudah Absen ({absenHari.length} siswa)
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {absenHari.map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm">
                        {a.status === 'hadir' ? '✅' : a.status === 'sakit' ? '🤒' : a.status === 'izin' ? '📝' : '❌'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{a.siswa?.nama}</p>
                        <p className="text-xs text-gray-400">NIS: {a.siswa?.nis}</p>
                      </div>
                      <select
                        value={a.status}
                        onChange={e => updateStatus(a.id, e.target.value)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border-0 ${STATUS_COLOR[a.status]}`}>
                        <option value="hadir">Hadir</option>
                        <option value="sakit">Sakit</option>
                        <option value="izin">Izin</option>
                        <option value="alpha">Alpha</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB QR CODE SISWA */}
        {tab === 'qrcode' && (
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">
                💡 QR Code berisi NIS siswa. Print dan bagikan ke siswa untuk scan absensi.
              </p>
            </div>

            {!selectedKelas ? (
              <div className="text-center py-10 text-gray-400">
                <p>Pilih kelas terlebih dahulu</p>
              </div>
            ) : siswaList.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p>Tidak ada siswa di kelas ini</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {siswaList.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl shadow-sm p-4 text-center">
                    <img
                      src={getQRUrl(s.nis)}
                      alt={`QR ${s.nama}`}
                      className="w-full rounded-xl mb-2"
                      loading="lazy"
                    />
                    <p className="font-bold text-gray-800 text-xs line-clamp-1">{s.nama}</p>
                    <p className="text-gray-400 text-[10px]">NIS: {s.nis}</p>
                    <button
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = getQRUrl(s.nis)
                        link.download = `QR_${s.nis}_${s.nama}.png`
                        link.click()
                      }}
                      className="mt-2 w-full bg-purple-50 text-purple-700 text-[10px] font-bold py-1.5 rounded-xl">
                      ⬇️ Download QR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB REKAP */}
        {tab === 'rekap' && (
          <div className="space-y-3">
            {!selectedKelas ? (
              <div className="text-center py-10 text-gray-400">
                <p>Pilih kelas terlebih dahulu</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h3 className="font-bold text-gray-700 mb-3">
                    📊 Rekap Absensi — {new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>

                  {/* Belum absen */}
                  {siswaList.filter(s => !absenHari.find(a => a.siswa_id === s.id)).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-red-500 mb-2">
                        ⚠️ Belum Absen ({stats.belum} siswa)
                      </p>
                      <div className="space-y-1">
                        {siswaList
                          .filter(s => !absenHari.find(a => a.siswa_id === s.id))
                          .map(s => (
                            <div key={s.id} className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{s.nama}</p>
                                <p className="text-xs text-gray-400">NIS: {s.nis}</p>
                              </div>
                              <div className="flex gap-1">
                                {['hadir', 'sakit', 'izin', 'alpha'].map(status => (
                                  <button key={status}
                                    onClick={() => simpanAbsensi(s, status)}
                                    className={`text-[9px] px-2 py-1 rounded-lg font-bold ${STATUS_COLOR[status]}`}>
                                    {status[0].toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Sudah absen */}
                  {absenHari.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 mb-2">
                        ✅ Sudah Absen ({absenHari.length} siswa)
                      </p>
                      <div className="space-y-1">
                        {absenHari.map(a => (
                          <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{a.siswa?.nama}</p>
                              <p className="text-xs text-gray-400">NIS: {a.siswa?.nis}</p>
                            </div>
                            <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
                              className={`text-xs font-bold px-2 py-1 rounded-lg border-0 ${STATUS_COLOR[a.status]}`}>
                              <option value="hadir">Hadir</option>
                              <option value="sakit">Sakit</option>
                              <option value="izin">Izin</option>
                              <option value="alpha">Alpha</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
