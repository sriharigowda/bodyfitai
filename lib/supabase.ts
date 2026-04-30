import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
let _admin:  SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _client = createClient(url, key, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: false,
        storageKey:         'bodyfitai-auth',
      }
    })
  }
  return _client
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key  = process.env.SUPABASE_SERVICE_KEY!
    _admin = createClient(url, key, {
      auth: {
        persistSession:   false,
        autoRefreshToken: false,
      }
    })
  }
  return _admin
}

// Backward compatibility
export const supabase = {
  get auth() { return getSupabase().auth },
  from: (table: string) => getSupabase().from(table),
}

export const supabaseAdmin = {
  from: (table: string) => getSupabaseAdmin().from(table),
}