import { supabase } from './supabase'

export interface WeeklyCheckin {
  id: string
  user_id: string
  week_number: number
  year: number
  weight: number
  waist: number
  chest: number
  hip: number
  arms: number
  body_fat: number
  following_diet: boolean | null
  following_workout: boolean | null
  notes: string | null
  created_at: string
}

export function getCurrentWeek(): { week: number; year: number } {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week  = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return { week, year: now.getFullYear() }
}

export function isMonday(): boolean {
  return true
}

export async function getLastCheckin(): Promise<WeeklyCheckin | null> {
  try {
    const { data } = await supabase
      .from('weekly_checkins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    return data ?? null
  } catch { return null }
}

export async function getCheckinHistory(limit = 8): Promise<WeeklyCheckin[]> {
  try {
    const { data } = await supabase
      .from('weekly_checkins')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit)
    return data ?? []
  } catch { return [] }
}

export async function saveCheckin(data: {
  weight: number; waist: number; chest: number
  hip: number; arms: number; body_fat: number
  following_diet: boolean | null; following_workout: boolean | null; notes?: string
}): Promise<WeeklyCheckin | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { week, year } = getCurrentWeek()
    const { data: result } = await supabase
      .from('weekly_checkins')
      .upsert({
        user_id: user.id, week_number: week, year, ...data,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_number,year' })
      .select()
      .single()
    return result ?? null
  } catch { return null }
}

export async function hasCheckedInThisWeek(): Promise<boolean> {
  try {
    const { week, year } = getCurrentWeek()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase
      .from('weekly_checkins')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_number', week)
      .eq('year', year)
      .single()
    return !!data
  } catch { return false }
}

export function detectStagnation(history: WeeklyCheckin[]): {
  stagnant: boolean; metric: string; weeks: number
} | null {
  if (history.length < 2) return null
  const last = history[history.length - 1]
  const prev = history[history.length - 2]
  if (Math.abs(last.weight - prev.weight) < 0.3 && Math.abs(last.waist - prev.waist) < 0.5) {
    return { stagnant: true, metric: 'weight and waist', weeks: 2 }
  }
  return null
}