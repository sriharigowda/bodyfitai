import { NextRequest, NextResponse } from 'next/server'
import { canAnalyze, getCredits, FREE_LIMIT, getUsage } from '@/lib/usage'
import { getIdentifier } from '@/lib/identifier'

export async function GET(req: NextRequest) {
  try {
    const ip = getIdentifier(req)

    const status  = await canAnalyze(ip)
    const credits = await getCredits(ip)
    const used    = await getUsage(ip)

    return NextResponse.json({
      identifier: ip,          // ← send real IP back to frontend
      freeLeft:   Math.max(0, FREE_LIMIT - used),
      credits,
      isPro:      status.isPro,
      allowed:    status.allowed,
    })
  } catch {
    return NextResponse.json({
      identifier: 'anonymous',
      freeLeft:   FREE_LIMIT,
      credits:    0,
      isPro:      false,
      allowed:    true,
    })
  }
}