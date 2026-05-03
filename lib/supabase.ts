import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

// Backward compatibility — used across the app
export const supabase = {
  get auth() { return getSupabase().auth },
  from: (table: string) => getSupabase().from(table),
}

// Admin client — lazy, server-side only
// Uses SERVICE_ROLE key for full access (auth.admin.listUsers etc.)
// Falls back to anon key at build time to prevent build crashes
let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_SERVICE_KEY
           || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
           || ''
    _admin = createClient(url, key, {
      auth: {
        persistSession:   false,
        autoRefreshToken: false,
      }
    })
  }
  return _admin
}

// Backward compat alias — used in existing API routes
export const supabaseAdmin = {
  get auth() { return getSupabaseAdmin().auth },
  from: (table: string) => getSupabaseAdmin().from(table),
}