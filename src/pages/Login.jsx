import { useState } from 'react'
import { signIn } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email dan password wajib diisi!')
      return
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 via-green-600 to-green-800 flex flex-col">
      {/* Top decoration */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <div className="w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-5 rotate-3">
            <span className="text-6xl">🏫</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">SEKOLAH DIGITAL</h1>
          <p className="text-green-200 mt-1 text-sm">Sistem Informasi Manajemen Sekolah</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Masuk ke Akun</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@sekolah.com"
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-50 text-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-50 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-300 disabled:opacity-60 disabled:cursor-not-allowed text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Memproses...
                </span>
              ) : 'MASUK →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Hubungi admin sekolah untuk mendapatkan akun
          </p>
        </div>
      </div>

      <p className="text-center text-green-300 text-xs pb-6">
        © 2024 Sekolah Digital. All rights reserved.
      </p>
    </div>
  )
}
