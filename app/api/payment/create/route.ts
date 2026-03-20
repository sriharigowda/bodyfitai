import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { CREDIT_PACKS } from '@/lib/usage'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const { pack } = await req.json()
    const packData = CREDIT_PACKS[pack]
    if (!packData) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

    const order = await razorpay.orders.create({
      amount:   packData.amount,
      currency: 'INR',
      notes:    { pack, credits: packData.credits.toString() },
    })

    return NextResponse.json({
      orderId:  order.id,
      amount:   packData.amount,
      currency: 'INR',
      name:     `BodyFitAI — ${packData.label}`,
      keyId:    process.env.RAZORPAY_KEY_ID,
      credits:  packData.credits,
    })
  } catch (error) {
    console.error('Payment create error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}