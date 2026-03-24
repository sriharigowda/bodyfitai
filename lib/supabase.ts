import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

export function getSupabase() {
    if (!_supabase) {
        _supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return _supabase
}

export function getSupabaseAdmin() {
    if (!_supabaseAdmin) {
        _supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        )
    }
    return _supabaseAdmin
}

// Keep backward compatibility
export const supabase = {
    get auth() { return getSupabase().auth },
    from: (table: string) => getSupabase().from(table),
}

export const supabaseAdmin = {
    from: (table: string) => getSupabaseAdmin().from(table),
}