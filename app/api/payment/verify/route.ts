export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      feature,  // new — for AI features
      pack,     // old — for credit packs (keep for backward compat)
    } = await req.json()

    // Verify Razorpay signature
    const body        = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // Handle AI feature payment (new)
    if (feature) {
      const FEATURE_PRICES: Record<string, number> = {
        meal_plan:    500,
        workout_plan: 500,
        ai_insights:  500,
        bundle:       1000,
      }

      if (!FEATURE_PRICES[feature]) {
        return NextResponse.json({ error: 'Invalid feature' }, { status: 400 })
      }

      // Log AI feature transaction
      await supabaseAdmin.from('ai_transactions').insert({
        feature,
        amount_inr:  FEATURE_PRICES[feature] / 100,
        payment_id:  razorpay_payment_id,
        order_id:    razorpay_order_id,
      }).catch(e => console.log('ai_transactions insert:', e.message))

      return NextResponse.json({ success: true, feature })
    }

    // Handle old credit pack payment (backward compat)
    if (pack) {
      await supabaseAdmin.from('credit_transactions').insert({
        pack,
        payment_id: razorpay_payment_id,
      }).catch(e => console.log('credit_transactions insert:', e.message))

      return NextResponse.json({ success: true, pack })
    }

    return NextResponse.json({ error: 'Missing feature or pack' }, { status: 400 })

  } catch (error) {
    console.error('Payment verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}