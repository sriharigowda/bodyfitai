import { NextRequest, NextResponse } from 'next/server'
import { Measurements, FitnessResults, calculateResults } from '@/lib/calculations'

const PROVIDER     = (process.env.AI_PROVIDER || 'groq') as 'ollama' | 'groq' | 'claude'
const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'

function buildAnalysisPrompt(m: Measurements, r: FitnessResults): string {
  return `You are a fitness coach. Return JSON only.\nUser: ${m.name}, ${m.age}y, ${m.gender}, ${m.height}cm, ${m.weight}kg, Goal: ${m.goal}\nCurrent: BF ${r.bodyFatPercent}% (${r.bodyFatCategory}), Lean ${r.leanMass}kg, FFMI ${r.ffmi}\nTarget: ${m.targetWeight}kg, BF ${r.target.targetBodyFat}%, Lean ${r.target.targetLeanMass}kg, FFMI ${r.target.targetFFMI}\nCalories: ${r.dailyCalories} kcal, P${r.protein}g C${r.carbs}g F${r.fat}g\nReturn exactly: {"greeting":"hi name 1 sentence","summary":"2 sentences","currentAnalysis":{"bodyFatExplanation":"2 sentences","leanMassExplanation":"2 sentences","ffmiExplanation":"2 sentences","bodyComposition":"1 sentence"},"targetAnalysis":{"bodyFatExplanation":"2 sentences","leanMassExplanation":"2 sentences","ffmiExplanation":"2 sentences","targetBodyMeasurements":"1 sentence"},"nutritionTips":["tip1","tip2","tip3"],"workoutRecommendation":"2 sentences","duration":{"weeks":${r.weeksToGoal},"months":"${Math.round(r.weeksToGoal/4.3)} months","milestone4weeks":"1 sentence","milestone8weeks":"1 sentence","milestoneGoal":"1 sentence"},"motivation":"1 sentence","warnings":[]}`
}

function buildDietPrompt(m: Measurements, r: FitnessResults): string {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const dayTypes = days.map(d => {
    if (m.diet.type === 'Vegetarian') return `${d}:veg`
    if (m.diet.type === 'Non-vegetarian') return `${d}:non-veg`
    return `${d}:${m.diet.nonVegDays.includes(d)?'non-veg':'veg'}`
  }).join(', ')
  return `You are a nutritionist. Return JSON only.\nMeal plan for ${m.name}: ${r.dailyCalories}kcal, P${r.protein}g C${r.carbs}g F${r.fat}g. Indian food. SHORT descriptions max 8 words.\nDays: ${dayTypes}\nReturn: {"Monday":{"type":"veg","breakfast":"short meal ~Xkcal","lunch":"short meal ~Xkcal","dinner":"short meal ~Xkcal","snack":"short snack"},"Tuesday":{"type":"non-veg","breakfast":"","lunch":"","dinner":"","snack":""},"Wednesday":{"type":"veg","breakfast":"","lunch":"","dinner":"","snack":""},"Thursday":{"type":"non-veg","breakfast":"","lunch":"","dinner":"","snack":""},"Friday":{"type":"veg","breakfast":"","lunch":"","dinner":"","snack":""},"Saturday":{"type":"non-veg","breakfast":"","lunch":"","dinner":"","snack":""},"Sunday":{"type":"non-veg","breakfast":"","lunch":"","dinner":"","snack":""}}`
}

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'Return valid JSON only. No markdown. No text outside JSON.' },
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
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: 'json', options: { temperature: 0.3, num_predict: 1500 } }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${await res.text()}`)
  return (await res.json()).response as string
}

async function callClaude(prompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const message = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

async function callAI(prompt: string): Promise<string> {
  if (PROVIDER === 'groq')   return callGroq(prompt)
  if (PROVIDER === 'claude') return callClaude(prompt)
  return callOllama(prompt)
}

function safeParseJSON(text: string): unknown {
  let clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim()
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('No JSON in response')
  clean = clean.slice(s, e + 1)
  // Remove all control characters except standard whitespace
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // Fix unescaped newlines/tabs inside strings
  clean = clean.replace(/"((?:[^"\\]|\\.)*)"/gs, (_: string, inner: string) =>
    '"' + inner.replace(/\n/g,' ').replace(/\r/g,' ').replace(/\t/g,' ') + '"'
  )
  try {
    return JSON.parse(clean)
  } catch {
    // Last resort: try to fix trailing commas and other minor issues
    clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
    return JSON.parse(clean)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const measurements: Measurements = body.measurements
    const results: FitnessResults = calculateResults(measurements)

    console.log(`[BodyFitAI] Provider: ${PROVIDER}`)

    const [analysisText, dietText] = await Promise.all([
      callAI(buildAnalysisPrompt(measurements, results)),
      callAI(buildDietPrompt(measurements, results)),
    ])

    console.log('[BodyFitAI] analysisText length:', analysisText.length)
    console.log('[BodyFitAI] dietText length:', dietText.length)

    const analysis      = safeParseJSON(analysisText) as Record<string, unknown>
    const weeklyDietPlan = safeParseJSON(dietText)
    const aiInsights    = { ...analysis, weeklyDietPlan }

    console.log('[BodyFitAI] Parse OK')
    return NextResponse.json({ results, aiInsights })
  } catch (error) {
    console.error('Analysis error:', error)
    const msgs: Record<string, string> = {
      ollama: 'Ollama not responding. Run "ollama serve".',
      groq:   'Groq API failed. Check GROQ_API_KEY.',
      claude: 'Claude API failed. Check ANTHROPIC_API_KEY.',
    }
    return NextResponse.json({ error: msgs[PROVIDER] || 'Analysis failed.' }, { status: 500 })
  }
}