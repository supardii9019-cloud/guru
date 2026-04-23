import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const KATEGORI_KAIH = [
  { key: 'K', label: 'Kehadiran', emoji: '✅', color: 'bg-green-100 text-green-700' },
  { key: 'A', label: 'Akademik', emoji: '📚', color: 'bg-blue-100 text-blue-700' },
  { key: 'I', label: 'Ibadah', emoji: '🕌', color: 'bg-purple-100 text-purple-700' },
  { key: 'H', label: 'Hafalan', emoji: '📖', color: 'bg-orange-100 text-orange-700' },
]

const INIT = {
  kelas_id: '',
  tanggal: new Date().toISOString().split('T')[0],
  jam_ke: '',
  materi: '',
  kegiatan_pembelajaran: '',
  media_pembelajaran: '',
  metode: '',
  catatan: '',
  mata_pelajaran: '7 KAIH',
  kategori_kaih: 'K',
}

export default function Jurnal7KAIH() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [jurnal, setJurnal] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [filterKategori, setFilterKategori] = useState('')

  const metodeList = [
    'Ceramah', 'Diskusi', 'Praktik', 'Demonstrasi',
    'Hafalan Bersama', 'Tanya Jawab', 'Penugasan', 'Observasi'
  ]

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [jRes, kRes] = await Promise.all([
      supabase.from('jurnal_mengajar')
        .select('*, kelas(nama_kelas), pegawai(nama)')
        .eq('mata_pelajaran', '7 KAIH')
        .order('tanggal', { ascending: false })
        .limit(50),
      supabase.from('kelas').select('*').order('nama_kelas')
    ])
    setJurnal(jRes.data || [])
    setKelas(kRes.data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.kelas_id || !form.materi) {
      return toast.error('Kelas dan materi wajib diisi!')
    }
    setSaving(true)
    const { error } = await supabase.from('jurnal_mengajar').insert([{
      ...form,
      guru_id: pegawai?.id,
      mata_pelajaran: `7 KAIH - ${form.kategori_kaih}`,
    }])
    if (error) {
      toast.error('Gagal menyimpan jurnal!')
    } else {
      toast.success('Jurnal 7 KAIH berhasil disimpan! 📖')
      setShowModal(false)
      setForm(INIT)
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

  const filtered = filterKategori
    ? jurnal.filter(j => j.mata_pelajaran?.includes(filterKategori))
    : jurnal

  const getKategoriInfo = (mapel) => {
    const k = KATEGORI_KAIH.find(k => mapel?.includes(k.key))
    return k || KATEGORI_KAIH[0]
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Jurnal 7 KAIH</h1>
          <p className="text-blue-200 text-xs">Kehadiran • Akademik • Ibadah • Hafalan</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold">
          + Tambah
        </button>
      </div>

      {/* Filter KAIH */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {KATEGORI_KAIH.map(k => (
            <button key={k.key}
              onClick={() => setFilterKategori(filterKategori === k.key ? '' : k.key)}
              className={`rounded-2xl p-3 text-center transition-all border-2 ${
                filterKategori === k.key ? 'border-blue-500 shadow-md scale-105' : 'border-transparent'
              } ${k.color}`}>
              <div className="text-xl">{k.emoji}</div>
              <div className="text-[10px] font-bold mt-1">{k.label}</div>
              <div className="text-lg font-black">
                {jurnal.filter(j => j.mata_pelajaran?.includes(k.key)).length}
              </div>
            </button>
          ))}
        </div>

        {filterKategori && (
          <div className="bg-blue-50 rounded-xl px-4 py-2 flex items-center justify-between mb-3">
            <span className="text-sm text-blue-700 font-medium">
              Filter: {KATEGORI_KAIH.find(k => k.key === filterKategori)?.label}
            </span>
            <button onClick={() => setFilterKategori('')} className="text-blue-500 text-xs font-bold">✕ Hapus</button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="px-4 space-y-3">
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">📖</div>
            <p className="text-gray-400 font-medium">Belum ada jurnal 7 KAIH</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold">
              Buat Jurnal Pertama
            </button>
          </div>
        ) : filtered.map(j => {
          const kategori = getKategoriInfo(j.mata_pelajaran)
          return (
            <div key={j.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className={`px-4 py-3 flex items-center justify-between ${kategori.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{kategori.emoji}</span>
                  <div>
                    <span className="text-sm font-bold">{kategori.label}</span>
                    <span className="text-xs ml-2 opacity-70">• {j.kelas?.nama_kelas}</span>
                  </div>
                </div>
                <span className="text-xs opacity-70">
                  {new Date(j.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="font-semibold text-gray-800 text-sm mb-1">📌 {j.materi}</p>
                {j.kegiatan_pembelajaran && (
                  <p className="text-xs text-gray-500 line-clamp-2">{j.kegiatan_pembelajaran}</p>
                )}
                {j.metode && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                    {j.metode}
                  </span>
                )}
                {j.catatan && (
                  <p className="text-xs text-orange-600 mt-1">📝 {j.catatan}</p>
                )}
              </div>
              <div className="px-4 py-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400">oleh: {j.pegawai?.nama || 'Guru'}</span>
                <div className="flex gap-2">
                  <button onClick={() => setDetail(j)}
                    className="text-xs text-blue-500 font-medium px-3 py-1 bg-blue-50 rounded-lg">Detail</button>
                  <button onClick={() => handleDelete(j.id)}
                    className="text-xs text-red-500 font-medium px-3 py-1 bg-red-50 rounded-lg">Hapus</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Tambah */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="📖 Tambah Jurnal 7 KAIH" size="full">
        <div className="space-y-4">
          {/* Pilih Kategori KAIH */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">Kategori KAIH *</label>
            <div className="grid grid-cols-4 gap-2">
              {KATEGORI_KAIH.map(k => (
                <button key={k.key}
                  onClick={() => setForm({...form, kategori_kaih: k.key})}
                  className={`p-3 rounded-2xl text-center border-2 transition-all ${
                    form.kategori_kaih === k.key
                      ? 'border-blue-500 ' + k.color
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                  <div className="text-xl">{k.emoji}</div>
                  <div className="text-[10px] font-bold mt-1">{k.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal *</label>
              <input type="date" value={form.tanggal}
                onChange={e => setForm({...form, tanggal: e.target.value})}
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
            <label className="text-xs font-semibold text-gray-500 block mb-1">Materi / Kegiatan *</label>
            <textarea value={form.materi} onChange={e => setForm({...form, materi: e.target.value})}
              placeholder="Topik/materi yang dilaksanakan..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Detail Kegiatan</label>
            <textarea value={form.kegiatan_pembelajaran}
              onChange={e => setForm({...form, kegiatan_pembelajaran: e.target.value})}
              placeholder="Deskripsi detail kegiatan..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Media</label>
              <input type="text" placeholder="Al-Quran, PPT, dll" value={form.media_pembelajaran}
                onChange={e => setForm({...form, media_pembelajaran: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Metode</label>
              <select value={form.metode} onChange={e => setForm({...form, metode: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Pilih</option>
                {metodeList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Catatan</label>
            <textarea value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})}
              placeholder="Catatan tambahan..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-blue-700 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '💾 Simpan Jurnal 7 KAIH'}
          </button>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Detail Jurnal 7 KAIH">
        {detail && (
          <div className="space-y-3 text-sm">
            {[
              { label: '📅 Tanggal', val: new Date(detail.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
              { label: '🏫 Kelas', val: detail.kelas?.nama_kelas },
              { label: '📖 Kategori', val: detail.mata_pelajaran },
              { label: '⏰ Jam Ke', val: detail.jam_ke || '-' },
              { label: '📌 Materi', val: detail.materi },
              { label: '🎯 Detail Kegiatan', val: detail.kegiatan_pembelajaran || '-' },
              { label: '🖥️ Media', val: detail.media_pembelajaran || '-' },
              { label: '🔧 Metode', val: detail.metode || '-' },
              { label: '📝 Catatan', val: detail.catatan || '-' },
              { label: '👨‍🏫 Guru', val: detail.pegawai?.nama || '-' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500">{item.label}</p>
                <p className="font-medium text-gray-800 mt-0.5">{item.val}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
