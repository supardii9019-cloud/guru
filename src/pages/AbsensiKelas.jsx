import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const STATUS = ['hadir', 'sakit', 'izin', 'alpha']
const STATUS_COLOR = {
  hadir: 'bg-green-500 text-white',
  sakit: 'bg-yellow-500 text-white',
  izin: 'bg-blue-500 text-white',
  alpha: 'bg-red-500 text-white',
}
const STATUS_INACTIVE = 'bg-gray-100 text-gray-400'

export default function AbsensiKelas() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [kelas, setKelas] = useState([])
  const [siswaList, setSiswaList] = useState([])
  const [selectedKelas, setSelectedKelas] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [mapel, setMapel] = useState('')
  const [absensi, setAbsensi] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadingSiswa, setLoadingSiswa] = useState(false)
  const [tab, setTab] = useState('input') // input | rekap

  const mataPelajaran = ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PKn', 'Bahasa Inggris', 'PAI', 'PJOK', 'SBdP', 'Prakarya']

  useEffect(() => {
    fetchKelas()
  }, [])

  useEffect(() => {
    if (selectedKelas) fetchSiswa(selectedKelas)
  }, [selectedKelas, tanggal])

  const fetchKelas = async () => {
    const { data } = await supabase.from('kelas').select('*').order('nama_kelas')
    setKelas(data || [])
  }

  const fetchSiswa = async (kelasId) => {
    setLoadingSiswa(true)
    const { data: siswaData } = await supabase
      .from('siswa')
      .select('*')
      .eq('kelas_id', kelasId)
      .order('nama')

    // Cek absensi yang sudah ada
    const { data: absenData } = await supabase
      .from('absensi_siswa')
      .select('*')
      .eq('kelas_id', kelasId)
      .eq('tanggal', tanggal)

    const map = {}
    siswaData?.forEach(s => { map[s.id] = 'hadir' })
    absenData?.forEach(a => { map[a.siswa_id] = a.status })

    setSiswaList(siswaData || [])
    setAbsensi(map)
    setLoadingSiswa(false)
  }

  const setAllStatus = (status) => {
    const newMap = {}
    siswaList.forEach(s => { newMap[s.id] = status })
    setAbsensi(newMap)
  }

  const stats = {
    hadir: Object.values(absensi).filter(s => s === 'hadir').length,
    sakit: Object.values(absensi).filter(s => s === 'sakit').length,
    izin: Object.values(absensi).filter(s => s === 'izin').length,
    alpha: Object.values(absensi).filter(s => s === 'alpha').length,
  }

  const handleSimpan = async () => {
    if (!selectedKelas) return toast.error('Pilih kelas!')
    if (!mapel) return toast.error('Pilih mata pelajaran!')
    if (siswaList.length === 0) return toast.error('Tidak ada siswa!')

    setLoading(true)
    const records = siswaList.map(s => ({
      siswa_id: s.id,
      kelas_id: selectedKelas,
      guru_id: pegawai?.id,
      tanggal,
      mata_pelajaran: mapel,
      status: absensi[s.id] || 'hadir',
    }))

    // Upsert
    const { error } = await supabase
      .from('absensi_siswa')
      .upsert(records, { onConflict: 'siswa_id,tanggal,mata_pelajaran' })

    if (error) {
      toast.error('Gagal menyimpan!')
      console.error(error)
    } else {
      toast.success(`✅ Absensi ${siswaList.length} siswa berhasil disimpan!`)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Absensi Kelas</h1>
      </div>

      {/* Tab */}
      <div className="flex bg-white mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
        {['input', 'rekap'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold capitalize transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
          >
            {t === 'input' ? '✏️ Input Absensi' : '📊 Rekap'}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">📅 Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">🏫 Kelas</label>
              <select
                value={selectedKelas}
                onChange={e => setSelectedKelas(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                <option value="">Pilih Kelas</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">📚 Mata Pelajaran</label>
            <select
              value={mapel}
              onChange={e => setMapel(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">Pilih Mata Pelajaran</option>
              {mataPelajaran.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        {siswaList.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'hadir', label: 'Hadir', color: 'from-green-400 to-green-600', emoji: '✅' },
                { key: 'sakit', label: 'Sakit', color: 'from-yellow-400 to-yellow-600', emoji: '🤒' },
                { key: 'izin', label: 'Izin', color: 'from-blue-400 to-blue-600', emoji: '📝' },
                { key: 'alpha', label: 'Alpha', color: 'from-red-400 to-red-600', emoji: '❌' },
              ].map(s => (
                <div key={s.key} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-3 text-center shadow-sm`}>
                  <div className="text-lg">{s.emoji}</div>
                  <div className="text-xl font-black">{stats[s.key]}</div>
                  <div className="text-[10px] font-semibold">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Set All */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 mb-2">Set Semua:</p>
              <div className="flex gap-2">
                {STATUS.map(s => (
                  <button
                    key={s}
                    onClick={() => setAllStatus(s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${STATUS_COLOR[s]}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Siswa List */}
        {loadingSiswa ? (
          <LoadingSpinner />
        ) : siswaList.length > 0 ? (
          <div className="space-y-2">
            {siswaList.map((s, i) => (
              <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-sm font-black text-blue-600">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{s.nama}</p>
                    <p className="text-xs text-gray-400">NIS: {s.nis}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_COLOR[absensi[s.id]] || STATUS_INACTIVE}`}>
                    {absensi[s.id] || 'hadir'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {STATUS.map(status => (
                    <button
                      key={status}
                      onClick={() => setAbsensi(prev => ({ ...prev, [s.id]: status }))}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${absensi[s.id] === status ? STATUS_COLOR[status] : STATUS_INACTIVE}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-300">
            <div className="text-6xl mb-3">📋</div>
            <p className="font-medium text-gray-400">Pilih kelas untuk memulai absensi</p>
          </div>
        )}

        {/* Simpan */}
        {siswaList.length > 0 && (
          <button
            onClick={handleSimpan}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Menyimpan...</>
            ) : (
              <><span>💾</span> Simpan Absensi ({siswaList.length} Siswa)</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
