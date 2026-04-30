export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { jsonrepair } from 'jsonrepair'
import { Measurements, FitnessResults, calculateResults } from '@/lib/calculations'


// Auto-detect provider: OpenAI if key present, else Groq
const USE_OPENAI  = !!process.env.OPENAI_API_KEY
const GROQ_MODEL  = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// ─── PROMPT 1: Body analysis ──────────────────────────────────────────────────
function buildAnalysisPrompt(m: Measurements, r: FitnessResults): string {
  return `You are a fitness coach. Respond with a JSON object only. No markdown, no text outside the JSON.

User: ${m.name}, ${m.age}y, ${m.gender}, ${m.height}cm, ${m.weight}kg, Goal: ${m.goal}
Current: Body fat ${r.bodyFatPercent}% (${r.bodyFatCategory}), Lean ${r.leanMass}kg, FFMI ${r.ffmi} (${r.ffmiCategory})
Target: ${m.targetWeight}kg, Body fat ${r.target.targetBodyFat}%, Lean ${r.target.targetLeanMass}kg, FFMI ${r.target.targetFFMI}
Calories: ${r.dailyCalories} kcal/day, Protein ${r.protein}g, Carbs ${r.carbs}g, Fat ${r.fat}g

Return this exact JSON (fill in the string values, keep the structure exactly):
{"greeting":"one sentence greeting using their name","summary":"2 sentence summary","currentAnalysis":{"bodyFatExplanation":"2 sentences about their current body fat","leanMassExplanation":"2 sentences about their lean mass","ffmiExplanation":"2 sentences about their FFMI score","bodyComposition":"1 sentence about body shape"},"targetAnalysis":{"bodyFatExplanation":"2 sentences about target body fat","leanMassExplanation":"2 sentences about target lean mass","ffmiExplanation":"2 sentences about target FFMI","targetBodyMeasurements":"1 sentence about target body shape"},"nutritionTips":["tip1","tip2","tip3"],"workoutRecommendation":"2 sentences about workout","duration":{"weeks":${r.weeksToGoal},"months":"${Math.round(r.weeksToGoal / 4.3)} months","milestone4weeks":"what changes in 4 weeks","milestone8weeks":"what changes in 8 weeks","milestoneGoal":"how they look at goal"},"motivation":"one motivating sentence","warnings":[]}`
}

// ─── PROMPT 2: Weekly diet plan ───────────────────────────────────────────────
function buildDietPrompt(m: Measurements, r: FitnessResults): string {
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const isFasting = ['Navratri fast','Ramadan','Ekadashi fast'].includes(m.diet.type)

  if (isFasting) {
    const fastingRules: Record<string, string> = {
      'Navratri fast': 'Navratri fasting only: sabudana, kuttu atta, singhara flour, sama rice, fruits, milk, curd, sendha namak, potatoes, peanuts. No grains, no onion, no garlic.',
      'Ramadan':       'Ramadan: Suhoor before dawn (high protein), Iftar breaking fast at sunset (dates, fruits, then full meal). Label breakfast as Suhoor and lunch as Iftar.',
      'Ekadashi fast': 'Ekadashi fasting only: fruits, milk, sabudana, nuts, sweet potato, sendha namak. No grains, no pulses, no non-veg.',
    }
    const dayInstructions = DAYS.map(d =>
      `"${d}":{"type":"fast","breakfast":"<fasting food ~cal>","lunch":"<fasting food ~cal>","dinner":"<fasting food ~cal>","snack":"<fasting snack ~cal>"}`
    ).join(',')
    return `You are a nutritionist. Return valid JSON only. No markdown.
Create a 7-day ${m.diet.type} meal plan for ${m.name}.
Daily targets: ${r.dailyCalories} kcal, ${r.protein}g protein, ${r.carbs}g carbs, ${r.fat}g fat.
Rules: ${fastingRules[m.diet.type]}
Replace every <...> with a REAL specific food following the fasting rules. Max 8 words per meal.
Return this JSON: {${dayInstructions}}`
  }

  const nonVeg = m.diet.nonVegDays
  const schedule = DAYS.map(d => {
    if (m.diet.type === 'Vegetarian') return `${d}:veg`
    if (m.diet.type === 'Non-vegetarian') return `${d}:non-veg`
    return `${d}:${nonVeg.includes(d) ? 'non-veg' : 'veg'}`
  })
  const dayInstructions = schedule.map(s => {
    const [day, type] = s.split(':')
    return `"${day}":{"type":"${type}","breakfast":"<real ${type} Indian breakfast ~cal>","lunch":"<real ${type} Indian lunch ~cal>","dinner":"<real ${type} Indian dinner ~cal>","snack":"<real ${type} snack ~cal>"}`
  }).join(',')
  return `You are a nutritionist. Return valid JSON only. No markdown.
Create a 7-day Indian meal plan for ${m.name}.
Daily targets: ${r.dailyCalories} kcal, ${r.protein}g protein, ${r.carbs}g carbs, ${r.fat}g fat.
Replace every <...> with a REAL specific Indian food and approximate calories. Max 8 words per meal.
Return this JSON with real food for every single day:
{${dayInstructions}}`
}

// ─── API CALLERS ──────────────────────────────────────────────────────────────
async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a fitness expert. Always respond with valid JSON only. Never include markdown, code blocks, or any text outside the JSON object.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
  return (await res.json()).choices[0].message.content as string
}

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a fitness expert. Always respond with valid JSON only. Never include markdown, code blocks, or any text outside the JSON object.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${await res.text()}`)
  return (await res.json()).choices[0].message.content as string
}

async function callAI(prompt: string): Promise<string> {
  if (USE_OPENAI) {
    console.log('[BodyFitAI] Using OpenAI GPT-4o mini')
    return callOpenAI(prompt)
  }
  console.log('[BodyFitAI] Using Groq')
  return callGroq(prompt)
}

// ─── JSON EXTRACTOR ───────────────────────────────────────────────────────────
function extractJSON(text: string): string {
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = clean.indexOf('{')
  const end   = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found in response')
  clean = clean.slice(start, end + 1)
  return jsonrepair(clean)
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body                       = await req.json()
    const measurements: Measurements = body.measurements
    const results: FitnessResults    = calculateResults(measurements)



    // Two parallel AI calls — analysis + diet plan
    const [analysisText, dietText] = await Promise.all([
      callAI(buildAnalysisPrompt(measurements, results)),
      callAI(buildDietPrompt(measurements, results)),
    ])

    const analysis      = JSON.parse(extractJSON(analysisText))
    const weeklyDietPlan = JSON.parse(extractJSON(dietText))

    /

    const aiInsights = { ...analysis, weeklyDietPlan }
    return NextResponse.json({ results, aiInsights })

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Analysis error:', errMsg)
    return NextResponse.json({ error: `Analysis failed: ${errMsg}` }, { status: 500 })
  }
}