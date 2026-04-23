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

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  return user ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  return !user ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/absensi" element={<ProtectedRoute><AbsensiKelas /></ProtectedRoute>} />
      <Route path="/jurnal" element={<ProtectedRoute><Jurnal /></ProtectedRoute>} />
      <Route path="/penilaian" element={<ProtectedRoute><Penilaian /></ProtectedRoute>} />
      <Route path="/siswa" element={<ProtectedRoute><Siswa /></ProtectedRoute>} />
      <Route path="/kelas" element={<ProtectedRoute><Kelas /></ProtectedRoute>} />
      <Route path="/materi" element={<ProtectedRoute><Materi /></ProtectedRoute>} />
      <Route path="/raport" element={<ProtectedRoute><Raport /></ProtectedRoute>} />
      <Route path="/pelanggaran" element={<ProtectedRoute><PelanggaranSiswa /></ProtectedRoute>} />
      <Route path="/absensi-pegawai" element={<ProtectedRoute><AbsensiPegawai /></ProtectedRoute>} />
      <Route path="/jurnal-wali" element={<ProtectedRoute><JurnalWali /></ProtectedRoute>} />
      <Route path="/modul" element={<ProtectedRoute><ModulPembelajaran /></ProtectedRoute>} />
      <Route path="/struktur-kelas" element={<ProtectedRoute><StrukturKelas /></ProtectedRoute>} />
      <Route path="/jadwal-piket" element={<ProtectedRoute><JadwalPiket /></ProtectedRoute>} />
      <Route path="/ujian" element={<ProtectedRoute><UjianOnline /></ProtectedRoute>} />
      <Route path="/izin-pegawai" element={<ProtectedRoute><IzinPegawai /></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
      <Route path="/jurnal-kaih" element={<ProtectedRoute><Jurnal7KAIH /></ProtectedRoute>} />
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
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '16px',
              fontSize: '14px',
            },
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}
