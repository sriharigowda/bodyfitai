export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { jsonrepair } from 'jsonrepair'

const USE_OPENAI   = !!process.env.OPENAI_API_KEY
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

function buildMealPlanPrompt(data: any): string {
  const { name, goal, dailyCalories, protein, carbs, fat, dietType, gymTime, gender } = data
  const gymHour = parseInt(gymTime?.split(':')[0] || '9')
  const wakeHour = Math.max(5, gymHour - 3)
  const preGymHour = gymHour - 1
  const postGymHour = gymHour + 2
  const lunchHour = postGymHour + 2
  const snackHour = lunchHour + 3
  const dinnerHour = snackHour + 3
  const bedHour = dinnerHour + 2

  const fmt = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`
  const isVeg = dietType === 'Vegetarian'
  const isFasting = ['Navratri fast','Ramadan','Ekadashi fast'].includes(dietType)

  const modeLabel = goal === 'Weight loss' ? 'Cut' : goal === 'Muscle gain' ? 'Bulk' : 'Recomp'

  return `You are an expert Indian fitness nutritionist. Return valid JSON only. No markdown, no text outside JSON.

Create a detailed time-based daily meal plan for:
Name: ${name}, Goal: ${goal} (${modeLabel}), Gender: ${gender}
Daily targets: ${dailyCalories} kcal, ${protein}g protein, ${carbs}g carbs, ${fat}g fat
Diet type: ${dietType}, Gym time: ${gymTime}

Schedule:
- Wake: ${fmt(wakeHour)}
- Pre-gym boost: ${fmt(preGymHour)} (1 hr before gym)
- Gym: ${gymTime}
- Post-workout: ${fmt(postGymHour)} (within 30 min after gym)
- Lunch: ${fmt(lunchHour)}
- Snack: ${fmt(snackHour)}
- Dinner: ${fmt(dinnerHour)}
- Before bed: ${fmt(bedHour)}

Return this exact JSON structure:
{
  "planTitle": "${name}'s ${modeLabel} Plan — ${gymTime} Gym",
  "mode": "${modeLabel}",
  "gymTime": "${gymTime}",
  "supplements": [
    {"name": "Creatine 5g", "timing": "post-gym shake", "icon": "⚡"},
    {"name": "Vit D3 + K2", "timing": "with lunch", "icon": "🌅"},
    {"name": "Ashwagandha KSM-66", "timing": "before bed", "icon": "🌿"},
    {"name": "Omega-3", "timing": "with dinner", "icon": "🐟"}
  ],
  "meals": [
    {
      "time": "${fmt(wakeHour)}",
      "title": "Pre-Workout Meal",
      "emoji": "⚡",
      "type": "pre_workout",
      "description": "Eat on waking — 3 hrs before gym",
      "protein": <number>,
      "carbs": <number>,
      "kcal": <number>,
      "items": [
        {"name": "<real Indian food>", "detail": "<amount and tip>", "batch": false},
        {"name": "<real Indian food>", "detail": "<amount and tip>", "batch": false}
      ]
    },
    {
      "time": "${fmt(preGymHour)}",
      "title": "Pre-Gym Boost",
      "emoji": "🍌",
      "type": "pre_gym",
      "description": "Fast carbs — 1 hour before gym",
      "protein": 0,
      "carbs": <number>,
      "kcal": <number>,
      "items": [
        {"name": "<fast carb food>", "detail": "<tip>", "batch": false}
      ]
    },
    {
      "time": "${gymTime}",
      "title": "GYM SESSION",
      "emoji": "🏋️",
      "type": "gym",
      "description": "Train hard · Progressive overload · 20 min cardio after",
      "protein": 0,
      "carbs": 0,
      "kcal": 0,
      "items": []
    },
    {
      "time": "${fmt(postGymHour)}",
      "title": "Post-Workout Recovery",
      "emoji": "💪",
      "type": "post_workout",
      "description": "Within 30 min — most important meal",
      "protein": <number>,
      "carbs": <number>,
      "kcal": <number>,
      "items": [
        {"name": "${isVeg ? 'Whey protein in 250ml milk' : 'Whey protein + Creatine in 250ml milk'}", "detail": "33g protein · Scoop 1", "batch": false},
        {"name": "${isVeg ? 'Paneer 100g or Greek yogurt' : '4-5 whole boiled eggs'}", "detail": "${isVeg ? '20g protein · from fridge' : '25g protein · batch cooked'}", "batch": true}
      ]
    },
    {
      "time": "${fmt(lunchHour)}",
      "title": "${isVeg ? 'Lunch — Dal + Rice + Sabji' : 'Lunch — Chicken + Rice + Dal'}",
      "emoji": "${isVeg ? '🥗' : '🍗'}",
      "type": "lunch",
      "description": "Biggest meal · Take Vit D3 here",
      "protein": <number>,
      "carbs": <number>,
      "kcal": <number>,
      "items": [
        {"name": "${isVeg ? '150g paneer or 1 cup dal' : '250g grilled chicken'}", "detail": "${isVeg ? 'from fridge · reheat 2 min' : 'from fridge · reheat 90 sec'}", "batch": true},
        {"name": "150g cooked rice + 1 tsp ghee", "detail": "${modeLabel} — 150g not 200g", "batch": false},
        {"name": "${isVeg ? '1 cup mixed sabji' : '1 cup dal'}", "detail": "from fridge · reheat 2 min", "batch": true},
        {"name": "Cucumber + tomato salad", "detail": "2 min to cut, no cooking", "batch": false},
        {"name": "💊 Vit D3 + K2 tablet", "detail": "take with this meal", "batch": false}
      ]
    },
    {
      "time": "${fmt(snackHour)}",
      "title": "${isVeg ? 'HP Oats + Dahi' : 'HP Oats + Dahi'}",
      "emoji": "🥣",
      "type": "snack",
      "description": "Zero cooking — 2 min microwave",
      "protein": <number>,
      "carbs": <number>,
      "kcal": <number>,
      "items": [
        {"name": "50g HP Oats + 250ml milk", "detail": "microwave 2 min → 21g protein", "batch": false},
        {"name": "100g thick dahi", "detail": "10g protein · open and eat", "batch": false},
        {"name": "15 almonds", "detail": "healthy fats", "batch": false}
      ]
    },
    {
      "time": "${fmt(dinnerHour)}",
      "title": "${isVeg ? 'Dinner — Dal + Roti' : 'Dinner — Chicken + Rice'}",
      "emoji": "${isVeg ? '🥗' : '🍗'}",
      "type": "dinner",
      "description": "${isVeg ? 'Light dinner · high protein' : 'Same as lunch · reheat only'}",
      "protein": <number>,
      "carbs": <number>,
      "kcal": <number>,
      "items": [
        {"name": "${isVeg ? '150g paneer or dal' : '250g grilled chicken'}", "detail": "${isVeg ? 'reheat 2 min' : 'reheat 90 sec'}", "batch": true},
        {"name": "${isVeg ? '2 whole wheat rotis' : '150g cooked rice + 1 tsp ghee'}", "detail": "", "batch": false},
        {"name": "Cucumber + tomato salad", "detail": "no cooking", "batch": false}
      ]
    },
    {
      "time": "${fmt(bedHour)}",
      "title": "Before Bed — Slow Protein",
      "emoji": "😴",
      "type": "bed",
      "description": "Casein feeds muscles 7-8 hrs overnight",
      "protein": <number>,
      "carbs": <number>,
      "kcal": <number>,
      "items": [
        {"name": "250ml warm full-fat milk", "detail": "microwave 1 min", "batch": false},
        {"name": "5-8 walnuts", "detail": "omega-3 overnight fats", "batch": false},
        {"name": "💊 Ashwagandha KSM-66", "detail": "2 tablets with milk · best timing", "batch": false}
      ]
    }
  ]
}

IMPORTANT:
- Replace ALL <number> with actual integer values based on the daily macro targets
- Make sure total kcal across all meals ≈ ${dailyCalories}
- Make sure total protein ≈ ${protein}g
- Use real Indian food names
- batch:true means it can be batch cooked on Sunday/Monday`
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert Indian nutritionist. Always respond with valid JSON only. No markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, max_tokens: 2500,
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
        { role: 'system', content: 'You are an expert Indian nutritionist. Always respond with valid JSON only. No markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, max_tokens: 2500,
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
    const prompt = buildMealPlanPrompt(body)
    const text   = USE_OPENAI ? await callOpenAI(prompt) : await callGroq(prompt)
    const plan   = JSON.parse(extractJSON(text))
    return NextResponse.json({ plan })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Meal plan error:', msg)
    return NextResponse.json({ error: `Meal plan failed: ${msg}` }, { status: 500 })
  }
}