import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const INIT = {
  nis: '', nisn: '', nama: '', kelas_id: '', jenis_kelamin: 'L',
  tanggal_lahir: '', tempat_lahir: '', alamat: '',
  nama_ortu: '', no_hp_ortu: '', status: 'aktif'
}

export default function Siswa() {
  const navigate = useNavigate()
  const [siswa, setSiswa] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [detail, setDetail] = useState(null)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    fetchData()
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .order('nama')
    setSiswa(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.nis || !form.nama) return toast.error('NIS dan nama wajib diisi!')
    setSaving(true)
    const payload = { ...form }

    let error
    if (editMode && detail) {
      ;({ error } = await supabase.from('siswa').update(payload).eq('id', detail.id))
    } else {
      ;({ error } = await supabase.from('siswa').insert([payload]))
    }

    if (error) {
      toast.error(error.message.includes('unique') ? 'NIS sudah digunakan!' : 'Gagal menyimpan!')
    } else {
      toast.success(editMode ? 'Data siswa diupdate!' : 'Siswa berhasil ditambahkan! 👨‍🎓')
      setShowModal(false)
      setForm(INIT)
      setEditMode(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleEdit = (s) => {
    setForm({
      nis: s.nis, nisn: s.nisn || '', nama: s.nama, kelas_id: s.kelas_id || '',
      jenis_kelamin: s.jenis_kelamin || 'L', tanggal_lahir: s.tanggal_lahir || '',
      tempat_lahir: s.tempat_lahir || '', alamat: s.alamat || '',
      nama_ortu: s.nama_ortu || '', no_hp_ortu: s.no_hp_ortu || '', status: s.status || 'aktif'
    })
    setDetail(s)
    setEditMode(true)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus data siswa ini?')) return
    await supabase.from('siswa').delete().eq('id', id)
    toast.success('Siswa dihapus!')
    fetchData()
  }

  const filtered = siswa.filter(s => {
    const matchSearch = !search || s.nama.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search)
    const matchKelas = !filterKelas || s.kelas_id === filterKelas
    return matchSearch && matchKelas
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-teal-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Data Siswa</h1>
        <button onClick={() => { setForm(INIT); setEditMode(false); setShowModal(true) }}
          className="bg-white text-teal-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Tambah
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Search & Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Cari nama atau NIS siswa..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none" />
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">Semua Kelas</option>
            {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="bg-teal-50 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm text-teal-700 font-medium">Total Siswa</span>
          <span className="text-2xl font-black text-teal-600">{filtered.length}</span>
        </div>

        {/* List */}
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">👨‍🎓</div>
            <p className="text-gray-400">Tidak ada data siswa</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black ${s.jenis_kelamin === 'P' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                    {s.jenis_kelamin === 'P' ? '👧' : '👦'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{s.nama}</p>
                    <p className="text-xs text-gray-500">NIS: {s.nis} • {s.kelas?.nama_kelas || 'Belum ada kelas'}</p>
                    {s.nama_ortu && <p className="text-xs text-gray-400">Ortu: {s.nama_ortu}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${s.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleEdit(s)}
                    className="flex-1 bg-teal-50 text-teal-700 text-xs font-bold py-2 rounded-xl">✏️ Edit</button>
                  <button onClick={() => handleDelete(s.id)}
                    className="flex-1 bg-red-50 text-red-600 text-xs font-bold py-2 rounded-xl">🗑️ Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editMode ? '✏️ Edit Siswa' : '👨‍🎓 Tambah Siswa'} size="full">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">NIS *</label>
              <input value={form.nis} onChange={e => setForm({...form, nis: e.target.value})}
                placeholder="Nomor Induk Siswa"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">NISN</label>
              <input value={form.nisn} onChange={e => setForm({...form, nisn: e.target.value})}
                placeholder="NISN"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Nama Lengkap *</label>
            <input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})}
              placeholder="Nama lengkap siswa"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Kelas</label>
              <select value={form.kelas_id} onChange={e => setForm({...form, kelas_id: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Pilih Kelas</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Jenis Kelamin</label>
              <select value={form.jenis_kelamin} onChange={e => setForm({...form, jenis_kelamin: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tempat Lahir</label>
              <input value={form.tempat_lahir} onChange={e => setForm({...form, tempat_lahir: e.target.value})}
                placeholder="Kota"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal Lahir</label>
              <input type="date" value={form.tanggal_lahir} onChange={e => setForm({...form, tanggal_lahir: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Alamat</label>
            <textarea value={form.alamat} onChange={e => setForm({...form, alamat: e.target.value})}
              placeholder="Alamat lengkap" rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Nama Orang Tua</label>
              <input value={form.nama_ortu} onChange={e => setForm({...form, nama_ortu: e.target.value})}
                placeholder="Nama wali/ortu"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">No. HP Ortu</label>
              <input value={form.no_hp_ortu} onChange={e => setForm({...form, no_hp_ortu: e.target.value})}
                placeholder="08xxxxxxxxxx"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : `💾 ${editMode ? 'Update' : 'Simpan'} Data Siswa`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
