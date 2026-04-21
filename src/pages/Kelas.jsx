import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const INIT = {
  nama_kelas: '', tingkat: '7', jurusan: '',
  tahun_ajaran: '2024/2025', semester: 'Ganjil', kapasitas: 30
}

export default function Kelas() {
  const navigate = useNavigate()
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [siswaCount, setSiswaCount] = useState({})

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('kelas')
      .select('*, pegawai(nama)')
      .order('tingkat')
      .order('nama_kelas')

    // Count siswa per kelas
    const { data: siswaData } = await supabase.from('siswa').select('kelas_id')
    const countMap = {}
    siswaData?.forEach(s => {
      if (s.kelas_id) countMap[s.kelas_id] = (countMap[s.kelas_id] || 0) + 1
    })

    setKelas(data || [])
    setSiswaCount(countMap)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.nama_kelas) return toast.error('Nama kelas wajib diisi!')
    setSaving(true)
    let error
    if (editId) {
      ;({ error } = await supabase.from('kelas').update(form).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('kelas').insert([form]))
    }
    if (error) {
      toast.error('Gagal menyimpan kelas!')
    } else {
      toast.success(editId ? 'Kelas diupdate!' : 'Kelas berhasil ditambahkan! 🏫')
      setShowModal(false)
      setForm(INIT)
      setEditId(null)
      fetchData()
    }
    setSaving(false)
  }

  const handleEdit = (k) => {
    setForm({
      nama_kelas: k.nama_kelas, tingkat: k.tingkat, jurusan: k.jurusan || '',
      tahun_ajaran: k.tahun_ajaran, semester: k.semester, kapasitas: k.kapasitas
    })
    setEditId(k.id)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus kelas ini? Pastikan tidak ada siswa di dalamnya.')) return
    const { error } = await supabase.from('kelas').delete().eq('id', id)
    if (error) {
      toast.error('Gagal hapus! Mungkin masih ada data terkait.')
    } else {
      toast.success('Kelas dihapus!')
      fetchData()
    }
  }

  const tingkatColors = { '7': 'bg-blue-500', '8': 'bg-green-500', '9': 'bg-purple-500', '10': 'bg-orange-500', '11': 'bg-red-500', '12': 'bg-teal-500' }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-orange-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Data Kelas</h1>
        <button onClick={() => { setForm(INIT); setEditId(null); setShowModal(true) }}
          className="bg-white text-orange-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Tambah
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Summary */}
        <div className="bg-orange-50 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm text-orange-700 font-medium">Total Kelas</span>
          <span className="text-2xl font-black text-orange-600">{kelas.length}</span>
        </div>

        {loading ? <LoadingSpinner /> : kelas.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">🏫</div>
            <p className="text-gray-400">Belum ada data kelas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kelas.map(k => (
              <div key={k.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <div className={`w-14 h-14 ${tingkatColors[k.tingkat] || 'bg-gray-500'} rounded-2xl flex flex-col items-center justify-center text-white shadow-md`}>
                    <span className="text-xs font-semibold">Kelas</span>
                    <span className="text-xl font-black">{k.tingkat}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{k.nama_kelas}</h3>
                    {k.jurusan && <p className="text-xs text-gray-500">{k.jurusan}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">📅 {k.tahun_ajaran} • {k.semester}</span>
                    </div>
                    {k.pegawai && <p className="text-xs text-orange-600 mt-0.5">👨‍🏫 Wali: {k.pegawai.nama}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-orange-600">{siswaCount[k.id] || 0}</div>
                    <div className="text-[10px] text-gray-400">/{k.kapasitas} siswa</div>
                  </div>
                </div>
                <div className="px-4 py-2.5 bg-gray-50 flex gap-2">
                  <button onClick={() => handleEdit(k)}
                    className="flex-1 bg-orange-100 text-orange-700 text-xs font-bold py-2 rounded-xl">✏️ Edit</button>
                  <button onClick={() => handleDelete(k.id)}
                    className="flex-1 bg-red-100 text-red-600 text-xs font-bold py-2 rounded-xl">🗑️ Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editId ? '✏️ Edit Kelas' : '🏫 Tambah Kelas'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Nama Kelas *</label>
            <input value={form.nama_kelas} onChange={e => setForm({...form, nama_kelas: e.target.value})}
              placeholder="Contoh: Kelas 7A"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tingkat</label>
              <select value={form.tingkat} onChange={e => setForm({...form, tingkat: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                {['7','8','9','10','11','12'].map(t => <option key={t} value={t}>Kelas {t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Kapasitas</label>
              <input type="number" value={form.kapasitas} onChange={e => setForm({...form, kapasitas: parseInt(e.target.value)})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Jurusan (opsional)</label>
            <input value={form.jurusan} onChange={e => setForm({...form, jurusan: e.target.value})}
              placeholder="IPA / IPS / dll"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tahun Ajaran</label>
              <input value={form.tahun_ajaran} onChange={e => setForm({...form, tahun_ajaran: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Semester</label>
              <select value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option>Ganjil</option>
                <option>Genap</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : `💾 ${editId ? 'Update' : 'Simpan'} Kelas`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
