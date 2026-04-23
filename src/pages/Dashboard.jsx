import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

const menuUtama = [
  { emoji: '📋', label: 'Absensi\nKelas', path: '/absensi', bg: 'bg-blue-50', border: 'border-blue-200' },
  { emoji: '📓', label: 'Jurnal', path: '/jurnal', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { emoji: '📊', label: 'Penilaian', path: '/penilaian', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { emoji: '👨‍🎓', label: 'Siswa', path: '/siswa', bg: 'bg-teal-50', border: 'border-teal-200' },
  { emoji: '🏫', label: 'Kelas', path: '/kelas', bg: 'bg-orange-50', border: 'border-orange-200' },
  { emoji: '☁️', label: 'Materi', path: '/materi', bg: 'bg-purple-50', border: 'border-purple-200' },
  { emoji: '📄', label: 'Raport', path: '/raport', bg: 'bg-green-50', border: 'border-green-200' },
]

const fiturLainnya = [
  { emoji: '👨‍👩‍👧', label: 'Jurnal Guru\nWali', path: '/jurnal-wali', bg: 'bg-pink-50', border: 'border-pink-200' },
  { emoji: '📚', label: 'Modul\nPembelajaran', path: '/modul', bg: 'bg-red-50', border: 'border-red-200' },
  { emoji: '📖', label: 'Jurnal\n7 KAIH', path: '/jurnal-kaih', bg: 'bg-blue-50', border: 'border-blue-200' },
  { emoji: '⚠️', label: 'Pelanggaran\nSiswa', path: '/pelanggaran', bg: 'bg-rose-50', border: 'border-rose-200' },
  { emoji: '🏗️', label: 'Struktur\nKelas', path: '/struktur-kelas', bg: 'bg-amber-50', border: 'border-amber-200' },
  { emoji: '🗓️', label: 'Jadwal\nPiket', path: '/jadwal-piket', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { emoji: '🔤', label: 'English\nTranslator', path: '/translator', bg: 'bg-green-50', border: 'border-green-200' },
  { emoji: '📝', label: 'Buat\nUjian', path: '/ujian', bg: 'bg-orange-50', border: 'border-orange-200' },
  { emoji: '✍️', label: 'Kerjakan\nUjian', path: '/kerjakan-ujian', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { emoji: '✅', label: 'Izin\nPegawai', path: '/izin-pegawai', bg: 'bg-teal-50', border: 'border-teal-200' },
  { emoji: '💬', label: 'Absensi\nWA', path: '#', bg: 'bg-green-50', border: 'border-green-200' },
  { emoji: '📱', label: 'Absen\nBarcode', path: '/absen-barcode', bg: 'bg-purple-50', border: 'border-purple-200' },
  { emoji: '🗂️', label: 'Absensi\nPegawai', path: '/absensi-pegawai', bg: 'bg-blue-50', border: 'border-blue-200' },
]

const MenuItem = ({ item, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center p-2.5 rounded-2xl ${item.bg} border ${item.border} hover:shadow-md transition-all active:scale-95 hover:scale-105`}
  >
    <div className="w-13 h-13 flex items-center justify-center text-3xl mb-1.5 drop-shadow-sm">
      {item.emoji}
    </div>
    <span className="text-[10px] text-gray-700 text-center font-semibold leading-tight whitespace-pre-line">
      {item.label}
    </span>
  </button>
)

export default function Dashboard() {
  const navigate = useNavigate()
  const { pegawai, user } = useAuth()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Selamat Pagi'
    if (h < 15) return 'Selamat Siang'
    if (h < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  return (
    <Layout title="MENU UTAMA">
      {/* Greeting Card */}
      <div className="mx-4 mt-4 mb-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg">
        <p className="text-green-100 text-sm">{greeting()}, 👋</p>
        <h2 className="text-xl font-bold mt-0.5">{pegawai?.nama || user?.email?.split('@')[0] || 'Pengguna'}</h2>
        <p className="text-green-100 text-xs mt-1 capitalize">
          {pegawai?.role || 'Guru'} {pegawai?.jabatan ? `• ${pegawai.jabatan}` : ''}
        </p>
        <div className="mt-3 bg-white/20 rounded-xl px-3 py-2 text-xs">
          📅 {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Menu Utama */}
      <div className="px-4">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Menu Utama</h2>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {menuUtama.map((item, i) => (
            <MenuItem key={i} item={item} onClick={() => navigate(item.path)} />
          ))}
        </div>

        {/* Fitur Lainnya */}
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Fitur Lainnya</h2>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {fiturLainnya.map((item, i) => (
            <MenuItem key={i} item={item} onClick={() => item.path !== '#' ? navigate(item.path) : null} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
