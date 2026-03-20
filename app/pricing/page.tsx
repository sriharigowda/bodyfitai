'use client'
import React, { useState } from 'react'
import UpgradeModal from '@/components/UpgradeModal'

const PACKS = [
  {
    id: 'pack10', credits: 10, price: 29,
    label: 'Starter', perAnalysis: '₹2.9 per analysis',
    features: ['10 AI analyses', 'Full weekly diet plan', 'PDF report download', 'Body fat + FFMI + lean mass', 'Never expires'],
    popular: false,
  },
  {
    id: 'pack25', credits: 25, price: 59,
    label: 'Popular', perAnalysis: '₹2.4 per analysis',
    features: ['25 AI analyses', 'Full weekly diet plan', 'PDF report download', 'Body fat + FFMI + lean mass', 'Never expires'],
    popular: true,
  },
  {
    id: 'pack50', credits: 50, price: 99,
    label: 'Best value', perAnalysis: '₹2.0 per analysis',
    features: ['50 AI analyses', 'Full weekly diet plan', 'PDF report download', 'Body fat + FFMI + lean mass', 'Never expires'],
    popular: false,
  },
]

export default function PricingPage() {
  const [showModal,    setShowModal]    = useState(false)
  const [upgradePack,  setUpgradePack]  = useState('pack25')
  const [userIp,       setUserIp]       = useState('anonymous')

  // Fetch real IP on load
  React.useEffect(() => {
    fetch('/api/usage').then(r=>r.json()).then(d=>{ if(d.identifier) setUserIp(d.identifier) }).catch(()=>{})
  }, [])

  function handleSelect(packId: string) {
    setUpgradePack(packId)
    setShowModal(true)
  }

  return (
      <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#f0f0f0' }}>
        <nav style={{ background:'#111', borderBottom:'0.5px solid #1e1e1e', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <a href="/" style={{ fontSize:18, fontWeight:500, textDecoration:'none' }}>
            <span style={{ color:'#f0f0f0' }}>Body</span><span style={{ color:'#f0f0f0' }}>Fit</span><span style={{ color:'#e8ff47' }}>AI</span>
          </a>
          <a href="/" style={{ fontSize:13, color:'#888', textDecoration:'none' }}>Back to app</a>
        </nav>

        <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 20px' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ display:'inline-block', background:'rgba(232,255,71,0.1)', border:'0.5px solid rgba(232,255,71,0.3)', borderRadius:20, padding:'4px 14px', fontSize:12, color:'#e8ff47', fontWeight:500, marginBottom:16, letterSpacing:'0.04em' }}>
              BUY CREDITS
            </div>
            <h1 style={{ fontSize:36, fontWeight:500, lineHeight:1.2, marginBottom:12, letterSpacing:'-0.5px' }}>
              Pay once. Use anytime.
            </h1>
            <p style={{ fontSize:15, color:'#888', maxWidth:420, margin:'0 auto 8px' }}>
              No subscriptions. No expiry. Buy a pack of analyses and use them whenever you want.
            </p>
            <p style={{ fontSize:13, color:'#666' }}>Every new user gets 1 free analysis to start.</p>
          </div>

          {/* Free tier banner */}
          <div style={{ background:'#1a1a1a', border:'0.5px solid #2a2a2a', borderRadius:14, padding:'16px 20px', marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Free tier — always available</div>
              <div style={{ fontSize:13, color:'#888' }}>1 free analysis · Basic results · No payment needed</div>
            </div>
            <a href="/" style={{ background:'transparent', border:'0.5px solid #444', borderRadius:8, padding:'8px 20px', fontSize:13, color:'#888', textDecoration:'none' }}>
              Try free first
            </a>
          </div>

          {/* Credit packs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16, marginBottom:48 }}>
            {PACKS.map(pack => (
                <div key={pack.id} style={{
                  background:'#111', borderRadius:16, overflow:'hidden',
                  border: pack.popular ? '1.5px solid #e8ff47' : '0.5px solid #1e1e1e',
                }}>
                  {pack.popular && (
                      <div style={{ background:'#e8ff47', padding:'6px 0', textAlign:'center', fontSize:11, fontWeight:500, color:'#0a0a0a', letterSpacing:'0.06em' }}>
                        BEST VALUE
                      </div>
                  )}
                  <div style={{ padding:'24px 20px' }}>
                    <div style={{ fontSize:13, color:'#666', marginBottom:4 }}>{pack.label}</div>
                    <div style={{ fontSize:32, fontWeight:500, color: pack.popular ? '#e8ff47' : '#f0f0f0', marginBottom:2 }}>
                      ₹{pack.price}
                    </div>
                    <div style={{ fontSize:12, color:'#666', marginBottom:20 }}>{pack.perAnalysis}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                      {pack.features.map((f, i) => (
                          <div key={i} style={{ display:'flex', gap:10, alignItems:'center', fontSize:13 }}>
                            <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, background:'rgba(93,202,165,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#5DCAA5' }}>✓</div>
                            <span style={{ color:'#ccc' }}>{f}</span>
                          </div>
                      ))}
                    </div>
                    <button onClick={() => handleSelect(pack.id)} style={{
                      width:'100%', borderRadius:10, padding:'12px 0', fontSize:14, fontWeight:500,
                      cursor:'pointer',
                      background: pack.popular ? '#e8ff47' : 'transparent',
                      color:      pack.popular ? '#0a0a0a' : '#888',
                      border:     pack.popular ? 'none' : '0.5px solid #2a2a2a',
                    }}>
                      Buy {pack.credits} analyses
                    </button>
                  </div>
                </div>
            ))}
          </div>

          {/* FAQ */}
          <div style={{ maxWidth:560, margin:'0 auto' }}>
            <h2 style={{ fontSize:20, fontWeight:500, marginBottom:24, textAlign:'center' }}>Common questions</h2>
            {[
              { q:'Do credits expire?',               a:'No. Credits never expire. Buy once and use them at your own pace.' },
              { q:'What payment methods are accepted?', a:'UPI, credit/debit cards, net banking, and all major wallets via Razorpay.' },
              { q:'What does one analysis include?',   a:'Full body fat %, lean mass, FFMI, calorie targets, macro split, 7-day diet plan, and PDF report.' },
              { q:'Can I buy more credits later?',     a:'Yes. You can buy any pack at any time and credits will be added to your balance.' },
              { q:'Is my data safe?',                  a:'We never store your body measurements. Only your credit balance is stored.' },
            ].map((faq, i) => (
                <div key={i} style={{ borderBottom:'0.5px solid #1e1e1e', padding:'16px 0' }}>
                  <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>{faq.q}</div>
                  <div style={{ fontSize:13, color:'#666', lineHeight:1.6 }}>{faq.a}</div>
                </div>
            ))}
          </div>
        </div>

        {showModal && (
            <UpgradeModal
                onClose={() => setShowModal(false)}
                identifier={userIp}
                onSuccess={() => { window.location.href = '/' }}
            />
        )}
      </div>
  )
}