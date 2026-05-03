import { supabase } from './supabase'

export interface Profile {
  name:   string
  age?:   number
  gender?: string
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('name, age, gender')
      .eq('user_id', user.id)
      .single()
    if (error) return null
    return data
  } catch { return null }
}

export async function saveProfile(
  name: string,
  extras?: { age?: number; gender?: string }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({
      id:      user.id,   // ← id = auth user UUID
      user_id: user.id,   // ← user_id = same UUID
      name:    name.trim(),
      ...(extras?.age    ? { age:    extras.age    } : {}),
      ...(extras?.gender ? { gender: extras.gender } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch (e) {
    console.error('saveProfile error:', e)
  }
}

export async function needsOnboarding(): Promise<boolean> {
  try {
    const profile = await getProfile()
    return !profile?.name
  } catch { return true }
}