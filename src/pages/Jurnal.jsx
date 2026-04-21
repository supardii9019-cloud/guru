import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const INIT = {
  kelas_id: '', mata_pelajaran: '', tanggal: new Date().toISOString().split('T')[0],
  jam_ke: '', materi: '', kegiatan_pembelajaran: '', media_pembelajaran: '', metode: '', catatan: ''
}

export default function Jurnal() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [jurnal, setJurnal] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)

  const mataPelajaran = ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PKn', 'Bahasa Inggris', 'PAI', 'PJOK', 'SBdP']
  const metodeList = ['Ceramah', 'Diskusi', 'Praktik', 'Demonstrasi', 'Problem Based Learning', 'Project Based Learning', 'Cooperative Learning']

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [jRes, kRes] = await Promise.all([
      supabase.from('jurnal_mengajar')
        .select('*, kelas(nama_kelas), pegawai(nama)')
        .eq(pegawai?.id ? 'guru_id' : 'id', pegawai?.id || '')
        .order('tanggal', { ascending: false })
        .limit(30),
      supabase.from('kelas').select('*').order('nama_kelas')
    ])
    setJurnal(jRes.data || [])
    setKelas(kRes.data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.kelas_id || !form.mata_pelajaran || !form.materi) {
      return toast.error('Kelas, mata pelajaran, dan materi wajib diisi!')
    }
    setSaving(true)
    const { error } = await supabase.from('jurnal_mengajar').insert([{
      ...form,
      guru_id: pegawai?.id
    }])
    if (error) {
      toast.error('Gagal menyimpan jurnal!')
    } else {
      toast.success('Jurnal berhasil disimpan! 📓')
      setShowModal(false)
      setForm(INIT)
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus jurnal ini?')) return
    const { error } = await supabase.from('jurnal_mengajar').delete().eq('id', id)
    if (!error) {
      toast.success('Jurnal dihapus!')
      fetchData()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Jurnal Mengajar</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
          + Tambah
        </button>
      </div>

      <div className="p-4">
        {loading ? <LoadingSpinner /> : jurnal.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">📓</div>
            <p className="text-gray-400 font-medium">Belum ada jurnal mengajar</p>
            <button onClick={() => setShowModal(true)} className="mt-4 bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold">
              Buat Jurnal Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {jurnal.map(j => (
              <div key={j.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-indigo-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-indigo-700">{j.mata_pelajaran}</span>
                    <span className="text-xs text-indigo-400 ml-2">• {j.kelas?.nama_kelas}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(j.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="font-semibold text-gray-800 text-sm mb-1">📌 {j.materi}</p>
                  {j.kegiatan_pembelajaran && (
                    <p className="text-xs text-gray-500 line-clamp-2">Kegiatan: {j.kegiatan_pembelajaran}</p>
                  )}
                  {j.metode && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs font-medium">
                      {j.metode}
                    </span>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 flex justify-end gap-2">
                  <button onClick={() => setDetail(j)} className="text-xs text-blue-500 font-medium px-3 py-1 bg-blue-50 rounded-lg">Detail</button>
                  <button onClick={() => handleDelete(j.id)} className="text-xs text-red-500 font-medium px-3 py-1 bg-red-50 rounded-lg">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="📓 Tambah Jurnal" size="full">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal *</label>
              <input type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Jam Ke</label>
              <input type="text" placeholder="1-2" value={form.jam_ke} onChange={e => setForm({...form, jam_ke: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Kelas *</label>
            <select value={form.kelas_id} onChange={e => setForm({...form, kelas_id: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none">
              <option value="">Pilih Kelas</option>
              {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Mata Pelajaran *</label>
            <select value={form.mata_pelajaran} onChange={e => setForm({...form, mata_pelajaran: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none">
              <option value="">Pilih Mata Pelajaran</option>
              {mataPelajaran.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Materi *</label>
            <textarea value={form.materi} onChange={e => setForm({...form, materi: e.target.value})}
              placeholder="Topik/materi yang diajarkan..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Kegiatan Pembelajaran</label>
            <textarea value={form.kegiatan_pembelajaran} onChange={e => setForm({...form, kegiatan_pembelajaran: e.target.value})}
              placeholder="Deskripsi kegiatan pembelajaran..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Media Pembelajaran</label>
              <input type="text" placeholder="PPT, Video, dll" value={form.media_pembelajaran}
                onChange={e => setForm({...form, media_pembelajaran: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Metode</label>
              <select value={form.metode} onChange={e => setForm({...form, metode: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none">
                <option value="">Pilih</option>
                {metodeList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Catatan</label>
            <textarea value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})}
              placeholder="Catatan tambahan..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Menyimpan...</> : '💾 Simpan Jurnal'}
          </button>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Detail Jurnal">
        {detail && (
          <div className="space-y-3 text-sm">
            {[
              { label: '📅 Tanggal', val: new Date(detail.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
              { label: '🏫 Kelas', val: detail.kelas?.nama_kelas },
              { label: '📚 Mata Pelajaran', val: detail.mata_pelajaran },
              { label: '⏰ Jam Ke', val: detail.jam_ke || '-' },
              { label: '📌 Materi', val: detail.materi },
              { label: '🎯 Kegiatan', val: detail.kegiatan_pembelajaran || '-' },
              { label: '🖥️ Media', val: detail.media_pembelajaran || '-' },
              { label: '🔧 Metode', val: detail.metode || '-' },
              { label: '📝 Catatan', val: detail.catatan || '-' },
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
