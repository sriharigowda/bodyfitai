import { supabaseAdmin } from './supabase'

export const FREE_LIMIT = 1

export const CREDIT_PACKS: Record<string, { credits: number; amount: number; label: string }> = {
  pack10: { credits: 10, amount: 2900, label: '10 analyses' },
  pack25: { credits: 25, amount: 5900, label: '25 analyses' },
  pack50: { credits: 50, amount: 9900, label: '50 analyses' },
}

export function getMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}`
}

// ─── FREE USAGE ───────────────────────────────────────────────────────────────
export async function getUsage(identifier: string): Promise<number> {
  const { data } = await supabaseAdmin
      .from('usage')
      .select('count')
      .eq('identifier', identifier)
      .eq('month', getMonthKey())
      .single()
  return data?.count ?? 0
}

export async function incrementUsage(identifier: string): Promise<void> {
  const month   = getMonthKey()
  const current = await getUsage(identifier)
  await supabaseAdmin
      .from('usage')
      .upsert({ identifier, month, count: current + 1 }, { onConflict: 'identifier,month' })
}

// ─── SUBSCRIPTION ─────────────────────────────────────────────────────────────
export async function getSubscription(identifier: string): Promise<string> {
  const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, expires_at')
      .eq('identifier', identifier)
      .single()
  if (!data) return 'free'
  if (data.expires_at && new Date(data.expires_at) < new Date()) return 'free'
  return data.plan ?? 'free'
}

export async function isPro(identifier: string): Promise<boolean> {
  const plan = await getSubscription(identifier)
  return plan === 'pro' || plan === 'elite'
}

// ─── CREDITS ──────────────────────────────────────────────────────────────────
export async function getCredits(identifier: string): Promise<number> {
  const { data } = await supabaseAdmin
      .from('credits')
      .select('balance')
      .eq('identifier', identifier)
      .single()
  return data?.balance ?? 0
}

export async function addCredits(identifier: string, amount: number): Promise<number> {
  const current    = await getCredits(identifier)
  const newBalance = current + amount
  await supabaseAdmin
      .from('credits')
      .upsert({ identifier, balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'identifier' })
  return newBalance
}

export async function deductCredit(identifier: string): Promise<boolean> {
  const balance = await getCredits(identifier)
  if (balance <= 0) return false
  await supabaseAdmin
      .from('credits')
      .update({ balance: balance - 1, updated_at: new Date().toISOString() })
      .eq('identifier', identifier)
  return true
}

// ─── CAN ANALYZE ─────────────────────────────────────────────────────────────
export async function canAnalyze(identifier: string): Promise<{
  allowed: boolean
  freeLeft: number
  credits: number
  isPro: boolean
}> {
  const pro = await isPro(identifier)
  if (pro) return { allowed: true, freeLeft: 0, credits: 999, isPro: true }

  const freeUsed = await getUsage(identifier)
  const freeLeft = Math.max(0, FREE_LIMIT - freeUsed)
  if (freeLeft > 0) return { allowed: true, freeLeft, credits: 0, isPro: false }

  const credits = await getCredits(identifier)
  return { allowed: credits > 0, freeLeft: 0, credits, isPro: false }
}