'use client'
import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'

interface MealItem { name: string; detail: string }
interface Meal {
  time: string; title: string; emoji: string; type: string
  description: string; protein: number; carbs: number; fat: number; kcal: number
  items: MealItem[]
}
interface DayPlan { planType: string; planLabel: string; meals: Meal[] }
interface Supplement { name: string; timing: string; icon: string }

const G = {
  glass:  { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(255,255,255,0.88)', borderRadius:14, boxShadow:'0 2px 16px rgba(59,130,246,0.06)' },
  glassB: { background:'rgba(59,130,246,0.07)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(59,130,246,0.20)', borderRadius:14 },
  btn:    { background:'#3b82f6', border:'none', borderRadius:12, padding:'13px 0', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(59,130,246,0.28)', transition:'all 0.15s' } as const,
}

const TYPE_STYLES: Record<string, { border: string; timeBg: string; timeColor: string; timeBorder: string }> = {
  pre_workout:  { border:'3px solid #f59e0b', timeBg:'rgba(245,158,11,0.10)',  timeColor:'#d97706', timeBorder:'rgba(245,158,11,0.25)' },
  post_workout: { border:'3px solid #10b981', timeBg:'rgba(16,185,129,0.10)',  timeColor:'#059669', timeBorder:'rgba(16,185,129,0.25)' },
  gym:          { border:'3px solid #ef4444', timeBg:'rgba(239,68,68,0.10)',   timeColor:'#dc2626', timeBorder:'rgba(239,68,68,0.25)' },
  bed:          { border:'3px solid #8b5cf6', timeBg:'rgba(139,92,246,0.10)',  timeColor:'#7c3aed', timeBorder:'rgba(139,92,246,0.25)' },
  default:      { border:'none',              timeBg:'rgba(59,130,246,0.10)',  timeColor:'#3b82f6', timeBorder:'rgba(59,130,246,0.22)' },
}

const TAG_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pre_workout:  { bg:'rgba(245,158,11,0.12)', color:'#d97706', label:'PRE-WORKOUT' },
  post_workout: { bg:'rgba(16,185,129,0.12)', color:'#059669', label:'MOST IMPORTANT' },
  bed:          { bg:'rgba(139,92,246,0.12)', color:'#7c3aed', label:'BEFORE BED' },
}

const GYM_TIMES = ['5:00 AM','6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM']

function PayModal({ userId, onClose, onSuccess }: { userId: string; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    try {
      const res  = await fetch('/api/payment/feature', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'meal_plan', amount: 500 }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); setLoading(false); return }
      const Razorpay = (window as any).Razorpay
      if (!Razorpay) { alert('Payment not available'); setLoading(false); return }
      const rzp = new Razorpay({
        key: data.key, amount: data.amount, currency: 'INR',
        name: 'BodyFitAI', description: 'Detailed Meal Plan', order_id: data.orderId,
        handler: async (response: any) => {
          const verify = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ ...response, feature: 'meal_plan' }),
          })
          const vData = await verify.json()
          if (vData.success) {
            const paid = JSON.parse(localStorage.getItem('bodyfitai_paid_features') || '[]')
            paid.push('meal_plan')
            localStorage.setItem('bodyfitai_paid_features', JSON.stringify(Array.from(new Set(paid))))
            onSuccess()
          } else {
            alert('Payment verification failed. Please contact support.')
          }
          setLoading(false)
        },
        prefill: {}, theme: { color: '#3b82f6' },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch {
      alert('Payment failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'rgba(255,255,255,0.95)', borderRadius:20, padding:'28px 24px', maxWidth:380, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(59,130,246,0.15)' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🍽️</div>
        <div style={{ fontSize:20, fontWeight:600, color:'#1e293b', marginBottom:6 }}>Detailed Meal Plan</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 }}>
          <span style={{ fontSize:32, fontWeight:600, color:'#3b82f6' }}>₹5</span>
          <span style={{ fontSize:13, color:'#94a3b8' }}>one-time · instant access</span>
        </div>
        <div style={{ textAlign:'left', background:'rgba(59,130,246,0.05)', border:'0.5px solid rgba(59,130,246,0.15)', borderRadius:12, padding:14, marginBottom:20 }}>
          {['Time-based meals (6AM → 10PM)','Pre & post workout meals','Macros per meal','Supplement timing guide','Adjusts to your gym time','Free regeneration anytime'].map((item, i) => (
            <div key={i} style={{ fontSize:12, color:'#475569', marginBottom:i<5?6:0, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ color:'#10b981', fontWeight:600 }}>✓</span> {item}
            </div>
          ))}
        </div>
        <button onClick={handlePay} disabled={loading} style={{ ...G.btn, width:'100%', marginBottom:10, fontSize:15, opacity:loading?0.7:1 }}>
          {loading ? 'Processing...' : 'Pay ₹5 with Razorpay →'}
        </button>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:13, cursor:'pointer' }}>Cancel</button>
      </div>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async/>
    </div>
  )
}

export default function MealPlanPage() {
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [gymTime,      setGymTime]      = useState('9:00 AM')
  const [nonvegPlan,   setNonvegPlan]   = useState<DayPlan|null>(null)
  const [vegPlan,      setVegPlan]      = useState<DayPlan|null>(null)
  const [supplements,  setSupplements]  = useState<Supplement[]>([])
  const [activeTab,    setActiveTab]    = useState<'nonveg'|'veg'>('nonveg')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [generated,    setGenerated]    = useState(false)
  const [hasPaid,      setHasPaid]      = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [authChecked,  setAuthChecked]  = useState(false)
  const [userId,       setUserId]       = useState('')

  useEffect(() => {
    async function init() {
      const u = await getUser()
      if (!u) { window.location.href = '/'; return }
      setUserId(u.id)

      const paid = JSON.parse(localStorage.getItem('bodyfitai_paid_features') || '[]')
      setHasPaid(paid.includes('meal_plan') || paid.includes('bundle'))

      const stored = localStorage.getItem('bodyfitai_analysis')
      if (stored) {
        const data = JSON.parse(stored)
        setAnalysisData(data)
        const diet = data.measurements?.diet?.type || 'Non-vegetarian'
        setActiveTab(diet === 'Vegetarian' ? 'veg' : 'nonveg')
      }

      // ── Load saved plan from localStorage so it survives navigation ──
      const savedPlan = localStorage.getItem('bodyfitai_meal_plan')
      if (savedPlan) {
        try {
          const p = JSON.parse(savedPlan)
          if (p.nonvegPlan)   setNonvegPlan(p.nonvegPlan)
          if (p.vegPlan)      setVegPlan(p.vegPlan)
          if (p.supplements)  setSupplements(p.supplements)
          if (p.gymTime)      setGymTime(p.gymTime)
          setGenerated(true)
        } catch { localStorage.removeItem('bodyfitai_meal_plan') }
      }

      setAuthChecked(true)
    }
    init()
  }, [])

  const r          = analysisData?.results
  const m          = analysisData?.measurements
  const firstName  = m?.name?.split(' ')[0] || 'there'
  const dietType   = m?.diet?.type || 'Non-vegetarian'
  const isVegOnly  = dietType === 'Vegetarian'
  const isNvegOnly = dietType === 'Non-vegetarian'
  const hasBothPlans = !isVegOnly && !isNvegOnly
  const modeLabel  = m?.goal === 'Weight loss' ? 'Cut' : m?.goal === 'Muscle gain' ? 'Bulk' : 'Recomp'

  async function generatePlan() {
    if (!analysisData) return
    setLoading(true); setError('')
    try {
      const currentUser = await getUser()
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || userId },
        body: JSON.stringify({
          name:          m?.name     || 'User',
          goal:          m?.goal     || 'Recomp',
          dailyCalories: r?.dailyCalories || 2000,
          protein:       r?.protein  || 150,
          carbs:         r?.carbs    || 200,
          carbs:         r?.carbs    || 200,
          fat:           r?.fat      || 60,
          dietType,
          gymTime,
          gender:        m?.gender   || 'Male',
          weight:        m?.weight   || 70,
          leanMass:      r?.leanMass || 55,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }

      setNonvegPlan(data.nonvegPlan)
      setVegPlan(data.vegPlan)
      setSupplements(data.supplements || [])
      setGenerated(true)
      if (data.vegPlan && !data.nonvegPlan) setActiveTab('veg')
      else setActiveTab('nonveg')

      // ── Persist to localStorage so plan survives navigation ──
      localStorage.setItem('bodyfitai_meal_plan', JSON.stringify({
        nonvegPlan:  data.nonvegPlan,
        vegPlan:     data.vegPlan,
        supplements: data.supplements,
        gymTime,
      }))
    } catch {
      setError('Failed to generate plan. Please try again.')
    }
    setLoading(false)
  }

  const activePlan = activeTab === 'nonveg' ? nonvegPlan : vegPlan
  const totals = activePlan?.meals?.reduce((acc, meal) => ({
    protein: acc.protein + (meal.protein || 0),
    carbs:   acc.carbs   + (meal.carbs   || 0),
    kcal:    acc.kcal    + (meal.kcal    || 0),
  }), { protein:0, carbs:0, kcal:0 })

  if (!authChecked) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe,#f0f7ff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)', color:'#1e293b' }}>
      <div style={{ position:'fixed', top:-120, left:-120, width:400, height:400, background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }}/>
      <div style={{ position:'fixed', bottom:-80, right:-80, width:320, height:320, background:'radial-gradient(circle,rgba(99,179,246,0.08) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }}/>

      <nav style={{ background:'rgba(255,255,255,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'0.5px solid rgba(255,255,255,0.9)', padding:'13px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:10 }}>
        <a href="/" style={{ fontSize:18, fontWeight:500, color:'#1e293b', textDecoration:'none' }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></a>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <a href="/workout-plan" style={{ fontSize:12, color:'#3b82f6', textDecoration:'none', background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:20, padding:'5px 12px', fontWeight:500 }}>🏋️ Workout →</a>
          <a href="/progress" style={{ fontSize:12, color:'#64748b', textDecoration:'none', background:'rgba(255,255,255,0.60)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, padding:'5px 12px' }}>📊 Progress</a>
        </div>
      </nav>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'24px 16px 48px', position:'relative', zIndex:1 }}>

        {/* No analysis — landing page */}
        {!analysisData ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:64, marginBottom:20 }}>🍽️</div>
            <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.07em', marginBottom:12 }}>AI-POWERED</div>
            <h1 style={{ fontSize:28, fontWeight:500, color:'#1e293b', marginBottom:12, letterSpacing:'-0.3px' }}>Your Detailed Meal Plan</h1>
            <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, maxWidth:360, margin:'0 auto 32px' }}>
              Get a personalized time-based meal plan with exact gym timing, pre/post workout meals, macros per meal and supplement guide.
            </p>
            <div style={{ ...G.glass, padding:'20px 16px', marginBottom:24, textAlign:'left' }}>
              <div style={{ fontSize:12, color:'#3b82f6', fontWeight:600, letterSpacing:'0.06em', marginBottom:12 }}>WHAT YOU GET — ₹5</div>
              {[
                ['⏰', 'Time-based meals', '6AM → 10PM schedule based on your gym time'],
                ['💪', 'Pre & post workout meals', 'Optimized for performance and recovery'],
                ['📊', 'Macros per meal', 'Exact protein, carbs, fat per meal'],
                ['💊', 'Supplement guide', 'What to take and when'],
                ['🔄', 'Free regeneration', 'Adjust gym time and regenerate anytime'],
              ].map(([icon, title, desc], i) => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:i<4?12:0 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>{title}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...G.glassB, padding:'16px', marginBottom:20, borderRadius:12 }}>
              <div style={{ fontSize:13, color:'#3b82f6', fontWeight:500, marginBottom:4 }}>⚠️ Body analysis required first</div>
              <div style={{ fontSize:12, color:'#64748b' }}>Complete your body analysis to get a personalized meal plan based on your exact macros and goals.</div>
            </div>
            <a href="/" style={{ display:'inline-block', background:'#3b82f6', borderRadius:12, padding:'13px 32px', fontSize:14, fontWeight:600, color:'white', textDecoration:'none', boxShadow:'0 4px 16px rgba(59,130,246,0.28)' }}>
              Do body analysis first →
            </a>
          </div>

        ) : !hasPaid ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ ...G.glassB, padding:20, marginBottom:24, textAlign:'left' }}>
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.07em', marginBottom:6 }}>YOUR MEAL PLAN</div>
              <div style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:4 }}>{firstName}'s {modeLabel} Plan 🍽️</div>
              <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>{dietType} · {modeLabel} · Personalized by AI</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[
                  { label:'kcal/day', value:r?.dailyCalories?.toLocaleString() || '—', color:'#3b82f6' },
                  { label:'Protein',  value:`${r?.protein || '—'}g`,                   color:'#10b981' },
                  { label:'Carbs',    value:`${r?.carbs    || '—'}g`,                   color:'#f59e0b' },
                  { label:'Fats',     value:`${r?.fat      || '—'}g`,                   color:'#ef4444' },
                ].map(item => (
                  <div key={item.label} style={{ background:'rgba(255,255,255,0.60)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:500, color:item.color }}>{item.value}</div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...G.glass, padding:'28px 20px', marginBottom:16 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
              <div style={{ fontSize:18, fontWeight:600, color:'#1e293b', marginBottom:8 }}>Unlock your meal plan</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 }}>
                <span style={{ fontSize:36, fontWeight:600, color:'#3b82f6' }}>₹5</span>
                <span style={{ fontSize:13, color:'#94a3b8' }}>one-time · regenerate free</span>
              </div>
              <div style={{ textAlign:'left', background:'rgba(59,130,246,0.05)', border:'0.5px solid rgba(59,130,246,0.15)', borderRadius:12, padding:14, marginBottom:20 }}>
                {['Time-based meals based on your gym time','Pre & post workout meals optimized for you','Exact macros per meal','Supplement timing guide','Free regeneration anytime'].map((item, i, arr) => (
                  <div key={i} style={{ fontSize:12, color:'#475569', marginBottom:i<arr.length-1?6:0, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ color:'#10b981', fontWeight:600 }}>✓</span> {item}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowPayModal(true)} style={{ ...G.btn, width:'100%', fontSize:15 }}>
                Pay ₹5 — Get my meal plan →
              </button>
            </div>
          </div>

        ) : (
          <>
            <div style={{ ...G.glassB, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.07em', marginBottom:6 }}>YOUR MEAL PLAN</div>
              <div style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:4 }}>{firstName}'s {modeLabel} Plan 🍽️</div>
              <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>{dietType} · {modeLabel} · Generated by AI</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[
                  { label:'kcal/day', value:r?.dailyCalories?.toLocaleString() || '—', color:'#3b82f6' },
                  { label:'Protein',  value:`${r?.protein || '—'}g`,                   color:'#10b981' },
                  { label:'Carbs',    value:`${r?.carbs    || '—'}g`,                   color:'#f59e0b' },
                  { label:'Fats',     value:`${r?.fat      || '—'}g`,                   color:'#ef4444' },
                ].map(item => (
                  <div key={item.label} style={{ background:'rgba(255,255,255,0.60)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:500, color:item.color }}>{item.value}</div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gym time */}
            <div style={{ ...G.glass, padding:16, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>🏋️ Your gym time</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Meal timings adjust automatically</div>
              </div>
              <select value={gymTime} onChange={e => {
                setGymTime(e.target.value)
                setGenerated(false)
                setNonvegPlan(null)
                setVegPlan(null)
                localStorage.removeItem('bodyfitai_meal_plan')
              }}
                style={{ background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.25)', borderRadius:10, padding:'8px 14px', fontSize:13, color:'#3b82f6', fontWeight:500, outline:'none', cursor:'pointer' }}>
                {GYM_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {!generated && !loading && (
              <button onClick={generatePlan} style={{ ...G.btn, width:'100%', marginBottom:20, fontSize:15 }}>
                Generate my meal plan →
              </button>
            )}

            {loading && (
              <div style={{ ...G.glass, padding:'40px 24px', textAlign:'center', marginBottom:20 }}>
                <div style={{ width:44, height:44, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
                <div style={{ fontSize:15, fontWeight:500, color:'#1e293b', marginBottom:6 }}>Generating your meal plan...</div>
                <div style={{ fontSize:13, color:'#94a3b8' }}>Personalizing for your {gymTime} session</div>
              </div>
            )}

            {error && (
              <div style={{ background:'rgba(254,202,202,0.5)', border:'0.5px solid #fca5a5', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#dc2626' }}>
                {error}
                <button onClick={generatePlan} style={{ marginLeft:8, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>Try again</button>
              </div>
            )}

            {generated && (nonvegPlan || vegPlan) && (
              <>
                {hasBothPlans && (
                  <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                    {nonvegPlan && (
                      <button onClick={() => setActiveTab('nonveg')}
                        style={{ flex:1, padding:'11px 0', borderRadius:12, border:`0.5px solid ${activeTab==='nonveg'?'rgba(239,68,68,0.35)':'rgba(255,255,255,0.9)'}`, background:activeTab==='nonveg'?'rgba(239,68,68,0.08)':'rgba(255,255,255,0.60)', color:activeTab==='nonveg'?'#dc2626':'#64748b', fontSize:13, cursor:'pointer', fontWeight:activeTab==='nonveg'?600:400, transition:'all 0.2s' }}>
                        🍗 Non-Veg Day
                      </button>
                    )}
                    {vegPlan && (
                      <button onClick={() => setActiveTab('veg')}
                        style={{ flex:1, padding:'11px 0', borderRadius:12, border:`0.5px solid ${activeTab==='veg'?'rgba(16,185,129,0.35)':'rgba(255,255,255,0.9)'}`, background:activeTab==='veg'?'rgba(16,185,129,0.08)':'rgba(255,255,255,0.60)', color:activeTab==='veg'?'#10b981':'#64748b', fontSize:13, cursor:'pointer', fontWeight:activeTab==='veg'?600:400, transition:'all 0.2s' }}>
                        🌿 Veg Day
                      </button>
                    )}
                  </div>
                )}

                {!hasBothPlans && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:isVegOnly?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`0.5px solid ${isVegOnly?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`, borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:600, color:isVegOnly?'#10b981':'#dc2626', marginBottom:16 }}>
                    {isVegOnly ? '🌿 Vegetarian Plan' : '🍗 Non-Veg Plan'}
                  </div>
                )}

                {supplements.length > 0 && (
                  <div style={{ ...G.glass, padding:16, marginBottom:20 }}>
                    <div style={{ fontSize:12, color:'#3b82f6', fontWeight:600, letterSpacing:'0.06em', marginBottom:10 }}>💊 DAILY SUPPLEMENTS</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {supplements.map((s, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#475569' }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', flexShrink:0 }}/>
                          <span style={{ fontSize:15 }}>{s.icon}</span>
                          <strong style={{ color:'#1e293b' }}>{s.name}</strong>
                          <span style={{ color:'#94a3b8' }}>— {s.timing}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePlan && (
                  <>
                    <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase' as const, marginBottom:12 }}>
                      Today's meal timeline
                    </div>
                    {activePlan.meals.map((meal, i) => {
                      const style = TYPE_STYLES[meal.type] || TYPE_STYLES.default
                      const tag   = TAG_STYLES[meal.type]
                      const isGym = meal.type === 'gym'
                      return (
                        <div key={i} style={{ ...G.glass, overflow:'hidden', marginBottom:12, borderLeft:style.border }}>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', borderBottom: isGym||!meal.items?.length ? 'none' : '0.5px solid rgba(59,130,246,0.08)' }}>
                            <div style={{ background:style.timeBg, border:`0.5px solid ${style.timeBorder}`, borderRadius:8, padding:'4px 10px', fontSize:12, fontWeight:600, color:style.timeColor, whiteSpace:'nowrap' as const, flexShrink:0 }}>
                              {meal.time}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:14, fontWeight:500, color:'#1e293b', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' as const, marginBottom:2 }}>
                                {meal.emoji} {meal.title}
                                {tag && <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:10, background:tag.bg, color:tag.color }}>{tag.label}</span>}
                              </div>
                              <div style={{ fontSize:11, color:'#94a3b8' }}>{meal.description}</div>
                            </div>
                            {!isGym && meal.kcal > 0 && (
                              <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
                                <div style={{ textAlign:'center' }}><div style={{ fontSize:13, fontWeight:600, color:'#10b981' }}>{meal.protein}g</div><div style={{ fontSize:9, color:'#94a3b8' }}>P</div></div>
                                <div style={{ textAlign:'center' }}><div style={{ fontSize:13, fontWeight:600, color:'#f59e0b' }}>{meal.carbs}g</div><div style={{ fontSize:9, color:'#94a3b8' }}>C</div></div>
                                <div style={{ textAlign:'center' }}><div style={{ fontSize:13, fontWeight:600, color:'#3b82f6' }}>{meal.kcal}</div><div style={{ fontSize:9, color:'#94a3b8' }}>kcal</div></div>
                              </div>
                            )}
                          </div>
                          {!isGym && meal.items && meal.items.length > 0 && (
                            <div style={{ padding:'10px 16px' }}>
                              {meal.items.map((item, j) => (
                                <div key={j} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'6px 0', borderBottom: j < meal.items.length-1 ? '0.5px solid rgba(59,130,246,0.06)' : 'none', fontSize:13 }}>
                                  <div>
                                    <div style={{ fontWeight:500, color:'#1e293b' }}>{item.name}</div>
                                    {item.detail && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{item.detail}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <div style={{ ...G.glass, overflow:'hidden', marginTop:20 }}>
                      <div style={{ padding:'12px 16px', background:'rgba(59,130,246,0.05)', borderBottom:'0.5px solid rgba(59,130,246,0.08)', fontSize:12, fontWeight:600, color:'#3b82f6', letterSpacing:'0.05em' }}>📊 DAILY TOTALS</div>
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:320 }}>
                          <thead>
                            <tr style={{ background:'rgba(255,255,255,0.40)' }}>
                              <th style={{ padding:'8px 12px', fontSize:10, color:'#94a3b8', textAlign:'left', fontWeight:500 }}>Meal</th>
                              <th style={{ padding:'8px 12px', fontSize:10, color:'#94a3b8', textAlign:'center', fontWeight:500 }}>Protein</th>
                              <th style={{ padding:'8px 12px', fontSize:10, color:'#94a3b8', textAlign:'center', fontWeight:500 }}>Carbs</th>
                              <th style={{ padding:'8px 12px', fontSize:10, color:'#94a3b8', textAlign:'center', fontWeight:500 }}>kcal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activePlan.meals.filter(m => m.kcal > 0).map((meal, i) => (
                              <tr key={i} style={{ borderTop:'0.5px solid rgba(59,130,246,0.07)', background:i%2===0?'transparent':'rgba(255,255,255,0.30)' }}>
                                <td style={{ padding:'8px 12px', fontSize:12, color:'#475569' }}>{meal.time} {meal.emoji}</td>
                                <td style={{ padding:'8px 12px', fontSize:12, textAlign:'center', color:'#10b981', fontWeight:500 }}>{meal.protein}g</td>
                                <td style={{ padding:'8px 12px', fontSize:12, textAlign:'center', color:'#f59e0b', fontWeight:500 }}>{meal.carbs}g</td>
                                <td style={{ padding:'8px 12px', fontSize:12, textAlign:'center', color:'#3b82f6', fontWeight:500 }}>{meal.kcal}</td>
                              </tr>
                            ))}
                            <tr style={{ borderTop:'0.5px solid rgba(59,130,246,0.15)', background:'rgba(59,130,246,0.05)' }}>
                              <td style={{ padding:'9px 12px', fontSize:13, fontWeight:600, color:'#3b82f6' }}>TOTAL</td>
                              <td style={{ padding:'9px 12px', fontSize:13, textAlign:'center', fontWeight:600, color:'#10b981' }}>{totals?.protein}g</td>
                              <td style={{ padding:'9px 12px', fontSize:13, textAlign:'center', fontWeight:600, color:'#f59e0b' }}>{totals?.carbs}g</td>
                              <td style={{ padding:'9px 12px', fontSize:13, textAlign:'center', fontWeight:600, color:'#3b82f6' }}>{totals?.kcal}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <button onClick={() => {
                      localStorage.removeItem('bodyfitai_meal_plan')
                      setGenerated(false)
                      setNonvegPlan(null)
                      setVegPlan(null)
                      generatePlan()
                    }}
                      style={{ width:'100%', marginTop:16, background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:12, padding:'12px 0', color:'#3b82f6', fontSize:14, fontWeight:500, cursor:'pointer' }}>
                      🔄 Regenerate plan — free
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {showPayModal && <PayModal userId={userId} onClose={() => setShowPayModal(false)} onSuccess={() => { setShowPayModal(false); setHasPaid(true) }}/>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}