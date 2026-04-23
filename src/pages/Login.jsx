import { useState } from 'react'
import { signIn, supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const JABATAN_LIST = [
  'Guru Matematika', 'Guru Bahasa Indonesia', 'Guru IPA', 'Guru IPS',
  'Guru PKn', 'Guru Bahasa Inggris', 'Guru PAI', 'Guru PJOK', 'Guru SBdP',
  'Guru Prakarya', 'Wali Kelas', 'Kepala Sekolah', 'Wakil Kepala Sekolah',
  'Staf Tata Usaha', 'Guru BK'
]

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  // Login form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register form
  const [reg, setReg] = useState({
    nama: '', email: '', password: '', konfirmasi: '', jabatan: '', no_hp: ''
  })

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Email dan password wajib diisi!')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Email atau password salah!'
        : error.message
      )
    } else {
      toast.success('Selamat datang! 👋')
    }
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!reg.nama || !reg.email || !reg.password || !reg.jabatan) {
      return toast.error('Nama, email, password, dan jabatan wajib diisi!')
    }
    if (reg.password.length < 6) {
      return toast.error('Password minimal 6 karakter!')
    }
    if (reg.password !== reg.konfirmasi) {
      return toast.error('Konfirmasi password tidak cocok!')
    }

    setLoading(true)
    try {
      // 1. Buat akun di Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: reg.email,
        password: reg.password,
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Email sudah terdaftar!')
        } else {
          toast.error(authError.message)
        }
        setLoading(false)
        return
      }

      // 2. Simpan data pegawai ke tabel pegawai
      const { error: pegawaiError } = await supabase.from('pegawai').insert([{
        email: reg.email,
        nama: reg.nama,
        jabatan: reg.jabatan,
        no_hp: reg.no_hp || null,
        role: 'guru',
      }])

      if (pegawaiError) {
        toast.error('Gagal menyimpan data pegawai: ' + pegawaiError.message)
        setLoading(false)
        return
      }

      toast.success('Akun berhasil dibuat! Silakan login. 🎉')
      setMode('login')
      setEmail(reg.email)
      setReg({ nama: '', email: '', password: '', konfirmasi: '', jabatan: '', no_hp: '' })
    } catch (err) {
      toast.error('Terjadi kesalahan, coba lagi.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 via-green-600 to-green-800 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">

        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <span className="text-5xl">🏫</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">SEKOLAH DIGITAL</h1>
          <p className="text-green-200 mt-1 text-sm">Sistem Informasi Manajemen Sekolah</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7">

          {/* Tab Login / Daftar */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-green-600 shadow' : 'text-gray-400'}`}
            >
              Masuk
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'register' ? 'bg-white text-green-600 shadow' : 'text-gray-400'}`}
            >
              Daftar
            </button>
          </div>

          {/* FORM LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@sekolah.com"
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-300 disabled:opacity-60 mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Memproses...
                  </span>
                ) : 'MASUK →'}
              </button>
            </form>
          )}

          {/* FORM REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              {/* Nama */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Lengkap *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                  <input type="text" value={reg.nama}
                    onChange={e => setReg({ ...reg, nama: e.target.value })}
                    placeholder="Nama lengkap"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm"
                    required />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                  <input type="email" value={reg.email}
                    onChange={e => setReg({ ...reg, email: e.target.value })}
                    placeholder="email@sekolah.com"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm"
                    required />
                </div>
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Jabatan *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">💼</span>
                  <select value={reg.jabatan}
                    onChange={e => setReg({ ...reg, jabatan: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm appearance-none"
                    required>
                    <option value="">Pilih Jabatan</option>
                    {JABATAN_LIST.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>

              {/* No HP */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">No. HP</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📱</span>
                  <input type="tel" value={reg.no_hp}
                    onChange={e => setReg({ ...reg, no_hp: e.target.value })}
                    placeholder="08xxxxxxxxxx (opsional)"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input type={showPass ? 'text' : 'password'} value={reg.password}
                    onChange={e => setReg({ ...reg, password: e.target.value })}
                    placeholder="Min. 6 karakter"
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm"
                    required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Konfirmasi Password *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔑</span>
                  <input type={showPass2 ? 'text' : 'password'} value={reg.konfirmasi}
                    onChange={e => setReg({ ...reg, konfirmasi: e.target.value })}
                    placeholder="Ulangi password"
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm"
                    required />
                  <button type="button" onClick={() => setShowPass2(!showPass2)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {showPass2 ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-300 disabled:opacity-60 mt-1">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Mendaftar...
                  </span>
                ) : 'DAFTAR SEKARANG 🎉'}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="text-center text-green-300 text-xs pb-6">
        © 2024 Sekolah Digital. All rights reserved.
      </p>
    </div>
  )
}
