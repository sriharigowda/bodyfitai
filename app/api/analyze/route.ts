import { NextRequest, NextResponse } from 'next/server'
import { Measurements, FitnessResults, calculateResults } from '@/lib/calculations'

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// Set AI_PROVIDER in your .env.local or Vercel environment variables:
//
//   AI_PROVIDER=ollama   → Ollama  (local dev, free, runs on your machine)
//   AI_PROVIDER=groq     → Groq    (production, free tier, open-source models)
//   AI_PROVIDER=claude   → Claude  (production, best quality, paid)
//
// Required keys per provider:
//   ollama  → OLLAMA_URL, OLLAMA_MODEL
//   groq    → GROQ_API_KEY  (free at console.groq.com)
//   claude  → ANTHROPIC_API_KEY
// ──────────────────────────────────────────────────────────────────────────────

const PROVIDER    = (process.env.AI_PROVIDER || 'ollama') as 'ollama' | 'groq' | 'claude'
const OLLAMA_URL  = process.env.OLLAMA_URL  || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'
const GROQ_MODEL  = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'

// ─── PROMPT ───────────────────────────────────────────────────────────────────
function buildPrompt(measurements: Measurements, results: FitnessResults): string {
  return `You are an expert fitness coach and nutritionist. A user has submitted their body measurements and fitness goal. Based on the data below, provide a personalized, motivating, and actionable fitness analysis.

USER DATA:
- Age: ${measurements.age}, Gender: ${measurements.gender}
- Height: ${measurements.height}cm, Weight: ${measurements.weight}kg
- Body Fat: ${results.bodyFatPercent}% (${results.bodyFatCategory})
- Lean Mass: ${results.leanMass}kg, Fat Mass: ${results.fatMass}kg
- Goal: ${measurements.goal}
- Target Weight: ${measurements.targetWeight}kg
- Activity Level: ${measurements.activityLevel}
- Measurements: Neck ${measurements.neck}cm, Chest ${measurements.chest}cm, Stomach ${measurements.stomach}cm, Hip ${measurements.hip}cm

CALCULATED PLAN:
- Daily Calories: ${results.dailyCalories} kcal
- Protein: ${results.protein}g | Carbs: ${results.carbs}g | Fat: ${results.fat}g | Fiber: ${results.fiber}g
- BMR: ${results.bmr} kcal | TDEE: ${results.tdee} kcal
- Calorie deficit/surplus: ${results.deficit} kcal/day
- Estimated time to goal: ${results.weeksToGoal} weeks

You MUST respond with valid JSON only. No markdown, no code blocks, no explanation before or after. Start your response with { and end with }.

Required JSON structure:
{
  "summary": "2-3 sentence personalized summary of their current fitness status and goal",
  "bodyComposition": "1-2 sentences about their body composition based on measurements",
  "nutritionTips": ["tip 1", "tip 2", "tip 3"],
  "workoutRecommendation": "2-3 sentences about what type of workout suits their goal",
  "weeklyMealPlan": {
    "breakfast": "example breakfast with approximate macros",
    "lunch": "example lunch with approximate macros",
    "dinner": "example dinner with approximate macros",
    "snack": "example snack with approximate macros"
  },
  "motivation": "one powerful motivating sentence personalized to their goal",
  "warnings": []
}`
}
// ─── OLLAMA ───────────────────────────────────────────────────────────────────
async function callOllama(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 1024 },
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${await res.text()}`)
  const data = await res.json()
  return data.response as string
}

// ─── GROQ ─────────────────────────────────────────────────────────────────────
async function callGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content as string
}

// ─── CLAUDE ───────────────────────────────────────────────────────────────────
async function callClaude(prompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

// ─── JSON EXTRACTOR ───────────────────────────────────────────────────────────
function extractJSON(text: string): string {
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found in responses')
  return clean.slice(start, end + 1)
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const measurements: Measurements = body.measurements
    const results: FitnessResults = calculateResults(measurements)
    const prompt = buildPrompt(measurements, results)

    console.log(`[BodyFitAI] Provider: ${PROVIDER}`)

    let rawText: string
    if (PROVIDER === 'groq')   rawText = await callGroq(prompt)
    else if (PROVIDER === 'claude') rawText = await callClaude(prompt)
    else rawText = await callOllama(prompt)

    const aiInsights = JSON.parse(extractJSON(rawText))
    return NextResponse.json({ results, aiInsights })

  } catch (error) {
    console.error('Analysis error:', error)
    const msgs: Record<string, string> = {
      ollama: 'Ollama not responding. Run "ollama serve" in a terminal.',
      groq:   'Groq API failed. Check your GROQ_API_KEY.',
      claude: 'Claude API failed. Check your ANTHROPIC_API_KEY.',
    }
    return NextResponse.json({ error: msgs[PROVIDER] || 'Analysis failed.' }, { status: 500 })
  }
}