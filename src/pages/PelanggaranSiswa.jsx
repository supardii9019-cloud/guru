import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const KATEGORI = ['ringan', 'sedang', 'berat']
const KATEGORI_COLOR = {
  ringan: 'bg-yellow-100 text-yellow-700',
  sedang: 'bg-orange-100 text-orange-700',
  berat: 'bg-red-100 text-red-700',
}

const JENIS = [
  'Terlambat', 'Seragam Tidak Rapi', 'Tidak Membawa Buku',
  'Gadget Tanpa Izin', 'Tidak Mengerjakan PR', 'Ribut di Kelas',
  'Membolos', 'Berkelahi', 'Merokok', 'Lainnya'
]

export default function PelanggaranSiswa() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [data, setData] = useState([])
  const [siswa, setSiswa] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterKategori, setFilterKategori] = useState('')
  const [form, setForm] = useState({
    siswa_id: '', jenis_pelanggaran: '', kategori: 'ringan',
    deskripsi: '', poin: 5, tindakan: '', tanggal: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
    supabase.from('siswa').select('id, nama, nis').order('nama').then(({ data }) => setSiswa(data || []))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pelanggaran_siswa')
      .select('*, siswa(nama, nis), pegawai(nama)')
      .order('tanggal', { ascending: false })
    setData(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.siswa_id || !form.jenis_pelanggaran) return toast.error('Siswa dan jenis pelanggaran wajib diisi!')
    setSaving(true)
    const { error } = await supabase.from('pelanggaran_siswa').insert([{ ...form, guru_id: pegawai?.id }])
    if (error) {
      toast.error('Gagal menyimpan!')
    } else {
      toast.success('Pelanggaran berhasil dicatat!')
      setShowModal(false)
      setForm({ siswa_id: '', jenis_pelanggaran: '', kategori: 'ringan', deskripsi: '', poin: 5, tindakan: '', tanggal: new Date().toISOString().split('T')[0] })
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus data pelanggaran ini?')) return
    await supabase.from('pelanggaran_siswa').delete().eq('id', id)
    toast.success('Data dihapus!')
    fetchData()
  }

  const filtered = filterKategori ? data.filter(d => d.kategori === filterKategori) : data

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-rose-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Pelanggaran Siswa</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-rose-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Catat
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          {KATEGORI.map(k => (
            <div key={k} className={`rounded-2xl p-3 text-center cursor-pointer transition-all ${filterKategori === k ? 'ring-2 ring-rose-500' : ''} ${KATEGORI_COLOR[k]} bg-opacity-80`}
              onClick={() => setFilterKategori(filterKategori === k ? '' : k)}>
              <div className="text-xl font-black">{data.filter(d => d.kategori === k).length}</div>
              <div className="text-xs font-bold capitalize">{k}</div>
            </div>
          ))}
        </div>

        {filterKategori && (
          <div className="bg-rose-50 rounded-xl px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-rose-700 font-medium">Filter: {filterKategori}</span>
            <button onClick={() => setFilterKategori('')} className="text-rose-500 text-xs">Hapus filter</button>
          </div>
        )}

        {/* List */}
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">⚠️</div>
            <p className="text-gray-400">Tidak ada data pelanggaran</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-l-4 border-l-rose-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800 text-sm">{d.siswa?.nama}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${KATEGORI_COLOR[d.kategori]}`}>
                          {d.kategori}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">🚫 {d.jenis_pelanggaran}</p>
                      {d.deskripsi && <p className="text-xs text-gray-400 mt-1">{d.deskripsi}</p>}
                      {d.tindakan && <p className="text-xs text-blue-600 mt-1">✅ Tindakan: {d.tindakan}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400">
                          📅 {new Date(d.tanggal).toLocaleDateString('id-ID')}
                        </span>
                        <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                          -{d.poin} poin
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(d.id)} className="text-red-400 text-xs ml-2 p-1">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="⚠️ Catat Pelanggaran" size="full">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Siswa *</label>
            <select value={form.siswa_id} onChange={e => setForm({...form, siswa_id: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Siswa</option>
              {siswa.map(s => <option key={s.id} value={s.id}>{s.nama} - {s.nis}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Jenis Pelanggaran *</label>
            <select value={form.jenis_pelanggaran} onChange={e => setForm({...form, jenis_pelanggaran: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Jenis</option>
              {JENIS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Kategori</label>
              <select value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                {KATEGORI.map(k => <option key={k} value={k} className="capitalize">{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Poin Pengurangan</label>
              <input type="number" min="1" max="100" value={form.poin}
                onChange={e => setForm({...form, poin: parseInt(e.target.value)})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal</label>
            <input type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Deskripsi</label>
            <textarea value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})}
              placeholder="Deskripsi pelanggaran..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tindakan yang Diambil</label>
            <textarea value={form.tindakan} onChange={e => setForm({...form, tindakan: e.target.value})}
              placeholder="Tindakan/sanksi yang diberikan..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '💾 Simpan Pelanggaran'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
