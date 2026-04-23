import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Layout({ children, title, backPath, headerColor = 'bg-green-600', showBack = true }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  const handleLogout = async () => {
    if (confirm('Yakin ingin keluar?')) {
      await signOut()
      toast.success('Berhasil keluar!')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className={`${headerColor} text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md`}>
        {showBack && !isHome && (
          <button
            onClick={() => navigate(backPath || '/')}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            ←
          </button>
        )}
        <h1 className="text-lg font-bold flex-1">{title}</h1>
      </div>

      {/* Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Nav - only on home */}
      {isHome && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-gray-200 px-8 py-2 z-10">
          <div className="flex items-end justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex flex-col items-center text-green-600 py-1"
            >
              <span className="text-2xl">🏠</span>
              <span className="text-xs font-semibold">Home</span>
            </button>

            <button
              onClick={() => navigate('/profil')}
              className="flex flex-col items-center -mb-2"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                <span className="text-2xl">👤</span>
              </div>
              <span className="text-xs font-semibold text-gray-600 mt-1">Profil</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex flex-col items-center text-gray-500 hover:text-red-500 py-1 transition-colors"
            >
              <span className="text-2xl">🚪</span>
              <span className="text-xs font-semibold">Keluar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
