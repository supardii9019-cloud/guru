import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [pegawai, setPegawai] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPegawai(session.user.email)
      else setLoading(false)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchPegawai(session.user.email)
        } else {
          setPegawai(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchPegawai = async (email) => {
    try {
      const { data } = await supabase
        .from('pegawai')
        .select('*')
        .eq('email', email)
        .single()
      setPegawai(data)
    } catch (e) {
      console.log('Pegawai not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, pegawai, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
