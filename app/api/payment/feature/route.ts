export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import crypto from 'crypto'

const PRICES: Record<string, number> = {
  meal_plan:    500,   // ₹5
  workout_plan: 500,   // ₹5
  ai_insights:  500,   // ₹5
  bundle:       1000,  // ₹10
}

const NAMES: Record<string, string> = {
  meal_plan:    'Detailed Meal Plan',
  workout_plan: 'Workout Plan',
  ai_insights:  'Full AI Insights',
  bundle:       'All 3 Features Bundle',
}

export async function POST(req: NextRequest) {
  try {
    const { feature } = await req.json()
    if (!PRICES[feature]) return NextResponse.json({ error: 'Invalid feature' }, { status: 400 })

    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const order = await razorpay.orders.create({
      amount:   PRICES[feature],
      currency: 'INR',
      receipt:  `feat_${feature}_${Date.now()}`,
      notes:    { feature, name: NAMES[feature] },
    })

    return NextResponse.json({
      orderId: order.id,
      amount:  order.amount,
      key:     process.env.RAZORPAY_KEY_ID,
      name:    NAMES[feature],
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Feature payment error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}