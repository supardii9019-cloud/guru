import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const HARI_COLOR = {
  Senin: 'bg-red-50 border-red-200',
  Selasa: 'bg-orange-50 border-orange-200',
  Rabu: 'bg-yellow-50 border-yellow-200',
  Kamis: 'bg-green-50 border-green-200',
  Jumat: 'bg-blue-50 border-blue-200',
  Sabtu: 'bg-purple-50 border-purple-200',
}

export default function JadwalPiket() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [jadwal, setJadwal] = useState([])
  const [pegawaiList, setPegawaiList] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    pegawai_id: '', hari: 'Senin', jam_mulai: '07:00', jam_selesai: '14:00', tugas: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
    supabase.from('pegawai').select('id, nama').order('nama').then(({ data }) => setPegawaiList(data || []))
  }, [])

  const fetchData = async () => {
    const { data } = await supabase
      .from('jadwal_piket')
      .select('*, pegawai(nama)')
      .order('hari')
    setJadwal(data || [])
  }

  const handleSave = async () => {
    if (!form.pegawai_id || !form.hari) return toast.error('Pegawai dan hari wajib dipilih!')
    setSaving(true)
    const { error } = await supabase.from('jadwal_piket').insert([form])
    if (error) {
      toast.error('Gagal menyimpan!')
    } else {
      toast.success('Jadwal piket ditambahkan!')
      setShowModal(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('jadwal_piket').delete().eq('id', id)
    toast.success('Jadwal dihapus!')
    fetchData()
  }

  const hariIni = HARI[new Date().getDay() - 1]

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-amber-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Jadwal Piket</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-amber-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Tambah
        </button>
      </div>

      <div className="p-4 space-y-3">
        {HARI.map(hari => {
          const jadwalHari = jadwal.filter(j => j.hari === hari)
          const isHariIni = hari === hariIni

          return (
            <div key={hari} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 ${isHariIni ? 'border-amber-400' : 'border-transparent'}`}>
              <div className={`px-4 py-2.5 flex items-center justify-between ${HARI_COLOR[hari] || 'bg-gray-50'} border-b border-gray-100`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{hari}</span>
                  {isHariIni && <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">Hari Ini</span>}
                </div>
                <span className="text-xs text-gray-500">{jadwalHari.length} petugas</span>
              </div>

              {jadwalHari.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {jadwalHari.map(j => (
                    <div key={j.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-lg">👤</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{j.pegawai?.nama}</p>
                        <p className="text-xs text-gray-500">
                          ⏰ {j.jam_mulai} - {j.jam_selesai}
                          {j.tugas && ` • ${j.tugas}`}
                        </p>
                      </div>
                      <button onClick={() => handleDelete(j.id)} className="text-red-400 text-sm">🗑️</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">Belum ada jadwal piket</div>
              )}
            </div>
          )
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="🗓️ Tambah Jadwal Piket">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Pegawai *</label>
            <select value={form.pegawai_id} onChange={e => setForm({...form, pegawai_id: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Pegawai</option>
              {pegawaiList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Hari *</label>
            <select value={form.hari} onChange={e => setForm({...form, hari: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              {HARI.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Jam Mulai</label>
              <input type="time" value={form.jam_mulai} onChange={e => setForm({...form, jam_mulai: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Jam Selesai</label>
              <input type="time" value={form.jam_selesai} onChange={e => setForm({...form, jam_selesai: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tugas/Keterangan</label>
            <input value={form.tugas} onChange={e => setForm({...form, tugas: e.target.value})}
              placeholder="Contoh: Jaga pintu gerbang"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-amber-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '💾 Simpan Jadwal'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
