import { supabase } from './supabase'
import type { FitnessResults, Measurements } from './calculations'

export interface SavedAnalysis {
    id: string; slot: number; created_at: string
    weight: number; height: number; age: number; gender: string; goal: string
    neck: number; chest: number; stomach: number; hip: number; thigh: number
    waist: number; bicep: number; forearm: number; wrist: number; knee: number
    calf: number; ankle: number; around_shoulder: number
    body_fat: number; lean_mass: number; ffmi: number; ffmi_category: string
    bmr: number; tdee: number; daily_calories: number
    protein: number; carbs: number; fat: number; fiber: number
    ai_insights: any
}

export async function getSavedAnalyses(): Promise<SavedAnalysis[]> {
    try {
        const { data, error } = await supabase
            .from('user_analyses')
            .select('*')
            .order('slot', { ascending: true })
        if (error) { console.error('getSavedAnalyses:', error.message); return [] }
        return data ?? []
    } catch { return [] }
}

function buildRow(measurements: Measurements, results: FitnessResults, aiInsights: any) {
    return {
        weight:          measurements.weight,
        height:          measurements.height,
        age:             measurements.age,
        gender:          measurements.gender,
        goal:            measurements.goal,
        neck:            measurements.neck,
        chest:           measurements.chest,
        stomach:         measurements.stomach,
        hip:             measurements.hip,
        thigh:           measurements.thigh,
        waist:           measurements.stomach,
        bicep:           measurements.bicep,
        forearm:         measurements.forearm,
        wrist:           measurements.wrist,
        knee:            measurements.knee,
        calf:            measurements.calf,
        ankle:           measurements.ankle,
        around_shoulder: measurements.aroundShoulder,
        body_fat:        results.bodyFatPercent,
        lean_mass:       results.leanMass,
        ffmi:            results.ffmi,
        ffmi_category:   results.ffmiCategory,
        bmr:             results.bmr,
        tdee:            results.tdee,
        daily_calories:  results.dailyCalories,
        protein:         results.protein,
        carbs:           results.carbs,
        fat:             results.fat,
        fiber:           results.fiber,
        ai_insights:     aiInsights,
    }
}

export async function saveAnalysis(
    measurements: Measurements,
    results: FitnessResults,
    aiInsights: any
): Promise<{ slot: number; needsConfirmation?: { slot: number; date: string } }> {

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    console.log('[userdata] saving for user:', user.id)

    const { data: existing, error: fetchErr } = await supabase
        .from('user_analyses')
        .select('slot, created_at')
        .eq('user_id', user.id)
        .order('slot', { ascending: true })

    if (fetchErr) { console.error('[userdata] fetch error:', fetchErr); throw fetchErr }

    const slots = existing ?? []
    console.log('[userdata] existing slots:', slots.length)

    const row = { ...buildRow(measurements, results, aiInsights), user_id: user.id }

    if (slots.length === 0) {
        const { error } = await supabase.from('user_analyses').insert({ ...row, slot: 1 })
        if (error) { console.error('[userdata] insert slot 1 error:', error); throw error }
        console.log('[userdata] saved slot 1')
        return { slot: 1 }
    }

    if (slots.length === 1) {
        const { error } = await supabase.from('user_analyses').insert({ ...row, slot: 2 })
        if (error) { console.error('[userdata] insert slot 2 error:', error); throw error }
        console.log('[userdata] saved slot 2')
        return { slot: 2 }
    }

    if (slots.length === 2) {
        const { error } = await supabase.from('user_analyses').insert({ ...row, slot: 3 })
        if (error) { console.error('[userdata] insert slot 3 error:', error); throw error }
        console.log('[userdata] saved slot 3')
        return { slot: 3 }
    }

    // 3 entries — need confirmation
    const slot2 = slots.find(s => s.slot === 2)
    return {
        slot: 2,
        needsConfirmation: {
            slot: 2,
            date: new Date(slot2?.created_at ?? '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        }
    }
}

export async function replaceSlot2AndShift(
    measurements: Measurements,
    results: FitnessResults,
    aiInsights: any
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    // Move slot 3 → slot 2
    const { error: moveErr } = await supabase
        .from('user_analyses')
        .update({ slot: 2 })
        .eq('user_id', user.id)
        .eq('slot', 3)
    if (moveErr) { console.error('[userdata] move error:', moveErr); throw moveErr }

    // Insert new as slot 3
    const row = { ...buildRow(measurements, results, aiInsights), user_id: user.id }
    const { error: insertErr } = await supabase.from('user_analyses').insert({ ...row, slot: 3 })
    if (insertErr) { console.error('[userdata] insert error:', insertErr); throw insertErr }

    console.log('[userdata] replaced slot 2 and saved new slot 3')
}