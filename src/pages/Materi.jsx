import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const INIT = {
  judul: '', mata_pelajaran: '', kelas_id: '',
  deskripsi: '', konten: '', file_url: '', tipe_file: '', semester: 'Ganjil'
}

export default function Materi() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [materi, setMateri] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [filterMapel, setFilterMapel] = useState('')
  const [detail, setDetail] = useState(null)

  const mataPelajaran = ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PKn', 'Bahasa Inggris', 'PAI', 'PJOK', 'SBdP']
  const tipeFile = ['PDF', 'PPT', 'Word', 'Video', 'Link', 'Gambar', 'Lainnya']

  useEffect(() => {
    fetchData()
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('materi')
      .select('*, kelas(nama_kelas), pegawai(nama)')
      .order('created_at', { ascending: false })
    setMateri(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.judul || !form.mata_pelajaran) return toast.error('Judul dan mata pelajaran wajib diisi!')
    setSaving(true)
    const { error } = await supabase.from('materi').insert([{ ...form, guru_id: pegawai?.id }])
    if (error) {
      toast.error('Gagal menyimpan materi!')
    } else {
      toast.success('Materi berhasil ditambahkan! ☁️')
      setShowModal(false)
      setForm(INIT)
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus materi ini?')) return
    await supabase.from('materi').delete().eq('id', id)
    toast.success('Materi dihapus!')
    fetchData()
  }

  const filtered = filterMapel ? materi.filter(m => m.mata_pelajaran === filterMapel) : materi

  const tipeIcon = { PDF: '📄', PPT: '📊', Word: '📝', Video: '🎥', Link: '🔗', Gambar: '🖼️', Lainnya: '📁' }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-purple-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Materi Pembelajaran</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-purple-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Upload
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Filter */}
        <select value={filterMapel} onChange={e => setFilterMapel(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm shadow-sm">
          <option value="">Semua Mata Pelajaran</option>
          {mataPelajaran.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* List */}
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">☁️</div>
            <p className="text-gray-400">Belum ada materi pembelajaran</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 bg-purple-500 text-white px-6 py-3 rounded-2xl font-bold">Upload Materi Pertama</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">
                      {tipeIcon[m.tipe_file] || '📁'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{m.judul}</h3>
                      <p className="text-xs text-gray-500">{m.mata_pelajaran} • {m.kelas?.nama_kelas || 'Semua Kelas'}</p>
                      {m.deskripsi && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{m.deskripsi}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {m.tipe_file && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                            {m.tipe_file}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {new Date(m.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {m.file_url && (
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-2 bg-purple-50 text-purple-700 text-sm font-bold py-2.5 rounded-xl">
                      🔗 Buka / Unduh Materi
                    </a>
                  )}
                </div>
                <div className="px-4 py-2.5 bg-gray-50 flex justify-between items-center">
                  <span className="text-xs text-gray-400">oleh: {m.pegawai?.nama || 'Guru'}</span>
                  <button onClick={() => handleDelete(m.id)} className="text-red-400 text-xs font-medium">🗑️ Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="☁️ Upload Materi" size="full">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Judul Materi *</label>
            <input value={form.judul} onChange={e => setForm({...form, judul: e.target.value})}
              placeholder="Judul materi pembelajaran"
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
              <label className="text-xs font-semibold text-gray-500 block mb-1">Kelas</label>
              <select value={form.kelas_id} onChange={e => setForm({...form, kelas_id: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Semua Kelas</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Deskripsi</label>
            <textarea value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})}
              placeholder="Deskripsi singkat materi..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Konten / Ringkasan</label>
            <textarea value={form.konten} onChange={e => setForm({...form, konten: e.target.value})}
              placeholder="Isi ringkasan materi..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tipe File</label>
              <select value={form.tipe_file} onChange={e => setForm({...form, tipe_file: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Pilih Tipe</option>
                {tipeFile.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">URL File / Link</label>
            <input value={form.file_url} onChange={e => setForm({...form, file_url: e.target.value})}
              placeholder="https://drive.google.com/..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '☁️ Simpan Materi'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
