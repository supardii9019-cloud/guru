import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const JENIS_IZIN = ['Sakit', 'Keperluan Keluarga', 'Dinas Luar', 'Cuti Tahunan', 'Cuti Melahirkan', 'Lainnya']
const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-700',
  disetujui: 'bg-green-100 text-green-700',
  ditolak: 'bg-red-100 text-red-700'
}

export default function IzinPegawai() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    jenis_izin: '', tanggal_mulai: '', tanggal_selesai: '', alasan: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('izin_pegawai')
      .select('*, pegawai(nama)')
      .order('created_at', { ascending: false })
    setData(data || [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!form.jenis_izin || !form.tanggal_mulai || !form.tanggal_selesai || !form.alasan) {
      return toast.error('Semua field wajib diisi!')
    }
    setSaving(true)
    const { error } = await supabase.from('izin_pegawai').insert([{
      ...form, pegawai_id: pegawai?.id, status: 'pending'
    }])
    if (error) {
      toast.error('Gagal mengajukan izin!')
    } else {
      toast.success('Pengajuan izin berhasil!')
      setShowModal(false)
      setForm({ jenis_izin: '', tanggal_mulai: '', tanggal_selesai: '', alasan: '' })
      fetchData()
    }
    setSaving(false)
  }

  const handleApprove = async (id, status) => {
    await supabase.from('izin_pegawai').update({ status, disetujui_oleh: pegawai?.id }).eq('id', id)
    toast.success(status === 'disetujui' ? 'Izin disetujui!' : 'Izin ditolak!')
    fetchData()
  }

  const hitungHari = (mulai, selesai) => {
    const diff = new Date(selesai) - new Date(mulai)
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-teal-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Izin Pegawai</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-teal-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Ajukan Izin
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Pending', key: 'pending', color: 'bg-yellow-500' },
          { label: 'Disetujui', key: 'disetujui', color: 'bg-green-500' },
          { label: 'Ditolak', key: 'ditolak', color: 'bg-red-500' },
        ].map(s => (
          <div key={s.key} className={`${s.color} text-white rounded-2xl p-3 text-center`}>
            <div className="text-2xl font-black">{data.filter(d => d.status === s.key).length}</div>
            <div className="text-xs font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {loading ? <LoadingSpinner /> : data.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">✅</div>
            <p className="text-gray-400">Belum ada pengajuan izin</p>
          </div>
        ) : data.map(d => (
          <div key={d.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-800">{d.pegawai?.nama || 'Pegawai'}</p>
                  <p className="text-sm text-gray-600">📋 {d.jenis_izin}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_COLOR[d.status]}`}>
                  {d.status}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <p className="text-gray-600">📅 {new Date(d.tanggal_mulai).toLocaleDateString('id-ID')} s/d {new Date(d.tanggal_selesai).toLocaleDateString('id-ID')}</p>
                <p className="text-gray-600">⏰ {hitungHari(d.tanggal_mulai, d.tanggal_selesai)} hari</p>
                <p className="text-gray-700 font-medium">💬 {d.alasan}</p>
              </div>

              {d.status === 'pending' && pegawai?.role === 'admin' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleApprove(d.id, 'disetujui')}
                    className="flex-1 bg-green-100 text-green-700 font-bold py-2 rounded-xl text-sm">
                    ✅ Setujui
                  </button>
                  <button onClick={() => handleApprove(d.id, 'ditolak')}
                    className="flex-1 bg-red-100 text-red-700 font-bold py-2 rounded-xl text-sm">
                    ❌ Tolak
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="📋 Ajukan Izin">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Jenis Izin *</label>
            <select value={form.jenis_izin} onChange={e => setForm({...form, jenis_izin: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Jenis Izin</option>
              {JENIS_IZIN.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal Mulai *</label>
              <input type="date" value={form.tanggal_mulai} onChange={e => setForm({...form, tanggal_mulai: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal Selesai *</label>
              <input type="date" value={form.tanggal_selesai} onChange={e => setForm({...form, tanggal_selesai: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Alasan *</label>
            <textarea value={form.alasan} onChange={e => setForm({...form, alasan: e.target.value})}
              placeholder="Jelaskan alasan pengajuan izin..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Mengajukan...' : '📤 Ajukan Izin'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
