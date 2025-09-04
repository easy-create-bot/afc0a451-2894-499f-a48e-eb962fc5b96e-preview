import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or anonymous key is missing from environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {auth: {persistSession: true, autoRefreshToken: true}}) 

export const supabaseAs = (token: string) => {
  return createClient(
    supabaseUrl!,
    supabaseAnonKey!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}