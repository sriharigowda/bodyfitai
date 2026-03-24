import { supabase } from './supabase'
import type { FitnessResults, Measurements } from './calculations'

export interface SavedAnalysis {
    id: string
    slot: number
    created_at: string
    weight: number
    height: number
    age: number
    gender: string
    goal: string
    neck: number
    chest: number
    stomach: number
    hip: number
    thigh: number
    waist: number
    bicep: number
    forearm: number
    wrist: number
    knee: number
    calf: number
    ankle: number
    around_shoulder: number
    body_fat: number
    lean_mass: number
    ffmi: number
    ffmi_category: string
    bmr: number
    tdee: number
    daily_calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    ai_insights: any
}

export async function getSavedAnalyses(): Promise<SavedAnalysis[]> {
    try {
        const { data, error } = await supabase
            .from('user_analyses')
            .select('*')
            .order('slot', { ascending: true })
        if (error) {
            console.error('getSavedAnalyses error:', error.message)
            return []
        }
        return data ?? []
    } catch {
        return []
    }
}

export async function saveAnalysis(
    measurements: Measurements,
    results: FitnessResults,
    aiInsights: any
): Promise<{ slot: number; needsConfirmation?: { slot: number; date: string } }> {
    const { data: existing } = await supabase
        .from('user_analyses')
        .select('slot, created_at')
        .order('slot', { ascending: true })

    const slots = existing ?? []
    const row = {
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
        waist:           measurements.stomach, // use stomach as waist approx
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

    // No entries yet → save as slot 1
    if (slots.length === 0) {
        await supabase.from('user_analyses').insert({ ...row, slot: 1 })
        return { slot: 1 }
    }

    // 1 entry → save as slot 2
    if (slots.length === 1) {
        await supabase.from('user_analyses').insert({ ...row, slot: 2 })
        return { slot: 2 }
    }

    // 2 entries → save as slot 3
    if (slots.length === 2) {
        await supabase.from('user_analyses').insert({ ...row, slot: 3 })
        return { slot: 3 }
    }

    // 3 entries → need confirmation to replace slot 2
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
    // Get current slot 3
    const { data: slot3Data } = await supabase
        .from('user_analyses')
        .select('*')
        .eq('slot', 3)
        .single()

    // Move slot 3 → slot 2
    if (slot3Data) {
        await supabase.from('user_analyses').update({ slot: 2 }).eq('slot', 3)
    }

    // Save new as slot 3
    const row = {
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
    await supabase.from('user_analyses').insert({ ...row, slot: 3 })
}