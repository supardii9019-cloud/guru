import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function JurnalWali() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [jurnal, setJurnal] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    kelas_id: '', tanggal: new Date().toISOString().split('T')[0],
    jam_ke: '', materi: '', kegiatan_pembelajaran: '',
    media_pembelajaran: '', metode: '', catatan: '', mata_pelajaran: 'Wali Kelas'
  })

  useEffect(() => {
    fetchData()
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('jurnal_mengajar')
      .select('*, kelas(nama_kelas)')
      .eq('mata_pelajaran', 'Wali Kelas')
      .order('tanggal', { ascending: false })
    setJurnal(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.kelas_id || !form.materi) return toast.error('Kelas dan materi wajib diisi!')
    setSaving(true)
    const { error } = await supabase.from('jurnal_mengajar').insert([{ ...form, guru_id: pegawai?.id }])
    if (error) {
      toast.error('Gagal menyimpan jurnal wali!')
    } else {
      toast.success('Jurnal wali kelas disimpan! 👨‍👩‍👧')
      setShowModal(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus jurnal ini?')) return
    await supabase.from('jurnal_mengajar').delete().eq('id', id)
    toast.success('Jurnal dihapus!')
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-pink-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Jurnal Guru Wali</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-pink-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Tambah
        </button>
      </div>

      <div className="p-4 space-y-3">
        {loading ? <LoadingSpinner /> : jurnal.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">👨‍👩‍👧</div>
            <p className="text-gray-400">Belum ada jurnal wali kelas</p>
            <button onClick={() => setShowModal(true)} className="mt-4 bg-pink-500 text-white px-6 py-3 rounded-2xl font-bold">
              Buat Jurnal Pertama
            </button>
          </div>
        ) : jurnal.map(j => (
          <div key={j.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-pink-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-bold text-pink-700">{j.kelas?.nama_kelas}</span>
              <span className="text-xs text-gray-500">
                {new Date(j.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="font-semibold text-gray-800 text-sm mb-1">📌 {j.materi}</p>
              {j.kegiatan_pembelajaran && (
                <p className="text-xs text-gray-500 line-clamp-2">{j.kegiatan_pembelajaran}</p>
              )}
              {j.catatan && (
                <p className="text-xs text-pink-600 mt-1">📝 {j.catatan}</p>
              )}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 flex justify-end">
              <button onClick={() => handleDelete(j.id)} className="text-xs text-red-500 font-medium px-3 py-1 bg-red-50 rounded-lg">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="👨‍👩‍👧 Jurnal Wali Kelas" size="full">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal *</label>
              <input type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Jam Ke</label>
              <input type="text" placeholder="1-2" value={form.jam_ke}
                onChange={e => setForm({...form, jam_ke: e.target.value})}
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
            <label className="text-xs font-semibold text-gray-500 block mb-1">Kegiatan / Materi *</label>
            <textarea value={form.materi} onChange={e => setForm({...form, materi: e.target.value})}
              placeholder="Kegiatan wali kelas hari ini..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Detail Kegiatan</label>
            <textarea value={form.kegiatan_pembelajaran} onChange={e => setForm({...form, kegiatan_pembelajaran: e.target.value})}
              placeholder="Detail kegiatan..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Catatan</label>
            <textarea value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})}
              placeholder="Catatan tambahan..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-pink-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '💾 Simpan Jurnal Wali'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
