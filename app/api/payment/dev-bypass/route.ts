import { NextRequest, NextResponse } from 'next/server'
import { addCredits, CREDIT_PACKS } from '@/lib/usage'
import { getIdentifier } from '@/lib/identifier'

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }
    try {
        const { pack } = await req.json()
        const ip = getIdentifier(req)  // use real IP, not frontend-sent identifier
        const packData = CREDIT_PACKS[pack]
        if (!packData) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })
        console.log('[DEV] Adding', packData.credits, 'credits for:', ip)
        const newBalance = await addCredits(ip, packData.credits)
        console.log('[DEV] New balance:', newBalance)
        return NextResponse.json({ success: true, credits: newBalance, added: packData.credits })
    } catch {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}