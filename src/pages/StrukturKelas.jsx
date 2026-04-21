import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const JABATAN = ['Ketua Kelas', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Sie Kebersihan', 'Sie Keamanan', 'Sie Kegiatan', 'Anggota']
const JABATAN_ICON = {
  'Ketua Kelas': '👑', 'Wakil Ketua': '🥈', 'Sekretaris': '📝',
  'Bendahara': '💰', 'Sie Kebersihan': '🧹', 'Sie Keamanan': '🛡️',
  'Sie Kegiatan': '🎭', 'Anggota': '👤'
}

export default function StrukturKelas() {
  const navigate = useNavigate()
  const [struktur, setStruktur] = useState([])
  const [kelas, setKelas] = useState([])
  const [siswa, setSiswa] = useState([])
  const [selectedKelas, setSelectedKelas] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ siswa_id: '', jabatan: 'Ketua Kelas' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
  }, [])

  useEffect(() => {
    if (selectedKelas) {
      fetchStruktur()
      supabase.from('siswa').select('*').eq('kelas_id', selectedKelas).order('nama')
        .then(({ data }) => setSiswa(data || []))
    }
  }, [selectedKelas])

  const fetchStruktur = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('struktur_kelas')
      .select('*, siswa(nama, nis, jenis_kelamin)')
      .eq('kelas_id', selectedKelas)
      .order('jabatan')
    setStruktur(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.siswa_id || !selectedKelas) return toast.error('Pilih siswa dan jabatan!')
    setSaving(true)
    const { error } = await supabase.from('struktur_kelas').insert([{
      ...form, kelas_id: selectedKelas
    }])
    if (error) {
      toast.error('Gagal menyimpan!')
    } else {
      toast.success('Struktur kelas diperbarui!')
      setShowModal(false)
      setForm({ siswa_id: '', jabatan: 'Ketua Kelas' })
      fetchStruktur()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('struktur_kelas').delete().eq('id', id)
    toast.success('Dihapus!')
    fetchStruktur()
  }

  const selectedKelasName = kelas.find(k => k.id === selectedKelas)?.nama_kelas || ''

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-amber-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Struktur Kelas</h1>
        {selectedKelas && (
          <button onClick={() => setShowModal(true)} className="bg-white text-amber-700 px-4 py-2 rounded-xl text-sm font-bold">
            + Tambah
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Pilih Kelas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 block mb-2">🏫 Pilih Kelas</label>
          <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">Pilih Kelas</option>
            {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
          </select>
        </div>

        {/* Struktur */}
        {selectedKelas && (
          <>
            <div className="bg-amber-50 rounded-2xl p-3 text-center">
              <h2 className="font-bold text-amber-800">Struktur Organisasi</h2>
              <p className="text-sm text-amber-600">{selectedKelasName}</p>
            </div>

            {loading ? <LoadingSpinner /> : struktur.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">🏗️</div>
                <p className="text-gray-400 text-sm">Belum ada struktur kelas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {struktur.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl">
                      {JABATAN_ICON[s.jabatan] || '👤'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{s.siswa?.nama}</p>
                      <p className="text-sm text-amber-700 font-medium">{s.jabatan}</p>
                    </div>
                    <button onClick={() => handleDelete(s.id)} className="text-red-400 text-sm">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!selectedKelas && (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">🏗️</div>
            <p className="text-gray-400">Pilih kelas untuk melihat struktur organisasi</p>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="🏗️ Tambah Pengurus Kelas">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Siswa *</label>
            <select value={form.siswa_id} onChange={e => setForm({...form, siswa_id: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Siswa</option>
              {siswa.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Jabatan *</label>
            <select value={form.jabatan} onChange={e => setForm({...form, jabatan: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              {JABATAN.map(j => <option key={j} value={j}>{JABATAN_ICON[j]} {j}</option>)}
            </select>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-amber-700 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '💾 Simpan'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
