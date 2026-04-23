import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [pegawai, setPegawai] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  const fetchPegawai = async (email) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      // Coba ambil dari cache localStorage dulu supaya cepat
      const cached = localStorage.getItem(`pegawai_${email}`)
      if (cached) {
        setPegawai(JSON.parse(cached))
        setLoading(false)
      }

      // Tetap fetch dari Supabase untuk data terbaru
      const { data } = await supabase
        .from('pegawai')
        .select('*')
        .eq('email', email)
        .single()

      if (data) {
        setPegawai(data)
        localStorage.setItem(`pegawai_${email}`, JSON.stringify(data))
      }
    } catch (e) {
      console.log('Pegawai not found')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    // Ambil session sekali saja
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchPegawai(session.user.email)
      } else {
        setLoading(false)
      }
    })

    // Listener hanya untuk perubahan state (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const newUser = session?.user ?? null
        setUser(newUser)

        if (_event === 'SIGNED_OUT') {
          setPegawai(null)
          // Hapus cache saat logout
          Object.keys(localStorage)
            .filter(k => k.startsWith('pegawai_'))
            .forEach(k => localStorage.removeItem(k))
          setLoading(false)
        } else if (_event === 'SIGNED_IN' && newUser) {
          fetchingRef.current = false
          fetchPegawai(newUser.email)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, pegawai, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
