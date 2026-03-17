import { NextRequest, NextResponse } from 'next/server'
import { jsonrepair } from 'jsonrepair'
import { Measurements, FitnessResults, calculateResults } from '@/lib/calculations'

const PROVIDER     = (process.env.AI_PROVIDER || 'groq') as 'ollama' | 'groq' | 'claude'
const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'

// ─── PROMPT 1: Body analysis ──────────────────────────────────────────────────
// Kept small and focused — no weekly plan here
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
// Separate smaller call just for the diet plan
function buildDietPrompt(m: Measurements, r: FitnessResults): string {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const nonVeg = m.diet.nonVegDays
  const dayTypes = days.map(d => {
    if (m.diet.type === 'Vegetarian') return `${d}:veg`
    if (m.diet.type === 'Non-vegetarian') return `${d}:non-veg`
    return `${d}:${nonVeg.includes(d) ? 'non-veg' : 'veg'}`
  }).join(', ')

  return `You are a nutritionist. Respond with a JSON object only. No markdown, no text outside the JSON.

Create a 7-day meal plan for ${m.name}: ${r.dailyCalories} kcal/day, ${r.protein}g protein, ${r.carbs}g carbs, ${r.fat}g fat.
Diet schedule: ${dayTypes}
Indian food preferred. Keep meal descriptions SHORT (max 10 words each).

Return this exact JSON structure (replace the placeholder text):
{"Monday":{"type":"veg","breakfast":"food name ~Xkcal Xg protein","lunch":"food name ~Xkcal Xg protein","dinner":"food name ~Xkcal Xg protein","snack":"food name ~Xkcal"},"Tuesday":{"type":"non-veg","breakfast":"...","lunch":"...","dinner":"...","snack":"..."},"Wednesday":{"type":"veg","breakfast":"...","lunch":"...","dinner":"...","snack":"..."},"Thursday":{"type":"non-veg","breakfast":"...","lunch":"...","dinner":"...","snack":"..."},"Friday":{"type":"veg","breakfast":"...","lunch":"...","dinner":"...","snack":"..."},"Saturday":{"type":"non-veg","breakfast":"...","lunch":"...","dinner":"...","snack":"..."},"Sunday":{"type":"non-veg","breakfast":"...","lunch":"...","dinner":"...","snack":"..."}}`
}

// ─── API CALLERS ──────────────────────────────────────────────────────────────
async function callGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a fitness expert. Always respond with valid JSON only. Never include markdown, code blocks, or any text outside the JSON object.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${await res.text()}`)
  return (await res.json()).choices[0].message.content as string
}

async function callOllama(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: `Respond with valid JSON only, no markdown.\n\n${prompt}`,
      stream: false,
      format: 'json',
      options: { temperature: 0.3, num_predict: 1500 },
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${await res.text()}`)
  return (await res.json()).response as string
}

async function callClaude(prompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

async function callAI(prompt: string): Promise<string> {
  if (PROVIDER === 'groq')   return callGroq(prompt)
  if (PROVIDER === 'claude') return callClaude(prompt)
  return callOllama(prompt)
}

// ─── JSON EXTRACTOR ───────────────────────────────────────────────────────────
function extractJSON(text: string): string {
  // Strip markdown fences
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Extract from first { to last }
  const start = clean.indexOf('{')
  const end   = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found in response')
  clean = clean.slice(start, end + 1)
  // Use jsonrepair to fix any structural issues the model introduced
  return jsonrepair(clean)
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body         = await req.json()
    const measurements: Measurements = body.measurements
    const results: FitnessResults    = calculateResults(measurements)

    console.log(`[BodyFitAI] Provider: ${PROVIDER}`)

    // Two parallel API calls — analysis + diet plan
    const [analysisText, dietText] = await Promise.all([
      callAI(buildAnalysisPrompt(measurements, results)),
      callAI(buildDietPrompt(measurements, results)),
    ])

    console.log('[BodyFitAI] Parsing analysis...')
    const analysis  = JSON.parse(extractJSON(analysisText))
    console.log('[BodyFitAI] Parsing diet plan...')
    const weeklyDietPlan = JSON.parse(extractJSON(dietText))
    console.log('[BodyFitAI] Both parsed OK')

    const aiInsights = { ...analysis, weeklyDietPlan }

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