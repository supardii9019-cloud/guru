import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const INIT = {
  judul: '', mata_pelajaran: '', kelas_target: '',
  deskripsi: '', konten: '', file_url: '',
  semester: 'Ganjil', tahun_ajaran: '2024/2025'
}

export default function ModulPembelajaran() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [modul, setModul] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)

  const mataPelajaran = ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PKn', 'Bahasa Inggris', 'PAI', 'PJOK', 'SBdP']
  const kelasList = ['Kelas 7', 'Kelas 8', 'Kelas 9', 'Kelas 10', 'Kelas 11', 'Kelas 12', 'Semua Kelas']

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('modul_pembelajaran')
      .select('*, pegawai(nama)')
      .order('created_at', { ascending: false })
    setModul(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.judul || !form.mata_pelajaran) return toast.error('Judul dan mata pelajaran wajib diisi!')
    setSaving(true)
    const { error } = await supabase.from('modul_pembelajaran').insert([{ ...form, guru_id: pegawai?.id }])
    if (error) {
      toast.error('Gagal menyimpan modul!')
    } else {
      toast.success('Modul pembelajaran ditambahkan! 📚')
      setShowModal(false)
      setForm(INIT)
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus modul ini?')) return
    await supabase.from('modul_pembelajaran').delete().eq('id', id)
    toast.success('Modul dihapus!')
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-red-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Modul Pembelajaran</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-red-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Tambah
        </button>
      </div>

      <div className="p-4 space-y-3">
        {loading ? <LoadingSpinner /> : modul.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">📚</div>
            <p className="text-gray-400">Belum ada modul pembelajaran</p>
            <button onClick={() => setShowModal(true)} className="mt-4 bg-red-500 text-white px-6 py-3 rounded-2xl font-bold">
              Tambah Modul Pertama
            </button>
          </div>
        ) : modul.map(m => (
          <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-2xl">📚</div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{m.judul}</h3>
                  <p className="text-xs text-gray-500">{m.mata_pelajaran} • {m.kelas_target || 'Semua Kelas'}</p>
                  <p className="text-xs text-gray-400">{m.semester} {m.tahun_ajaran}</p>
                </div>
              </div>
              {m.deskripsi && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{m.deskripsi}</p>}
              <div className="flex gap-2">
                {m.file_url && (
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 bg-red-50 text-red-700 text-xs font-bold py-2 rounded-xl text-center">
                    🔗 Buka Modul
                  </a>
                )}
                <button onClick={() => setDetail(m)}
                  className="flex-1 bg-gray-50 text-gray-700 text-xs font-bold py-2 rounded-xl">
                  👁️ Detail
                </button>
                <button onClick={() => handleDelete(m.id)}
                  className="bg-red-50 text-red-500 text-xs font-bold px-3 py-2 rounded-xl">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="📚 Tambah Modul" size="full">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Judul Modul *</label>
            <input value={form.judul} onChange={e => setForm({...form, judul: e.target.value})}
              placeholder="Judul modul pembelajaran"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Mata Pelajaran *</label>
              <select value={form.mata_pelajaran} onChange={e => setForm({...form, mata_pelajaran: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Pilih</option>
                {mataPelajaran.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Kelas Target</label>
              <select value={form.kelas_target} onChange={e => setForm({...form, kelas_target: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Pilih Kelas</option>
                {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Deskripsi</label>
            <textarea value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})}
              placeholder="Deskripsi modul..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Konten / Isi</label>
            <textarea value={form.konten} onChange={e => setForm({...form, konten: e.target.value})}
              placeholder="Isi konten modul..." rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">URL File / Link</label>
            <input value={form.file_url} onChange={e => setForm({...form, file_url: e.target.value})}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
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
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '💾 Simpan Modul'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Detail Modul" size="full">
        {detail && (
          <div className="space-y-3 text-sm">
            {[
              { label: '📚 Judul', val: detail.judul },
              { label: '📖 Mata Pelajaran', val: detail.mata_pelajaran },
              { label: '🏫 Kelas Target', val: detail.kelas_target || 'Semua Kelas' },
              { label: '📅 Semester', val: `${detail.semester} ${detail.tahun_ajaran}` },
              { label: '📝 Deskripsi', val: detail.deskripsi || '-' },
              { label: '📄 Konten', val: detail.konten || '-' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500">{item.label}</p>
                <p className="font-medium text-gray-800 mt-0.5 whitespace-pre-line">{item.val}</p>
              </div>
            ))}
            {detail.file_url && (
              <a href={detail.file_url} target="_blank" rel="noopener noreferrer"
                className="block text-center bg-red-600 text-white font-bold py-3 rounded-2xl">
                🔗 Buka File Modul
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
