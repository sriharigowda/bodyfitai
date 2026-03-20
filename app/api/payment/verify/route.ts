import { NextRequest, NextResponse } from 'next/server'
import { getIdentifier } from '@/lib/identifier'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { addCredits, CREDIT_PACKS } from '@/lib/usage'

export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, pack } = await req.json()
        const identifier = getIdentifier(req)  // always use server-side IP

        // Verify signature
        const body        = razorpay_order_id + '|' + razorpay_payment_id
        const expectedSig = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest('hex')

        if (expectedSig !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
        }

        const packData = CREDIT_PACKS[pack]
        if (!packData) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

        // Add credits to user
        const newBalance = await addCredits(identifier, packData.credits)

        // Log transaction
        await supabaseAdmin.from('credit_transactions').insert({
            identifier,
            pack,
            credits:      packData.credits,
            amount_paise: packData.amount,
            payment_id:   razorpay_payment_id,
        })

        return NextResponse.json({ success: true, credits: newBalance, added: packData.credits })
    } catch (error) {
        console.error('Payment verify error:', error)
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
    }
}