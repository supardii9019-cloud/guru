import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const signIn = async (email, password) => {
  if (!supabase) return { error: { message: 'Supabase belum dikonfigurasi!' } }
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  if (!supabase) return
  return await supabase.auth.signOut()
}

export const getCurrentUser = async () => {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const fetchData = async (table, query = {}) => {
  if (!supabase) return []
  let req = supabase.from(table).select(query.select || '*')
  if (query.eq) Object.entries(query.eq).forEach(([k, v]) => req = req.eq(k, v))
  if (query.order) req = req.order(query.order, { ascending: query.ascending ?? true })
  if (query.limit) req = req.limit(query.limit)
  const { data, error } = await req
  if (error) throw error
  return data
}
