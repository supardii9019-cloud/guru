import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [pegawai, setPegawai] = useState(null)
  const [siswaProfile, setSiswaProfile] = useState(null)
  const [role, setRole] = useState(null) // 'guru' | 'admin' | 'siswa'
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (email) => {
    try {
      // Cek dulu di pegawai (guru/admin)
      // maybeSingle() returns null (not 406) when no row found
      const { data: pegawaiData } = await supabase
        .from('pegawai')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (pegawaiData) {
        setPegawai(pegawaiData)
        setSiswaProfile(null)
        setRole(pegawaiData.role || 'guru')
        setLoading(false)
        return
      }

      // Cek di siswa_auth (akun siswa)
      const { data: siswaAuth } = await supabase
        .from('siswa_auth')
        .select('*, siswa(*)')
        .eq('email', email)
        .maybeSingle()

      if (siswaAuth?.siswa) {
        setSiswaProfile(siswaAuth.siswa)
        setPegawai(null)
        setRole('siswa')
        setLoading(false)
        return
      }

      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fallback: force loading=false after 5s to prevent infinite white screen
    const timeout = setTimeout(() => setLoading(false), 5000)

    // onAuthStateChange fires INITIAL_SESSION on page load (before getSession resolves).
    // Handle it here so the session is always picked up, even on refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        clearTimeout(timeout)
        setUser(session?.user ?? null)

        if (_event === 'SIGNED_OUT') {
          setPegawai(null)
          setSiswaProfile(null)
          setRole(null)
          setLoading(false)
        } else if (session?.user) {
          // Covers INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED
          fetchProfile(session.user.email)
        } else {
          setLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, pegawai, siswaProfile, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
