import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const JENIS_NILAI = ['tugas', 'ulangan', 'uts', 'uas', 'praktik', 'proyek']
const JENIS_COLOR = {
  tugas: 'bg-blue-100 text-blue-700',
  ulangan: 'bg-purple-100 text-purple-700',
  uts: 'bg-orange-100 text-orange-700',
  uas: 'bg-red-100 text-red-700',
  praktik: 'bg-green-100 text-green-700',
  proyek: 'bg-teal-100 text-teal-700',
}

export default function Penilaian() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [data, setData] = useState([])
  const [kelas, setKelas] = useState([])
  const [siswa, setSiswa] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterKelas, setFilterKelas] = useState('')
  const [filterMapel, setFilterMapel] = useState('')

  const [form, setForm] = useState({
    siswa_id: '', kelas_id: '', mata_pelajaran: '', jenis_nilai: 'tugas',
    nilai: '', kkm: 75, semester: 'Ganjil', tahun_ajaran: '2024/2025',
    tanggal: new Date().toISOString().split('T')[0], keterangan: ''
  })

  const mataPelajaran = ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PKn', 'Bahasa Inggris', 'PAI', 'PJOK', 'SBdP']

  useEffect(() => {
    fetchData()
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
  }, [])

  useEffect(() => {
    if (form.kelas_id) {
      supabase.from('siswa').select('*').eq('kelas_id', form.kelas_id).order('nama')
        .then(({ data }) => setSiswa(data || []))
    }
  }, [form.kelas_id])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('penilaian')
      .select('*, siswa(nama, nis), kelas(nama_kelas)')
      .order('tanggal', { ascending: false })
      .limit(50)
    setData(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.siswa_id || !form.mata_pelajaran || !form.nilai) {
      return toast.error('Siswa, mata pelajaran, dan nilai wajib diisi!')
    }
    if (isNaN(form.nilai) || form.nilai < 0 || form.nilai > 100) {
      return toast.error('Nilai harus antara 0-100!')
    }
    setSaving(true)
    const { error } = await supabase.from('penilaian').insert([{
      ...form, guru_id: pegawai?.id, nilai: parseFloat(form.nilai)
    }])
    if (error) {
      toast.error('Gagal menyimpan nilai!')
    } else {
      toast.success('Nilai berhasil disimpan! 📊')
      setShowModal(false)
      setForm({ siswa_id: '', kelas_id: '', mata_pelajaran: '', jenis_nilai: 'tugas', nilai: '', kkm: 75, semester: 'Ganjil', tahun_ajaran: '2024/2025', tanggal: new Date().toISOString().split('T')[0], keterangan: '' })
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus nilai ini?')) return
    await supabase.from('penilaian').delete().eq('id', id)
    toast.success('Nilai dihapus!')
    fetchData()
  }

  const filtered = data.filter(d => {
    if (filterKelas && d.kelas_id !== filterKelas) return false
    if (filterMapel && d.mata_pelajaran !== filterMapel) return false
    return true
  })

  const getNilaiColor = (nilai, kkm) => {
    if (nilai >= 90) return 'text-green-600'
    if (nilai >= kkm) return 'text-blue-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-cyan-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Penilaian</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-cyan-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Nilai
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Semua Kelas</option>
              {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
            <select value={filterMapel} onChange={e => setFilterMapel(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Semua Mapel</option>
              {mataPelajaran.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', val: filtered.length, color: 'bg-cyan-500' },
            { label: 'Lulus', val: filtered.filter(d => d.nilai >= d.kkm).length, color: 'bg-green-500' },
            { label: 'Remedial', val: filtered.filter(d => d.nilai < d.kkm).length, color: 'bg-red-500' },
          ].map(s => (
            <div key={s.label} className={`${s.color} text-white rounded-2xl p-3 text-center`}>
              <div className="text-2xl font-black">{s.val}</div>
              <div className="text-xs font-semibold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">📊</div>
            <p className="text-gray-400">Belum ada data penilaian</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(d => (
              <div key={d.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{d.siswa?.nama}</p>
                    <p className="text-xs text-gray-400">NIS: {d.siswa?.nis} • {d.kelas?.nama_kelas}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${getNilaiColor(d.nilai, d.kkm)}`}>{d.nilai}</p>
                    <p className="text-[10px] text-gray-400">KKM {d.kkm}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${JENIS_COLOR[d.jenis_nilai] || 'bg-gray-100 text-gray-600'}`}>
                    {d.jenis_nilai}
                  </span>
                  <span className="text-xs text-gray-500">{d.mata_pelajaran}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(d.tanggal).toLocaleDateString('id-ID')}</span>
                  <button onClick={() => handleDelete(d.id)} className="text-red-400 text-xs ml-1">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="📊 Input Nilai" size="full">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Semester</label>
              <select value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option>Ganjil</option>
                <option>Genap</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tahun Ajaran</label>
              <input value={form.tahun_ajaran} onChange={e => setForm({...form, tahun_ajaran: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Kelas *</label>
            <select value={form.kelas_id} onChange={e => setForm({...form, kelas_id: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Kelas</option>
              {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Siswa *</label>
            <select value={form.siswa_id} onChange={e => setForm({...form, siswa_id: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Siswa</option>
              {siswa.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Mata Pelajaran *</label>
            <select value={form.mata_pelajaran} onChange={e => setForm({...form, mata_pelajaran: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Mata Pelajaran</option>
              {mataPelajaran.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Jenis Nilai</label>
              <select value={form.jenis_nilai} onChange={e => setForm({...form, jenis_nilai: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                {JENIS_NILAI.map(j => <option key={j} value={j} className="capitalize">{j}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal</label>
              <input type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Nilai * (0-100)</label>
              <input type="number" min="0" max="100" value={form.nilai}
                onChange={e => setForm({...form, nilai: e.target.value})}
                placeholder="0-100"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">KKM</label>
              <input type="number" min="0" max="100" value={form.kkm}
                onChange={e => setForm({...form, kkm: parseInt(e.target.value)})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Keterangan</label>
            <input value={form.keterangan} onChange={e => setForm({...form, keterangan: e.target.value})}
              placeholder="Keterangan tambahan..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-cyan-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '💾 Simpan Nilai'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
