import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function UjianOnline() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [ujian, setUjian] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedUjian, setSelectedUjian] = useState(null)
  const [soal, setSoal] = useState([])
  const [showSoalModal, setShowSoalModal] = useState(false)
  const [form, setForm] = useState({
    judul: '', mata_pelajaran: '', kelas_id: '', tanggal: '', durasi: 90, status: 'draft'
  })
  const [soalForm, setSoalForm] = useState({
    pertanyaan: '', pilihan_a: '', pilihan_b: '', pilihan_c: '', pilihan_d: '', jawaban_benar: 'a', poin: 1
  })
  const [saving, setSaving] = useState(false)

  const mataPelajaran = ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PKn', 'Bahasa Inggris', 'PAI', 'PJOK']

  useEffect(() => {
    fetchUjian()
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
  }, [])

  const fetchUjian = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ujian')
      .select('*, kelas(nama_kelas)')
      .order('created_at', { ascending: false })
    setUjian(data || [])
    setLoading(false)
  }

  const fetchSoal = async (ujianId) => {
    const { data } = await supabase.from('soal_ujian').select('*').eq('ujian_id', ujianId).order('created_at')
    setSoal(data || [])
  }

  const handleSaveUjian = async () => {
    if (!form.judul || !form.mata_pelajaran) return toast.error('Judul dan mata pelajaran wajib!')
    setSaving(true)
    const { data, error } = await supabase.from('ujian').insert([{ ...form, guru_id: pegawai?.id }]).select().single()
    if (error) {
      toast.error('Gagal menyimpan ujian!')
    } else {
      toast.success('Ujian berhasil dibuat!')
      setShowModal(false)
      setSelectedUjian(data)
      fetchUjian()
      fetchSoal(data.id)
      setShowSoalModal(true)
    }
    setSaving(false)
  }

  const handleSaveSoal = async () => {
    if (!soalForm.pertanyaan || !soalForm.pilihan_a) return toast.error('Pertanyaan dan pilihan wajib diisi!')
    setSaving(true)
    const { error } = await supabase.from('soal_ujian').insert([{ ...soalForm, ujian_id: selectedUjian.id }])
    if (error) {
      toast.error('Gagal menyimpan soal!')
    } else {
      toast.success('Soal ditambahkan!')
      setSoalForm({ pertanyaan: '', pilihan_a: '', pilihan_b: '', pilihan_c: '', pilihan_d: '', jawaban_benar: 'a', poin: 1 })
      await supabase.from('ujian').update({ total_soal: soal.length + 1 }).eq('id', selectedUjian.id)
      fetchSoal(selectedUjian.id)
      fetchUjian()
    }
    setSaving(false)
  }

  const publishUjian = async (id) => {
    await supabase.from('ujian').update({ status: 'aktif' }).eq('id', id)
    toast.success('Ujian dipublikasikan! 🚀')
    fetchUjian()
  }

  const statusColor = { draft: 'bg-gray-100 text-gray-600', aktif: 'bg-green-100 text-green-700', selesai: 'bg-blue-100 text-blue-700' }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-orange-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Ujian Online</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-orange-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Buat Ujian
        </button>
      </div>

      <div className="p-4 space-y-3">
        {loading ? <LoadingSpinner /> : ujian.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">📝</div>
            <p className="text-gray-400">Belum ada ujian online</p>
            <button onClick={() => setShowModal(true)} className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold">
              Buat Ujian Pertama
            </button>
          </div>
        ) : ujian.map(u => (
          <div key={u.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-l-4 border-l-orange-500">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{u.judul}</h3>
                  <p className="text-sm text-gray-500">{u.mata_pelajaran} • {u.kelas?.nama_kelas}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${statusColor[u.status]}`}>
                  {u.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>📅 {u.tanggal || 'Belum dijadwalkan'}</span>
                <span>⏱️ {u.durasi} menit</span>
                <span>❓ {u.total_soal} soal</span>
              </div>
            </div>
            <div className="px-4 py-2.5 bg-gray-50 flex gap-2">
              <button
                onClick={() => { setSelectedUjian(u); fetchSoal(u.id); setShowSoalModal(true) }}
                className="flex-1 bg-orange-100 text-orange-700 text-xs font-bold py-2 rounded-xl">
                ✏️ Edit Soal
              </button>
              {u.status === 'draft' && (
                <button onClick={() => publishUjian(u.id)}
                  className="flex-1 bg-green-100 text-green-700 text-xs font-bold py-2 rounded-xl">
                  🚀 Publikasikan
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Buat Ujian */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="📝 Buat Ujian Online">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Judul Ujian *</label>
            <input value={form.judul} onChange={e => setForm({...form, judul: e.target.value})}
              placeholder="Contoh: Ulangan Harian Bab 1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
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
              <option value="">Pilih Kelas</option>
              {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal</label>
              <input type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Durasi (menit)</label>
              <input type="number" value={form.durasi} onChange={e => setForm({...form, durasi: parseInt(e.target.value)})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>
          <button onClick={handleSaveUjian} disabled={saving}
            className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
            {saving ? 'Menyimpan...' : '➡️ Buat & Tambah Soal'}
          </button>
        </div>
      </Modal>

      {/* Modal Soal */}
      <Modal isOpen={showSoalModal} onClose={() => setShowSoalModal(false)} title={`📋 Soal: ${selectedUjian?.judul}`} size="full">
        <div className="space-y-4">
          {soal.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-gray-500">Soal yang sudah dibuat ({soal.length}):</p>
              {soal.map((s, i) => (
                <div key={s.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-gray-800">
                    {i + 1}. {s.pertanyaan.substring(0, 80)}{s.pertanyaan.length > 80 ? '...' : ''}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Jawaban: {s.jawaban_benar.toUpperCase()} • {s.poin} poin</p>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-bold text-gray-700 mb-3">+ Tambah Soal Baru</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Pertanyaan *</label>
                <textarea value={soalForm.pertanyaan} onChange={e => setSoalForm({...soalForm, pertanyaan: e.target.value})}
                  placeholder="Tulis pertanyaan di sini..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              {['a', 'b', 'c', 'd'].map(opt => (
                <div key={opt}>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Pilihan {opt.toUpperCase()} *</label>
                  <input value={soalForm[`pilihan_${opt}`]}
                    onChange={e => setSoalForm({...soalForm, [`pilihan_${opt}`]: e.target.value})}
                    placeholder={`Pilihan ${opt.toUpperCase()}`}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Jawaban Benar</label>
                  <select value={soalForm.jawaban_benar} onChange={e => setSoalForm({...soalForm, jawaban_benar: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                    {['a', 'b', 'c', 'd'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Poin</label>
                  <input type="number" min="1" value={soalForm.poin}
                    onChange={e => setSoalForm({...soalForm, poin: parseInt(e.target.value)})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>
              </div>
              <button onClick={handleSaveSoal} disabled={saving}
                className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-2xl disabled:opacity-50">
                {saving ? 'Menyimpan...' : '+ Tambah Soal'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
