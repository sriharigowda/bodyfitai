export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, feature, pack } = await req.json()

    // Get user ID from header (passed from frontend)
    const userId = req.headers.get('x-user-id') || null

    // Verify Razorpay signature
    const body        = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const admin = getAdminClient()

    // Handle AI feature payment
    if (feature) {
      const FEATURE_PRICES: Record<string, number> = {
        meal_plan:    5,
        workout_plan: 5,
        ai_insights:  5,
        bundle:       10,
      }
      if (!FEATURE_PRICES[feature]) {
        return NextResponse.json({ error: 'Invalid feature' }, { status: 400 })
      }

      // Save transaction with user_id — plan_data will be updated after generation
      try {
        await admin.from('ai_transactions').insert({
          user_id:    userId,
          feature,
          amount_inr: FEATURE_PRICES[feature],
          payment_id: razorpay_payment_id,
          order_id:   razorpay_order_id,
        })
      } catch (e) {
        console.log('ai_transactions insert error:', e)
      }

      return NextResponse.json({ success: true, feature })
    }

    // Handle old credit pack (backward compat)
    if (pack) {
      try {
        await admin.from('credit_transactions').insert({
          pack,
          payment_id: razorpay_payment_id,
        })
      } catch (e) {
        console.log('credit_transactions insert error:', e)
      }
      return NextResponse.json({ success: true, pack })
    }

    return NextResponse.json({ error: 'Missing feature or pack' }, { status: 400 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Payment verify error:', msg)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}