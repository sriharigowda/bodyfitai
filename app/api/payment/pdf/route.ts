export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST(req: NextRequest) {
    try {
        const razorpay = new Razorpay({
            key_id:     process.env.RAZORPAY_KEY_ID || '',
            key_secret: process.env.RAZORPAY_KEY_SECRET || '',
        })

        const order = await razorpay.orders.create({
            amount:   1000,  // ₹10 in paise
            currency: 'INR',
            notes:    { type: 'pdf_download' },
        })

        return NextResponse.json({
            orderId:  order.id,
            amount:   1000,
            currency: 'INR',
            name:     'BodyFitAI PDF Report',
            keyId:    process.env.RAZORPAY_KEY_ID,
        })
    } catch (error) {
        console.error('PDF payment error:', error)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }
}