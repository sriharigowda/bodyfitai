export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { jsonrepair } from 'jsonrepair'

const USE_OPENAI   = !!process.env.OPENAI_API_KEY
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

function buildWorkoutPrompt(data: any): string {
  const { name, goal, bodyFat, ffmi, leanMass, weight, gender, chest, bicep, thigh, calf } = data
  return `You are an expert strength coach. Return valid JSON only. No markdown.

Create a personalized 6-day PPL workout split for:
Name: ${name}, Goal: ${goal}, Gender: ${gender}
Body fat: ${bodyFat}%, FFMI: ${ffmi}, Lean mass: ${leanMass}kg, Weight: ${weight}kg
Measurements: Chest ${chest}cm, Biceps ${bicep}cm, Thighs ${thigh}cm, Calves ${calf}cm

Return this exact JSON:
{
  "planTitle": "${name}'s 6-Day PPL Split",
  "goal": "${goal}",
  "days": [
    {
      "day": "Monday",
      "name": "Push 1 — Chest & Shoulders",
      "emoji": "💪",
      "color": "#3b82f6",
      "focus": "Chest dominant",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "6-8",
          "rest": "3 min",
          "muscle": "Chest",
          "tip": "Progressive overload tip based on their measurements",
          "substitute": "Dumbbell Press"
        }
      ],
      "cardio": "20 min incline treadmill walk — 4.5 km/h, 8% incline"
    },
    {
      "day": "Tuesday",
      "name": "Pull 1 — Back & Biceps",
      "emoji": "🔙",
      "color": "#10b981",
      "focus": "Width focused",
      "exercises": [],
      "cardio": "20 min incline treadmill walk"
    },
    {
      "day": "Wednesday",
      "name": "Legs 1 — Quads",
      "emoji": "🦵",
      "color": "#f59e0b",
      "focus": "Quad dominant",
      "exercises": [],
      "cardio": "15 min incline treadmill walk"
    },
    {
      "day": "Thursday",
      "name": "Push 2 — Shoulders & Chest",
      "emoji": "🔝",
      "color": "#8b5cf6",
      "focus": "Shoulder dominant",
      "exercises": [],
      "cardio": "20 min incline treadmill walk"
    },
    {
      "day": "Friday",
      "name": "Pull 2 — Back & Deadlift",
      "emoji": "💥",
      "color": "#ef4444",
      "focus": "Thickness focused",
      "exercises": [],
      "cardio": "15 min incline treadmill walk"
    },
    {
      "day": "Saturday",
      "name": "Legs 2 — Hamstrings & Glutes",
      "emoji": "🏃",
      "color": "#f97316",
      "focus": "Hamstring & glute dominant",
      "exercises": [],
      "cardio": "25 min incline treadmill walk"
    },
    {
      "day": "Sunday",
      "name": "Rest & Recovery",
      "emoji": "😴",
      "color": "#94a3b8",
      "focus": "Full body recovery",
      "exercises": [],
      "cardio": "Optional 30 min walk"
    }
  ],
  "notes": [
    "Personalized note about their body composition",
    "Advice based on their weak points",
    "Recovery tip"
  ]
}

IMPORTANT:
- Fill ALL 6 training days with 5-7 exercises each
- Each exercise must have: name, sets (number), reps (string like "8-12"), rest (string), muscle (string), tip (personalized based on measurements), substitute (string)
- Push days: chest, shoulders, triceps
- Pull days: back, biceps, rear delts
- Leg days: quads, hamstrings, glutes, calves
- Personalize tips based on their actual measurements (e.g. if chest is smaller, prioritize chest work)
- Sunday has no exercises, just rest notes`
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert strength coach. Always respond with valid JSON only. No markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, max_tokens: 3000,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
  return (await res.json()).choices[0].message.content
}

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert strength coach. Always respond with valid JSON only. No markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, max_tokens: 3000,
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
    const body   = await req.json()
    const prompt = buildWorkoutPrompt(body)
    const text   = USE_OPENAI ? await callOpenAI(prompt) : await callGroq(prompt)
    const plan   = JSON.parse(extractJSON(text))
    return NextResponse.json({ plan })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Workout plan error:', msg)
    return NextResponse.json({ error: `Workout plan failed: ${msg}` }, { status: 500 })
  }
}