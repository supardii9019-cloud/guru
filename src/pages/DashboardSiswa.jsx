import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, signOut } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function DashboardSiswa() {
  const navigate = useNavigate()
  const { siswaProfile } = useAuth()
  const [ujianAktif, setUjianAktif] = useState([])
  const [nilaiList, setNilaiList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (siswaProfile) fetchData()
  }, [siswaProfile])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: ujian }, { data: nilai }] = await Promise.all([
      supabase.from('ujian').select('*, kelas(nama_kelas), pegawai(nama)')
        .eq('status', 'aktif').order('created_at', { ascending: false }),
      supabase.from('hasil_ujian').select('*, ujian(judul, mata_pelajaran)')
        .eq('siswa_id', siswaProfile?.id).order('created_at', { ascending: false }).limit(10)
    ])
    setUjianAktif(ujian || [])
    setNilaiList(nilai || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    if (confirm('Yakin ingin keluar?')) {
      await signOut()
      toast.success('Berhasil keluar!')
      navigate('/login')
    }
  }

  const getNilaiColor = (n) => {
    if (n >= 85) return 'text-green-600 bg-green-50'
    if (n >= 70) return 'text-blue-600 bg-blue-50'
    if (n >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm">Selamat datang 👋</p>
            <h1 className="text-xl font-black">{siswaProfile?.nama || 'Siswa'}</h1>
            <p className="text-blue-200 text-xs mt-0.5">
              {siswaProfile?.kelas?.nama_kelas || 'Belum ada kelas'} • NIS: {siswaProfile?.nis}
            </p>
          </div>
          <button onClick={handleLogout}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
            🚪
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        {/* Ujian Aktif */}
        <div>
          <h2 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
            📝 Ujian Tersedia
            {ujianAktif.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {ujianAktif.length}
              </span>
            )}
          </h2>
          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : ujianAktif.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="text-4xl mb-2">😴</div>
              <p className="text-gray-400 text-sm">Tidak ada ujian aktif saat ini</p>
            </div>
          ) : ujianAktif.map(u => (
            <div key={u.id} className="bg-white rounded-2xl shadow-sm p-4 mb-3 border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{u.judul}</h3>
                  <p className="text-xs text-gray-500 mt-1">{u.mata_pelajaran} • {u.kelas?.nama_kelas}</p>
                  <p className="text-xs text-gray-400">Guru: {u.pegawai?.nama}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span>⏱️ {u.durasi} menit</span>
                    <span>❓ {u.total_soal} soal</span>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold ml-2">
                  🟢 Aktif
                </span>
              </div>
              <button onClick={() => navigate('/kerjakan-ujian')}
                className="w-full mt-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-2xl text-sm shadow-md shadow-blue-200">
                🚀 Mulai Kerjakan
              </button>
            </div>
          ))}
        </div>

        {/* Riwayat Nilai */}
        <div>
          <h2 className="text-sm font-black text-gray-700 mb-3">📊 Riwayat Nilai</h2>
          {nilaiList.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-400 text-sm">Belum ada riwayat ujian</p>
            </div>
          ) : (
            <div className="space-y-2">
              {nilaiList.map(n => (
                <div key={n.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${getNilaiColor(n.nilai)}`}>
                    {n.nilai}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{n.ujian?.judul}</p>
                    <p className="text-xs text-gray-500">{n.ujian?.mata_pelajaran}</p>
                    <p className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{n.benar}/{n.total_soal} benar</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
