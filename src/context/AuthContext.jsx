import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [pegawai, setPegawai] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPegawai = async (email) => {
    try {
      const { data } = await supabase
        .from('pegawai')
        .select('*')
        .eq('email', email)
        .single()
      setPegawai(data || null)
    } catch (e) {
      setPegawai(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Paksa loading selesai maksimal 5 detik
    const timeout = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchPegawai(session.user.email)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (_event === 'SIGNED_OUT') {
          setPegawai(null)
          setLoading(false)
        } else if (_event === 'SIGNED_IN' && session?.user) {
          fetchPegawai(session.user.email)
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, pegawai, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
