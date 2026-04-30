export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Measurements, calculateResults } from '@/lib/calculations'

// Pure formula-based analysis — no AI calls
// All AI features (meal plan, workout, insights) are paid separately

export async function POST(req: NextRequest) {
  try {
    const body                       = await req.json()
    const measurements: Measurements = body.measurements
    const results                    = calculateResults(measurements)

    return NextResponse.json({ results })

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Analysis error:', errMsg)
    return NextResponse.json({ error: `Analysis failed: ${errMsg}` }, { status: 500 })
  }
}