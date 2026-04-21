import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, signOut } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Profil() {
  const navigate = useNavigate()
  const { user, pegawai } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nama: '', jabatan: '', mata_pelajaran: '', no_hp: '', alamat: ''
  })
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ jurnal: 0, absensi: 0, penilaian: 0 })

  useEffect(() => {
    if (pegawai) {
      setForm({
        nama: pegawai.nama || '',
        jabatan: pegawai.jabatan || '',
        mata_pelajaran: pegawai.mata_pelajaran || '',
        no_hp: pegawai.no_hp || '',
        alamat: pegawai.alamat || '',
      })
    }
    fetchStats()
  }, [pegawai])

  const fetchStats = async () => {
    if (!pegawai?.id) return
    const [j, a, p] = await Promise.all([
      supabase.from('jurnal_mengajar').select('id', { count: 'exact' }).eq('guru_id', pegawai.id),
      supabase.from('absensi_siswa').select('id', { count: 'exact' }).eq('guru_id', pegawai.id),
      supabase.from('penilaian').select('id', { count: 'exact' }).eq('guru_id', pegawai.id),
    ])
    setStats({ jurnal: j.count || 0, absensi: a.count || 0, penilaian: p.count || 0 })
  }

  const handleSave = async () => {
    if (!pegawai?.id) return
    setSaving(true)
    const { error } = await supabase.from('pegawai').update(form).eq('id', pegawai.id)
    if (error) {
      toast.error('Gagal menyimpan profil!')
    } else {
      toast.success('Profil berhasil diupdate! 🎉')
      setEditing(false)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    if (confirm('Yakin ingin keluar dari aplikasi?')) {
      await signOut()
      toast.success('Sampai jumpa! 👋')
    }
  }

  const roleLabel = { admin: '👑 Admin', guru: '👨‍🏫 Guru', wali_kelas: '🏠 Wali Kelas' }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-4 pt-4 pb-20 relative">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white">←</button>
          <h1 className="text-lg font-bold text-white flex-1">Profil Saya</h1>
          <button onClick={() => setEditing(!editing)} className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold">
            {editing ? 'Batal' : '✏️ Edit'}
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
          {/* Avatar */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-3 shadow-lg">
            {pegawai?.jenis_kelamin === 'P' ? '👩‍🏫' : '👨‍🏫'}
          </div>

          {editing ? (
            <input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})}
              className="text-xl font-bold text-gray-800 text-center w-full border-b-2 border-blue-300 pb-1 focus:outline-none" />
          ) : (
            <h2 className="text-xl font-bold text-gray-800">{pegawai?.nama || user?.email?.split('@')[0]}</h2>
          )}

          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
          <span className="inline-block mt-2 px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
            {roleLabel[pegawai?.role] || '👨‍🏫 Guru'}
          </span>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-3">📊 Statistik Aktivitas</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Jurnal', val: stats.jurnal, emoji: '📓', color: 'text-indigo-600' },
              { label: 'Absensi', val: stats.absensi, emoji: '📋', color: 'text-blue-600' },
              { label: 'Penilaian', val: stats.penilaian, emoji: '📊', color: 'text-cyan-600' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-2xl p-3">
                <div className="text-2xl">{s.emoji}</div>
                <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Info & Edit */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-3">📋 Informasi Profil</h3>
          <div className="space-y-3">
            {[
              { label: 'NIP', val: pegawai?.nip, field: null },
              { label: 'Jabatan', val: form.jabatan, field: 'jabatan', placeholder: 'Jabatan Anda' },
              { label: 'Mata Pelajaran', val: form.mata_pelajaran, field: 'mata_pelajaran', placeholder: 'Mata pelajaran yang diajarkan' },
              { label: 'No. HP', val: form.no_hp, field: 'no_hp', placeholder: '08xxxxxxxxxx' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500 w-28 shrink-0">{item.label}</span>
                {editing && item.field ? (
                  <input value={form[item.field]} onChange={e => setForm({...form, [item.field]: e.target.value})}
                    placeholder={item.placeholder}
                    className="flex-1 text-sm font-medium border-b border-gray-300 pb-0.5 focus:outline-none focus:border-blue-400" />
                ) : (
                  <span className="text-sm font-medium text-gray-800 flex-1">{item.val || '-'}</span>
                )}
              </div>
            ))}

            {editing && (
              <div className="pt-2">
                <label className="text-sm text-gray-500 block mb-1">Alamat</label>
                <textarea value={form.alamat} onChange={e => setForm({...form, alamat: e.target.value})}
                  placeholder="Alamat lengkap" rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        {editing && (
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 shadow-lg">
            {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
          </button>
        )}

        {/* Menu Actions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[
            { label: '🔒 Ubah Password', action: () => toast('Fitur segera hadir!'), color: 'text-gray-700' },
            { label: '📱 Tentang Aplikasi', action: () => toast('Sekolah Digital v1.0.0'), color: 'text-gray-700' },
            { label: '🚪 Keluar dari Akun', action: handleLogout, color: 'text-red-600' },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className={`w-full flex items-center justify-between px-5 py-4 ${i < 2 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-colors`}>
              <span className={`font-semibold ${item.color}`}>{item.label}</span>
              <span className="text-gray-400">›</span>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-300 pb-4">
          Sekolah Digital v1.0.0 • © 2024
        </p>
      </div>
    </div>
  )
}
