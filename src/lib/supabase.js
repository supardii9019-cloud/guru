import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper fetch dengan error handling
export const fetchData = async (table, query = {}) => {
  let req = supabase.from(table).select(query.select || '*')
  if (query.eq) Object.entries(query.eq).forEach(([k, v]) => req = req.eq(k, v))
  if (query.order) req = req.order(query.order, { ascending: query.ascending ?? true })
  if (query.limit) req = req.limit(query.limit)
  const { data, error } = await req
  if (error) throw error
  return data
}
