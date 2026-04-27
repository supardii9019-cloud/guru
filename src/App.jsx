import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoadingSpinner from './components/LoadingSpinner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AbsensiKelas from './pages/AbsensiKelas'
import Jurnal from './pages/Jurnal'
import Penilaian from './pages/Penilaian'
import Siswa from './pages/Siswa'
import Kelas from './pages/Kelas'
import Materi from './pages/Materi'
import Raport from './pages/Raport'
import PelanggaranSiswa from './pages/PelanggaranSiswa'
import AbsensiPegawai from './pages/AbsensiPegawai'
import JurnalWali from './pages/JurnalWali'
import ModulPembelajaran from './pages/ModulPembelajaran'
import StrukturKelas from './pages/StrukturKelas'
import JadwalPiket from './pages/JadwalPiket'
import UjianOnline from './pages/UjianOnline'
import IzinPegawai from './pages/IzinPegawai'
import Profil from './pages/Profil'
import Jurnal7KAIH from './pages/Jurnal7KAIH'
import KerjakanUjian from './pages/KerjakanUjian'
import EnglishTranslator from './pages/EnglishTranslator'
import AbsenBarcode from './pages/AbsenBarcode'
import DashboardSiswa from './pages/DashboardSiswa'
import AkunSiswa from './pages/AkunSiswa'
import AbsensiMandiri from './pages/AbsensiMandiri'
import PengaturanAbsensi from './pages/PengaturanAbsensi'

const ProtectedRoute = ({ children, allowRoles }) => {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  if (allowRoles && !allowRoles.includes(role)) return <Navigate to="/" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return children
  return <Navigate to={role === 'siswa' ? '/siswa-dashboard' : '/'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Siswa */}
      <Route path="/siswa-dashboard" element={<ProtectedRoute allowRoles={['siswa']}><DashboardSiswa /></ProtectedRoute>} />
      <Route path="/kerjakan-ujian" element={<ProtectedRoute allowRoles={['siswa','guru','admin']}><KerjakanUjian /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/akun-siswa" element={<ProtectedRoute allowRoles={['admin']}><AkunSiswa /></ProtectedRoute>} />

      {/* Guru & Admin */}
      <Route path="/" element={<ProtectedRoute allowRoles={['guru','admin']}><Dashboard /></ProtectedRoute>} />
      <Route path="/absensi" element={<ProtectedRoute allowRoles={['guru','admin']}><AbsensiKelas /></ProtectedRoute>} />
      <Route path="/jurnal" element={<ProtectedRoute allowRoles={['guru','admin']}><Jurnal /></ProtectedRoute>} />
      <Route path="/penilaian" element={<ProtectedRoute allowRoles={['guru','admin']}><Penilaian /></ProtectedRoute>} />
      <Route path="/siswa" element={<ProtectedRoute allowRoles={['guru','admin']}><Siswa /></ProtectedRoute>} />
      <Route path="/kelas" element={<ProtectedRoute allowRoles={['guru','admin']}><Kelas /></ProtectedRoute>} />
      <Route path="/materi" element={<ProtectedRoute allowRoles={['guru','admin']}><Materi /></ProtectedRoute>} />
      <Route path="/raport" element={<ProtectedRoute allowRoles={['guru','admin']}><Raport /></ProtectedRoute>} />
      <Route path="/pelanggaran" element={<ProtectedRoute allowRoles={['guru','admin']}><PelanggaranSiswa /></ProtectedRoute>} />
      <Route path="/absensi-pegawai" element={<ProtectedRoute allowRoles={['guru','admin']}><AbsensiPegawai /></ProtectedRoute>} />
      <Route path="/jurnal-wali" element={<ProtectedRoute allowRoles={['guru','admin']}><JurnalWali /></ProtectedRoute>} />
      <Route path="/modul" element={<ProtectedRoute allowRoles={['guru','admin']}><ModulPembelajaran /></ProtectedRoute>} />
      <Route path="/struktur-kelas" element={<ProtectedRoute allowRoles={['guru','admin']}><StrukturKelas /></ProtectedRoute>} />
      <Route path="/jadwal-piket" element={<ProtectedRoute allowRoles={['guru','admin']}><JadwalPiket /></ProtectedRoute>} />
      <Route path="/ujian" element={<ProtectedRoute allowRoles={['guru','admin']}><UjianOnline /></ProtectedRoute>} />
      <Route path="/izin-pegawai" element={<ProtectedRoute allowRoles={['guru','admin']}><IzinPegawai /></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute allowRoles={['guru','admin']}><Profil /></ProtectedRoute>} />
      <Route path="/jurnal-kaih" element={<ProtectedRoute allowRoles={['guru','admin']}><Jurnal7KAIH /></ProtectedRoute>} />
      <Route path="/translator" element={<ProtectedRoute allowRoles={['guru','admin']}><EnglishTranslator /></ProtectedRoute>} />
      <Route path="/pengaturan-absensi" element={<ProtectedRoute allowRoles={['admin']}><PengaturanAbsensi /></ProtectedRoute>} />
      <Route path="/absensi-mandiri" element={<ProtectedRoute allowRoles={['guru','admin']}><AbsensiMandiri /></ProtectedRoute>} />
      <Route path="/absen-barcode" element={<ProtectedRoute allowRoles={['guru','admin']}><AbsenBarcode /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router basename="/guru">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { background: '#1f2937', color: '#fff', borderRadius: '16px', fontSize: '14px' },
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}
