import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [pegawai, setPegawai] = useState(null)
  const [siswaProfile, setSiswaProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (email) => {
    try {
      const { data: pegawaiData, error: e1 } = await supabase
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

      const { data: siswaAuth, error: e2 } = await supabase
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

      // siswa_auth ada tapi siswa join null — coba fetch siswa langsung
      if (siswaAuth?.siswa_id) {
        const { data: siswaData } = await supabase
          .from('siswa')
          .select('*')
          .eq('id', siswaAuth.siswa_id)
          .maybeSingle()
        if (siswaData) {
          setSiswaProfile(siswaData)
          setPegawai(null)
          setRole('siswa')
          setLoading(false)
          return
        }
      }

      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000)

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
