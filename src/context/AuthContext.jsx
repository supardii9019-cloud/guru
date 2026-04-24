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
      const { data: pegawaiData } = await supabase
        .from('pegawai')
        .select('*')
        .eq('email', email)
        .single()

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
        .single()

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
    const timeout = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.email)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (_event === 'SIGNED_OUT') {
          setPegawai(null)
          setSiswaProfile(null)
          setRole(null)
          setLoading(false)
        } else if (_event === 'SIGNED_IN' && session?.user) {
          fetchProfile(session.user.email)
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
