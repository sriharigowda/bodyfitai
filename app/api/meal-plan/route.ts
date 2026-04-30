export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { jsonrepair } from 'jsonrepair'

const USE_OPENAI   = !!process.env.OPENAI_API_KEY
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// ─── Macro distribution per meal ─────────────────────────────────────────────
const MEAL_DIST = {
  pre_workout:  { protein: 0.20, carbs: 0.22, fat: 0.15 },
  post_workout: { protein: 0.30, carbs: 0.15, fat: 0.18 },
  snack1:       { protein: 0.12, carbs: 0.12, fat: 0.10 },
  lunch:        { protein: 0.28, carbs: 0.28, fat: 0.25 },
  snack2:       { protein: 0.05, carbs: 0.15, fat: 0.05 },
  dinner:       { protein: 0.28, carbs: 0.20, fat: 0.22 },
  bed:          { protein: 0.08, carbs: 0.03, fat: 0.05 },
}

function calcMacros(totalProtein: number, totalCarbs: number, totalFat: number) {
  return Object.entries(MEAL_DIST).map(([key, dist]) => {
    const p = Math.round(totalProtein * dist.protein)
    const c = Math.round(totalCarbs   * dist.carbs)
    const f = Math.round(totalFat     * dist.fat)
    const k = Math.round(p * 4 + c * 4 + f * 9)
    return { key, protein: p, carbs: c, fat: f, kcal: k }
  })
}

function gymTimeToHour(gymTime: string): number {
  const match = gymTime.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 9
  let h = parseInt(match[1])
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h
}

function fmt(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh   = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:00 ${ampm}`
}

function buildTimes(gymHour: number) {
  return {
    preWorkout:  Math.max(4, gymHour - 2),
    gym:         gymHour,
    postWorkout: gymHour + 1,
    snack1:      gymHour + 3,
    lunch:       gymHour + 5,
    snack2:      gymHour + 8,
    dinner:      gymHour + 11,
    bed:         gymHour + 13,
  }
}

// ─── Gender + goal aware food portions ───────────────────────────────────────
function getFoodPortions(gender: string, goal: string, isVeg: boolean) {
  const isFemale    = gender === 'Female'
  const isFatLoss   = goal === 'Weight loss'
  const isMuscle    = goal === 'Muscle gain'

  // Protein source portions
  const chickenGrams = isFemale ? (isFatLoss ? 150 : 200) : (isFatLoss ? 200 : 250)
  const paneerGrams  = isFemale ? (isFatLoss ? 100 : 150) : (isFatLoss ? 150 : 250)
  const eggsCount    = isFemale ? (isFatLoss ? 2   : 3)   : (isFatLoss ? 3   : 5)
  const riceGrams    = isFemale ? (isFatLoss ? 100 : 150) : (isFatLoss ? 150 : 200)
  const breadSlices  = isFemale ? 2 : 4
  const oatsGrams    = isFemale ? 30 : 50
  const wheyMilk     = isFemale ? 'water' : 'full-fat milk'
  const walnuts      = isFemale ? '4-5'   : '5-8'

  // Female fat loss — focus on more veg, less starchy carbs
  const lunchCarb = isFemale && isFatLoss
    ? `${riceGrams}g cooked rice or 2 rotis`
    : `${riceGrams}g cooked rice`

  const dinnerCarb = isFemale && isFatLoss
    ? `2 whole wheat rotis (lighter dinner)`
    : `${riceGrams}g cooked rice + 1 tsp ghee`

  const snack2Items = isFemale && isFatLoss
    ? [
        { name: '1 banana', detail: '~23g carbs, natural energy' },
        { name: '100ml low-fat milk or green tea', detail: 'light and filling' },
      ]
    : [
        { name: '2 bananas', detail: '~46g carbs, fast energy' },
        { name: '200ml full-fat milk', detail: '6.8g protein' },
      ]

  const modeNote = isFatLoss ? 'Cut' : isMuscle ? 'Bulk' : 'Recomp'

  return {
    chickenGrams, paneerGrams, eggsCount, riceGrams,
    breadSlices, oatsGrams, wheyMilk, walnuts,
    lunchCarb, dinnerCarb, snack2Items, modeNote,
    isFemale, isFatLoss,
  }
}

function buildPrompt(data: any, planType: 'nonveg' | 'veg', macros: ReturnType<typeof calcMacros>, times: ReturnType<typeof buildTimes>): string {
  const { name, goal, dietType, gender = 'Male' } = data
  const isVeg = planType === 'veg'
  const p     = getFoodPortions(gender, goal, isVeg)

  const chickenOrPaneer = isVeg
    ? `${p.paneerGrams}g paneer`
    : `${p.chickenGrams}g chicken breast`

  const chickenProtein = isVeg
    ? `${Math.round(p.paneerGrams * 0.18)}g protein`
    : `${Math.round(p.chickenGrams * 0.22)}g protein`

  const postGymProtein = isVeg
    ? `{"name": "${Math.round(p.paneerGrams * 0.6)}g paneer", "detail": "${Math.round(p.paneerGrams * 0.6 * 0.18)}g protein · grilled or plain"}`
    : `{"name": "${p.eggsCount} whole boiled eggs", "detail": "${p.eggsCount * 6}g protein"}`

  return `You are an expert Indian fitness nutritionist. Return valid JSON only. No markdown.

Create a ${isVeg ? 'VEGETARIAN' : 'NON-VEG'} day meal plan for:
Name: ${name}, Goal: ${goal} (${p.modeNote}), Gender: ${gender}, Diet: ${dietType}
${p.isFemale ? `FEMALE user — use smaller portions, lighter dinners, more vegetables` : `MALE user — standard portions`}
${p.isFatLoss ? `FAT LOSS — keep dinner light, avoid heavy carbs at night` : `MUSCLE GAIN — prioritize protein and post-workout carbs`}

MACRO TARGETS (use EXACTLY these values, do not change them):
Pre-workout (${fmt(times.preWorkout)}): ${macros[0].protein}g P, ${macros[0].carbs}g C, ${macros[0].fat}g F, ${macros[0].kcal} kcal
Post-workout (${fmt(times.postWorkout)}): ${macros[1].protein}g P, ${macros[1].carbs}g C, ${macros[1].fat}g F, ${macros[1].kcal} kcal
Mid snack (${fmt(times.snack1)}): ${macros[2].protein}g P, ${macros[2].carbs}g C, ${macros[2].fat}g F, ${macros[2].kcal} kcal
Lunch (${fmt(times.lunch)}): ${macros[3].protein}g P, ${macros[3].carbs}g C, ${macros[3].fat}g F, ${macros[3].kcal} kcal
Afternoon snack (${fmt(times.snack2)}): ${macros[4].protein}g P, ${macros[4].carbs}g C, ${macros[4].fat}g F, ${macros[4].kcal} kcal
Dinner (${fmt(times.dinner)}): ${macros[5].protein}g P, ${macros[5].carbs}g C, ${macros[5].fat}g F, ${macros[5].kcal} kcal
Before bed (${fmt(times.bed)}): ${macros[6].protein}g P, ${macros[6].carbs}g C, ${macros[6].fat}g F, ${macros[6].kcal} kcal

Return this exact JSON (keep ALL macro numbers exactly as given above):
{
  "planType": "${planType}",
  "planLabel": "${isVeg ? '🌿 Veg Day' : '🍗 Non-Veg Day'}",
  "meals": [
    {
      "time": "${fmt(times.preWorkout)}",
      "title": "Pre-Workout Meal",
      "emoji": "⚡",
      "type": "pre_workout",
      "description": "Eat on waking — gym fuel",
      "protein": ${macros[0].protein},
      "carbs": ${macros[0].carbs},
      "fat": ${macros[0].fat},
      "kcal": ${macros[0].kcal},
      "items": [
        {"name": "1 scoop whey in 250ml ${p.wheyMilk}", "detail": "~25g protein · Scoop 1"},
        {"name": "${p.oatsGrams}g plain oats cooked with water", "detail": "${Math.round(p.oatsGrams * 0.117)}g protein, ${Math.round(p.oatsGrams * 0.67)}g carbs"},
        {"name": "${p.breadSlices} slices brown bread + 1 tbsp peanut butter", "detail": "~${Math.round(p.breadSlices * 7)}g carbs, 8g protein"},
        {"name": "1 banana", "detail": "fast carbs for gym energy"},
        {"name": "Black coffee (no sugar)", "detail": "focus + caffeine boost"}
      ]
    },
    {
      "time": "${fmt(times.postWorkout)}",
      "title": "Post-Workout Recovery",
      "emoji": "💪",
      "type": "post_workout",
      "description": "Within 30 min — most important meal",
      "protein": ${macros[1].protein},
      "carbs": ${macros[1].carbs},
      "fat": ${macros[1].fat},
      "kcal": ${macros[1].kcal},
      "items": [
        {"name": "1 scoop whey + Creatine 5g in 250ml milk", "detail": "~33g protein · Scoop 2 · daily creatine"},
        ${postGymProtein},
        {"name": "Muskmelon or 1 banana", "detail": "fast carbs for glycogen refill"}
      ]
    },
    {
      "time": "${fmt(times.snack1)}",
      "title": "Mid Morning Snack",
      "emoji": "🥣",
      "type": "snack",
      "description": "${p.isFemale ? 'Light protein snack' : 'High protein mid-morning fuel'}",
      "protein": ${macros[2].protein},
      "carbs": ${macros[2].carbs},
      "fat": ${macros[2].fat},
      "kcal": ${macros[2].kcal},
      "items": [
        {"name": "${p.isFemale ? '30g' : '50g'} High Protein Oats with 200ml milk", "detail": "${p.isFemale ? '~15g' : '~21g'} protein · cook in milk"},
        {"name": "100g thick dahi", "detail": "10g protein"},
        {"name": "${p.isFemale ? '10' : '15'} almonds", "detail": "healthy fats"}
      ]
    },
    {
      "time": "${fmt(times.lunch)}",
      "title": "${isVeg ? `Lunch — Paneer + ${p.isFatLoss && p.isFemale ? 'Roti' : 'Rice'}` : `Lunch — Chicken + ${p.isFatLoss && p.isFemale ? 'Roti' : 'Rice'}`}",
      "emoji": "${isVeg ? '🧀' : '🍗'}",
      "type": "lunch",
      "description": "Biggest meal · Take Vit D3 here",
      "protein": ${macros[3].protein},
      "carbs": ${macros[3].carbs},
      "fat": ${macros[3].fat},
      "kcal": ${macros[3].kcal},
      "items": [
        {"name": "${chickenOrPaneer}", "detail": "${chickenProtein} · grilled or curry"},
        {"name": "${p.lunchCarb}", "detail": "main carb source"},
        {"name": "1 cup dal", "detail": "7g protein + micronutrients"},
        {"name": "${p.isFemale ? 'Mixed sabzi (palak / gobi / bhindi)' : 'Sabzi'} + 1 tsp ghee", "detail": "${p.isFemale ? 'extra fiber and micronutrients' : 'healthy fats for hormones'}"},
        {"name": "💊 Vit D3 + Ca + Mg + Zn tablet", "detail": "take with this meal"}
      ]
    },
    {
      "time": "${fmt(times.snack2)}",
      "title": "Afternoon Snack",
      "emoji": "🍌",
      "type": "snack",
      "description": "${p.isFemale && p.isFatLoss ? 'Light snack — keeps cravings away' : 'Energy before dinner'}",
      "protein": ${macros[4].protein},
      "carbs": ${macros[4].carbs},
      "fat": ${macros[4].fat},
      "kcal": ${macros[4].kcal},
      "items": ${JSON.stringify(p.snack2Items)}
    },
    {
      "time": "${fmt(times.dinner)}",
      "title": "${isVeg ? `Dinner — Paneer + ${p.isFatLoss && p.isFemale ? 'Roti' : 'Rice'}` : `Dinner — Chicken + ${p.isFatLoss && p.isFemale ? 'Roti' : 'Rice'}`}",
      "emoji": "${isVeg ? '🧀' : '🍗'}",
      "type": "dinner",
      "description": "${p.isFemale && p.isFatLoss ? 'Light dinner — avoid heavy carbs at night' : 'High protein dinner'}",
      "protein": ${macros[5].protein},
      "carbs": ${macros[5].carbs},
      "fat": ${macros[5].fat},
      "kcal": ${macros[5].kcal},
      "items": [
        {"name": "${chickenOrPaneer}", "detail": "${chickenProtein}"},
        {"name": "${p.dinnerCarb}", "detail": "${p.isFemale && p.isFatLoss ? 'lighter than lunch' : ''}"},
        {"name": "Salad", "detail": "cucumber, tomato, onion, lemon${p.isFemale ? ', spinach' : ''}"}
      ]
    },
    {
      "time": "${fmt(times.bed)}",
      "title": "Before Bed",
      "emoji": "😴",
      "type": "bed",
      "description": "Slow protein — feeds muscles overnight",
      "protein": ${macros[6].protein},
      "carbs": ${macros[6].carbs},
      "fat": ${macros[6].fat},
      "kcal": ${macros[6].kcal},
      "items": [
        {"name": "200ml warm ${p.isFemale && p.isFatLoss ? 'low-fat' : 'full-fat'} milk", "detail": "${p.isFemale && p.isFatLoss ? '6g' : '8.5g'} protein · slow casein"},
        {"name": "${p.walnuts} walnuts or almonds", "detail": "healthy fats, omega-3"},
        {"name": "💊 Ashwagandha KSM-66", "detail": "2 tablets with milk · best timing"}
      ]
    }
  ]
}

CRITICAL: Do NOT change any protein, carbs, fat, or kcal numbers. Only adjust food descriptions if needed.`
}

async function callAI(prompt: string): Promise<string> {
  if (USE_OPENAI) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert Indian nutritionist. Return valid JSON only. No markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2, max_tokens: 2500,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
    return (await res.json()).choices[0].message.content
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert Indian nutritionist. Return valid JSON only. No markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2, max_tokens: 2500,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${await res.text()}`)
  return (await res.json()).choices[0].message.content
}

function extractJSON(text: string): string {
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = clean.indexOf('{'); const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found')
  return jsonrepair(clean.slice(start, end + 1))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { dailyCalories, protein, carbs, fat, gymTime, dietType, gender } = body

    const gymHour = gymTimeToHour(gymTime || '9:00 AM')
    const times   = buildTimes(gymHour)
    const macros  = calcMacros(protein, carbs, fat)

    const isVegetarian = dietType === 'Vegetarian'
    const isNonVeg     = dietType === 'Non-vegetarian'
    const isMixed      = !isVegetarian && !isNonVeg && !['Navratri fast','Ramadan','Ekadashi fast'].includes(dietType)

    let nonvegPlan = null
    let vegPlan    = null

    if (isVegetarian) {
      const text = await callAI(buildPrompt(body, 'veg', macros, times))
      vegPlan = JSON.parse(extractJSON(text))
    } else if (isNonVeg) {
      const text = await callAI(buildPrompt(body, 'nonveg', macros, times))
      nonvegPlan = JSON.parse(extractJSON(text))
    } else if (isMixed) {
      const [nvText, vText] = await Promise.all([
        callAI(buildPrompt(body, 'nonveg', macros, times)),
        callAI(buildPrompt(body, 'veg',    macros, times)),
      ])
      nonvegPlan = JSON.parse(extractJSON(nvText))
      vegPlan    = JSON.parse(extractJSON(vText))
    } else {
      // Fasting types
      const text = await callAI(buildPrompt(body, 'veg', macros, times))
      vegPlan = JSON.parse(extractJSON(text))
    }

    // Female fat loss — different supplements
    const isFemale  = gender === 'Female'
    const isFatLoss = body.goal === 'Weight loss'
    const supplements = isFemale ? [
      { name: 'Iron + Folic Acid',  timing: 'with breakfast', icon: '💊' },
      { name: 'Vit D3 + K2',       timing: 'with lunch',      icon: '🌅' },
      { name: 'Omega-3',            timing: 'with dinner',     icon: '🐟' },
      { name: 'Magnesium 200mg',   timing: 'before bed',       icon: '🌙' },
      ...(!isFatLoss ? [{ name: 'Creatine 5g', timing: 'post-gym shake', icon: '⚡' }] : []),
    ] : [
      { name: 'Creatine 5g',          timing: 'post-gym shake', icon: '⚡' },
      { name: 'Vit D3 + Ca + Mg + Zn',timing: '1 tablet with lunch', icon: '🌅' },
      { name: 'Collagen',             timing: 'with morning water',   icon: '🧴' },
      { name: 'Ashwagandha KSM-66',   timing: 'before bed',           icon: '🌿' },
    ]

    return NextResponse.json({ nonvegPlan, vegPlan, macros, times, gymTime, supplements })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Meal plan error:', msg)
    return NextResponse.json({ error: `Meal plan failed: ${msg}` }, { status: 500 })
  }
}