import { supabase } from './supabase'

export async function getProfile(): Promise<{ name: string } | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data, error } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single()

        if (error || !data) return null
        return { name: data.name ?? '' }
    } catch { return null }
}

export async function saveProfile(name: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
            .from('profiles')
            .upsert({ id: user.id, name, updated_at: new Date().toISOString() })
    } catch {}
}

export async function needsOnboarding(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false
        const profile = await getProfile()
        return !profile?.name
    } catch { return false }
}