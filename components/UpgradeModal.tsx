'use client'
import { useState } from 'react'

interface Props {
  onClose: () => void
  identifier: string
  onSuccess: (credits: number) => void
  freeLeft?: number
  currentCredits?: number
}

const PACKS = [
  { id: 'pack10', credits: 10, price: 29,  label: '10 analyses', perAnalysis: '₹2.9 each', popular: false },
  { id: 'pack25', credits: 25, price: 59,  label: '25 analyses', perAnalysis: '₹2.4 each', popular: true  },
  { id: 'pack50', credits: 50, price: 99,  label: '50 analyses', perAnalysis: '₹2.0 each', popular: false },
]

export default function UpgradeModal({ onClose, identifier, onSuccess, freeLeft = 0, currentCredits = 0 }: Props) {
  const [loading,      setLoading]      = useState(false)
  const [selectedPack, setSelectedPack] = useState('pack25')

  async function handlePayment() {
    setLoading(true)
    try {
      // Load Razorpay script
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script    = document.createElement('script')
          script.src      = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload   = () => resolve()
          script.onerror  = () => reject()
          document.head.appendChild(script)
        })
      }

      // Create order
      const res   = await fetch('/api/payment/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pack: selectedPack }),
      })
      const order = await res.json()
      if (order.error) throw new Error(order.error)

      // Open Razorpay
      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'BodyFitAI',
        description: order.name,
        order_id:    order.orderId,
        theme:       { color: '#e8ff47' },
        handler: async (response: any) => {
          const verify = await fetch('/api/payment/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              pack:                selectedPack,
              identifier,
            }),
          })
          const result = await verify.json()
          if (result.success) {
            onSuccess(result.credits)
            onClose()
          } else {
            alert('Payment verification failed. Please contact support.')
          }
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Payment error:', err)
      alert('Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selected = PACKS.find(p => p.id === selectedPack)!

  return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
        <div style={{ background:'#111', border:'0.5px solid #2a2a2a', borderRadius:16, padding:'28px 24px', maxWidth:400, width:'100%' }}>

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:11, color:'#e8ff47', fontWeight:500, letterSpacing:'0.06em', marginBottom:4 }}>BUY CREDITS</div>
              <h2 style={{ fontSize:20, fontWeight:500, color:'#f0f0f0', marginBottom:4 }}>
                {freeLeft === 0 && currentCredits === 0 ? 'Free analyses used up' : 'Get more analyses'}
              </h2>
              <p style={{ fontSize:13, color:'#888' }}>
                {currentCredits > 0
                    ? `You have ${currentCredits} credits left`
                    : 'Credits never expire — use them anytime'}
              </p>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', fontSize:22, cursor:'pointer', lineHeight:1, padding:0 }}>×</button>
          </div>

          {/* Pack selector */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
            {PACKS.map(pack => (
                <div key={pack.id} onClick={() => setSelectedPack(pack.id)} style={{
                  background:   selectedPack === pack.id ? 'rgba(232,255,71,0.08)' : '#1a1a1a',
                  border:       `0.5px solid ${selectedPack === pack.id ? '#e8ff47' : '#2a2a2a'}`,
                  borderRadius: 12, padding:'14px 16px', cursor:'pointer',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${selectedPack===pack.id?'#e8ff47':'#444'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {selectedPack === pack.id && <div style={{ width:8, height:8, borderRadius:'50%', background:'#e8ff47' }}/>}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:'#f0f0f0', display:'flex', alignItems:'center', gap:8 }}>
                        {pack.label}
                        {pack.popular && <span style={{ fontSize:9, background:'rgba(232,255,71,0.15)', color:'#e8ff47', padding:'2px 6px', borderRadius:8, fontWeight:500 }}>BEST VALUE</span>}
                      </div>
                      <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{pack.perAnalysis}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18, fontWeight:500, color:'#e8ff47' }}>₹{pack.price}</div>
                  </div>
                </div>
            ))}
          </div>

          {/* Dev bypass — only shown in development */}
          {process.env.NODE_ENV !== 'production' && (
              <button onClick={async () => {
                setLoading(true)
                try {
                  const res = await fetch('/api/payment/dev-bypass', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pack: selectedPack, identifier }),
                  })
                  const result = await res.json()
                  if (result.success) { onSuccess(result.credits); onClose() }
                } catch { alert('Dev bypass failed') }
                finally { setLoading(false) }
              }} style={{
                width:'100%', background:'#1a2a1a', border:'0.5px solid #2a4a2a',
                borderRadius:10, padding:'10px 0', fontSize:13, color:'#5DCAA5',
                cursor:'pointer', marginBottom:8,
              }}>
                [DEV] Add {PACKS.find(p=>p.id===selectedPack)?.credits} credits without payment
              </button>
          )}

          {/* Pay button */}
          <button onClick={handlePayment} disabled={loading} style={{
            width:'100%', background:'#e8ff47', border:'none', borderRadius:10,
            padding:'13px 0', fontSize:15, fontWeight:500, color:'#0a0a0a',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            marginBottom:10,
          }}>
            {loading ? 'Processing...' : `Pay ₹${selected.price} for ${selected.credits} analyses`}
          </button>

          <p style={{ fontSize:11, color:'#555', textAlign:'center' }}>
            Secure payment via Razorpay · UPI, Cards, Net banking
          </p>
        </div>
      </div>
  )
}