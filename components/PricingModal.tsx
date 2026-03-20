'use client'
import { useState } from 'react'

interface Props {
  onClose: () => void
  onSuccess: (plan: string) => void
  reason?: 'limit' | 'feature'
  feature?: string
}

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: 4,
    color: 'var(--accent)',
    features: [
      'Unlimited AI analyses',
      'Full weekly diet plan',
      'PDF report download',
      'Progress tracking',
      'Before/after comparison',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 9,
    color: '#85B7EB',
    features: [
      'Everything in Pro',
      'Custom meal plans with recipes',
      'Workout plan generation',
      'Up to 5 profiles',
      'Priority support',
    ],
  },
]

export default function PricingModal({ onClose, onSuccess, reason, feature }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handlePayment(planId: string, amount: number, planName: string) {
    setLoading(planId)
    setError('')

    try {
      // Load Razorpay script
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Razorpay'))
          document.head.appendChild(script)
        })
      }

      // Create order
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const { orderId, error: orderError } = await res.json()
      if (orderError) throw new Error(orderError)

      // Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: 'INR',
        name: 'BodyFitAI',
        description: `${planName} Plan — 1 Month`,
        order_id: orderId,
        prefill: {},
        theme: { color: '#e8ff47' },
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                plan: planId,
              }),
            })
            const { success, error: verifyError } = await verifyRes.json()
            if (!success) throw new Error(verifyError)
            onSuccess(planId)
          } catch (e) {
            setError('Payment verification failed. Contact support.')
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      })
      rzp.open()
    } catch (e) {
      setError((e as Error).message)
      setLoading(null)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {reason === 'limit' && (
              <div style={{ background: 'rgba(226,75,74,0.12)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#f09595' }}>
                You have used all 3 free analyses this month
              </div>
            )}
            {reason === 'feature' && (
              <div style={{ background: 'rgba(232,255,71,0.08)', border: '0.5px solid rgba(232,255,71,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: 'var(--accent)' }}>
                {feature} is a Pro feature
              </div>
            )}
            <h2 style={{ fontSize: 20, fontWeight: 500, color: '#f0f0f0', marginBottom: 4 }}>Upgrade your plan</h2>
            <p style={{ fontSize: 13, color: '#888' }}>Get unlimited analyses, diet plans, PDF reports and more</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer', padding: '0 0 0 16px' }}>✕</button>
        </div>

        {/* Plans */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ background: '#1a1a1a', border: `0.5px solid ${plan.id === 'pro' ? 'rgba(232,255,71,0.4)' : '#2a2a2a'}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#f0f0f0' }}>{plan.name}</div>
                  {plan.id === 'pro' && <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.04em' }}>MOST POPULAR</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 500, color: plan.color }}>₹{plan.price}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>per month</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: 12, color: '#aaa' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(232,255,71,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--accent)', flexShrink: 0 }}>✓</div>
                    {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => handlePayment(plan.id, plan.price, plan.name)}
                disabled={loading !== null}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: plan.id === 'pro' ? 'var(--accent)' : '#2a2a2a',
                  color: plan.id === 'pro' ? '#0a0a0a' : '#f0f0f0',
                  fontSize: 14, fontWeight: 500, opacity: loading && loading !== plan.id ? 0.5 : 1,
                }}
              >
                {loading === plan.id ? 'Processing...' : `Get ${plan.name} — ₹${plan.price}/mo`}
              </button>
            </div>
          ))}

          {error && <div style={{ fontSize: 13, color: '#f09595', textAlign: 'center', padding: '8px 0' }}>{error}</div>}

          <p style={{ fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 1.5 }}>
            Secure payment via Razorpay · UPI, Cards, Netbanking accepted · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}
