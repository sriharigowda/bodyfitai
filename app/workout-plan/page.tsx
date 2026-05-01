'use client'
import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'

interface Exercise { name: string; sets: number; reps: string; rest: string; muscle: string; tip: string; substitute: string }
interface WorkoutDay { day: string; name: string; emoji: string; color: string; focus: string; exercises: Exercise[]; cardio: string }
interface WorkoutPlan { planTitle: string; goal: string; days: WorkoutDay[]; notes: string[] }

const G = {
  glass:  { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(255,255,255,0.88)', borderRadius:14, boxShadow:'0 2px 16px rgba(59,130,246,0.06)' },
  glassB: { background:'rgba(59,130,246,0.07)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(59,130,246,0.20)', borderRadius:14 },
  btn:    { background:'#3b82f6', border:'none', borderRadius:12, padding:'13px 0', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(59,130,246,0.28)', transition:'all 0.15s' } as const,
}

function PayModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    try {
      const res  = await fetch('/api/payment/feature', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'workout_plan', amount: 500 }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); setLoading(false); return }
      const Razorpay = (window as any).Razorpay
      if (!Razorpay) { alert('Payment not available'); setLoading(false); return }
      const rzp = new Razorpay({
        key: data.key, amount: data.amount, currency: 'INR',
        name: 'BodyFitAI', description: 'Workout Plan', order_id: data.orderId,
        handler: async (response: any) => {
          const verify = await fetch('/api/payment/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, feature: 'workout_plan' }),
          })
          const vData = await verify.json()
          if (vData.success) {
            const paid = JSON.parse(localStorage.getItem('bodyfitai_paid_features') || '[]')
            paid.push('workout_plan')
            localStorage.setItem('bodyfitai_paid_features', JSON.stringify([...new Set(paid)]))
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
        <div style={{ fontSize:48, marginBottom:12 }}>🏋️</div>
        <div style={{ fontSize:20, fontWeight:600, color:'#1e293b', marginBottom:6 }}>Workout Plan</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 }}>
          <span style={{ fontSize:32, fontWeight:600, color:'#3b82f6' }}>₹5</span>
          <span style={{ fontSize:13, color:'#94a3b8' }}>one-time · regenerate free</span>
        </div>
        <div style={{ textAlign:'left', background:'rgba(59,130,246,0.05)', border:'0.5px solid rgba(59,130,246,0.15)', borderRadius:12, padding:14, marginBottom:20 }}>
          {['6-day PPL split (Push/Pull/Legs)','Sets × reps × rest time per exercise','Progressive overload tips','Exercise substitutions','Cardio recommendations','Personalized for your body composition'].map((item, i, arr) => (
            <div key={i} style={{ fontSize:12, color:'#475569', marginBottom:i<arr.length-1?6:0, display:'flex', alignItems:'center', gap:6 }}>
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

export default function WorkoutPlanPage() {
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [plan,         setPlan]         = useState<WorkoutPlan|null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [activeDay,    setActiveDay]    = useState(0)
  const [hasPaid,      setHasPaid]      = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [authChecked,  setAuthChecked]  = useState(false)

  useEffect(() => {
    async function init() {
      const u = await getUser()
      if (!u) { window.location.href = '/'; return }
      const paid = JSON.parse(localStorage.getItem('bodyfitai_paid_features') || '[]')
      setHasPaid(paid.includes('workout_plan') || paid.includes('bundle'))
      const stored = localStorage.getItem('bodyfitai_analysis')
      if (stored) setAnalysisData(JSON.parse(stored))
      setAuthChecked(true)
    }
    init()
  }, [])

  const m         = analysisData?.measurements
  const r         = analysisData?.results
  const firstName = m?.name?.split(' ')[0] || 'there'

  async function generatePlan() {
    if (!analysisData) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/workout-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     m?.name     || 'User',
          goal:     m?.goal     || 'Muscle gain',
          bodyFat:  r?.bodyFatPercent || 18,
          ffmi:     r?.ffmi     || 20,
          leanMass: r?.leanMass || 60,
          weight:   m?.weight   || 75,
          gender:   m?.gender   || 'Male',
          chest:    m?.chest    || 95,
          bicep:    m?.bicep    || 33,
          thigh:    m?.thigh    || 55,
          calf:     m?.calf     || 37,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setPlan(data.plan)
      setActiveDay(0)
    } catch {
      setError('Failed to generate workout plan. Please try again.')
    }
    setLoading(false)
  }

  const activeWorkout = plan?.days[activeDay]

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

      {/* Nav */}
      <nav style={{ background:'rgba(255,255,255,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'0.5px solid rgba(255,255,255,0.9)', padding:'13px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:10 }}>
        <a href="/" style={{ fontSize:18, fontWeight:500, color:'#1e293b', textDecoration:'none' }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></a>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <a href="/meal-plan" style={{ fontSize:12, color:'#3b82f6', textDecoration:'none', background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:20, padding:'5px 12px', fontWeight:500 }}>🍽️ Meal Plan →</a>
          <a href="/progress" style={{ fontSize:12, color:'#64748b', textDecoration:'none', background:'rgba(255,255,255,0.60)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, padding:'5px 12px' }}>📊 Progress</a>
        </div>
      </nav>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'24px 16px 48px', position:'relative', zIndex:1 }}>

        {/* No analysis — landing page */}
        {!analysisData ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:64, marginBottom:20 }}>🏋️</div>
            <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.07em', marginBottom:12 }}>AI-POWERED</div>
            <h1 style={{ fontSize:28, fontWeight:500, color:'#1e293b', marginBottom:12, letterSpacing:'-0.3px' }}>Your Workout Plan</h1>
            <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, maxWidth:360, margin:'0 auto 32px' }}>
              Get a personalized 6-day PPL workout split with sets, reps, rest times and progressive overload tips based on your body composition.
            </p>
            <div style={{ ...G.glass, padding:'20px 16px', marginBottom:24, textAlign:'left' }}>
              <div style={{ fontSize:12, color:'#3b82f6', fontWeight:600, letterSpacing:'0.06em', marginBottom:12 }}>WHAT YOU GET — ₹5</div>
              {[
                ['💪', '6-day PPL split', 'Push, Pull, Legs — twice a week'],
                ['📊', 'Sets × reps × rest', 'Exact protocol per exercise'],
                ['📈', 'Progressive overload tips', 'How to increase weight each week'],
                ['🔄', 'Exercise substitutions', 'If equipment not available'],
                ['🏃', 'Cardio plan', 'Incline treadmill protocol'],
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
              <div style={{ fontSize:12, color:'#64748b' }}>Complete your body analysis to get a workout plan personalized for your body composition and goals.</div>
            </div>
            <a href="/" style={{ display:'inline-block', background:'#3b82f6', borderRadius:12, padding:'13px 32px', fontSize:14, fontWeight:600, color:'white', textDecoration:'none', boxShadow:'0 4px 16px rgba(59,130,246,0.28)' }}>
              Do body analysis first →
            </a>
          </div>
        ) : !hasPaid ? (
          /* Has analysis but not paid */
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ ...G.glassB, padding:20, marginBottom:24, textAlign:'left' }}>
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.07em', marginBottom:6 }}>YOUR WORKOUT PLAN</div>
              <div style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:4 }}>{firstName}'s Workout Plan 🏋️</div>
              <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>{m?.goal || 'Muscle gain'} · 6-day PPL split · AI personalized</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  { label:'Body fat',  value:`${r?.bodyFatPercent || '—'}%`, color:'#ef4444' },
                  { label:'FFMI',      value:`${r?.ffmi || '—'}`,            color:'#f59e0b' },
                  { label:'Lean mass', value:`${r?.leanMass || '—'}kg`,      color:'#10b981' },
                ].map(item => (
                  <div key={item.label} style={{ background:'rgba(255,255,255,0.60)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:500, color:item.color }}>{item.value}</div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...G.glass, padding:'28px 20px', marginBottom:16 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
              <div style={{ fontSize:18, fontWeight:600, color:'#1e293b', marginBottom:8 }}>Unlock your workout plan</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 }}>
                <span style={{ fontSize:36, fontWeight:600, color:'#3b82f6' }}>₹5</span>
                <span style={{ fontSize:13, color:'#94a3b8' }}>one-time · regenerate free</span>
              </div>
              <div style={{ textAlign:'left', background:'rgba(59,130,246,0.05)', border:'0.5px solid rgba(59,130,246,0.15)', borderRadius:12, padding:14, marginBottom:20 }}>
                {['6-day PPL split personalized for your body','Sets × reps × rest per exercise','Progressive overload tips per exercise','Exercise substitutions','Cardio protocol','Free regeneration anytime'].map((item, i, arr) => (
                  <div key={i} style={{ fontSize:12, color:'#475569', marginBottom:i<arr.length-1?6:0, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ color:'#10b981', fontWeight:600 }}>✓</span> {item}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowPayModal(true)} style={{ ...G.btn, width:'100%', fontSize:15 }}>
                Pay ₹5 — Get my workout plan →
              </button>
            </div>
          </div>
        ) : (
          /* Has analysis AND paid */
          <>
            <div style={{ ...G.glassB, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.07em', marginBottom:6 }}>YOUR WORKOUT PLAN</div>
              <div style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:4 }}>{plan ? plan.planTitle : `${firstName}'s Workout Plan 🏋️`}</div>
              <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>{m?.goal || 'Muscle gain'} · 6-day PPL split · Generated by AI</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  { label:'Body fat',  value:`${r?.bodyFatPercent || '—'}%`, color:'#ef4444' },
                  { label:'FFMI',      value:`${r?.ffmi || '—'}`,            color:'#f59e0b' },
                  { label:'Lean mass', value:`${r?.leanMass || '—'}kg`,      color:'#10b981' },
                ].map(item => (
                  <div key={item.label} style={{ background:'rgba(255,255,255,0.60)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:500, color:item.color }}>{item.value}</div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {!plan && !loading && (
              <button onClick={generatePlan} style={{ ...G.btn, width:'100%', marginBottom:20, fontSize:15 }}>
                Generate my workout plan →
              </button>
            )}

            {loading && (
              <div style={{ ...G.glass, padding:'40px 24px', textAlign:'center', marginBottom:20 }}>
                <div style={{ width:44, height:44, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
                <div style={{ fontSize:15, fontWeight:500, color:'#1e293b', marginBottom:6 }}>Building your workout split...</div>
                <div style={{ fontSize:13, color:'#94a3b8' }}>Personalizing for your body composition</div>
              </div>
            )}

            {error && (
              <div style={{ background:'rgba(254,202,202,0.5)', border:'0.5px solid #fca5a5', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#dc2626' }}>
                {error}
                <button onClick={generatePlan} style={{ marginLeft:8, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>Try again</button>
              </div>
            )}

            {plan && (
              <>
                {/* Day tabs */}
                <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
                  {plan.days.map((day, i) => (
                    <button key={i} onClick={() => setActiveDay(i)}
                      style={{ flexShrink:0, padding:'8px 12px', borderRadius:20, border:`0.5px solid ${activeDay===i?day.color:'rgba(255,255,255,0.9)'}`, background:activeDay===i?`${day.color}20`:'rgba(255,255,255,0.60)', color:activeDay===i?day.color:'#64748b', fontSize:12, cursor:'pointer', fontWeight:activeDay===i?600:400, transition:'all 0.2s', whiteSpace:'nowrap' as const }}>
                      {day.emoji} {day.day.slice(0,3)}
                    </button>
                  ))}
                </div>

                {activeWorkout && (
                  <>
                    <div style={{ background:`linear-gradient(135deg,${activeWorkout.color}18 0%,${activeWorkout.color}08 100%)`, border:`0.5px solid ${activeWorkout.color}40`, borderRadius:16, padding:20, marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ fontSize:32, marginBottom:6 }}>{activeWorkout.emoji}</div>
                          <div style={{ fontSize:18, fontWeight:600, color:'#1e293b', marginBottom:4 }}>{activeWorkout.name}</div>
                          <div style={{ fontSize:12, color:'#64748b' }}>{activeWorkout.focus}</div>
                        </div>
                        <div style={{ fontSize:11, fontWeight:600, background:activeWorkout.color, color:'white', borderRadius:10, padding:'4px 12px' }}>{activeWorkout.day}</div>
                      </div>
                    </div>

                    {activeWorkout.exercises.length === 0 ? (
                      <div style={{ ...G.glass, padding:'40px 24px', textAlign:'center', marginBottom:16 }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>😴</div>
                        <div style={{ fontSize:18, fontWeight:500, color:'#1e293b', marginBottom:8 }}>Rest & Recovery Day</div>
                        <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>{activeWorkout.cardio}</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase' as const, marginBottom:10 }}>
                          Exercises — {activeWorkout.exercises.length} movements
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                          {activeWorkout.exercises.map((ex, i) => (
                            <div key={i} style={{ ...G.glass, padding:16 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                                <div>
                                  <div style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:4 }}>{ex.name}</div>
                                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const }}>
                                    <span style={{ fontSize:11, fontWeight:600, background:'rgba(59,130,246,0.10)', color:'#3b82f6', borderRadius:6, padding:'2px 8px' }}>{ex.sets} sets</span>
                                    <span style={{ fontSize:11, fontWeight:600, background:'rgba(16,185,129,0.10)', color:'#10b981', borderRadius:6, padding:'2px 8px' }}>{ex.reps} reps</span>
                                    <span style={{ fontSize:11, fontWeight:600, background:'rgba(245,158,11,0.10)', color:'#d97706', borderRadius:6, padding:'2px 8px' }}>Rest: {ex.rest}</span>
                                    <span style={{ fontSize:11, background:'rgba(139,92,246,0.10)', color:'#7c3aed', borderRadius:6, padding:'2px 8px' }}>{ex.muscle}</span>
                                  </div>
                                </div>
                                <span style={{ fontSize:20, fontWeight:600, color:'#e2e8f0', marginLeft:8 }}>{String(i+1).padStart(2,'0')}</span>
                              </div>
                              {ex.tip && (
                                <div style={{ background:'rgba(59,130,246,0.05)', border:'0.5px solid rgba(59,130,246,0.15)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#475569', lineHeight:1.5, marginBottom:6 }}>
                                  💡 {ex.tip}
                                </div>
                              )}
                              {ex.substitute && (
                                <div style={{ fontSize:11, color:'#94a3b8' }}>
                                  Substitute: <span style={{ color:'#3b82f6' }}>{ex.substitute}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {activeWorkout.cardio && (
                          <div style={{ background:'rgba(239,68,68,0.06)', border:'0.5px solid rgba(239,68,68,0.20)', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontSize:20 }}>🏃</span>
                            <div>
                              <div style={{ fontSize:12, fontWeight:600, color:'#dc2626', marginBottom:2 }}>CARDIO</div>
                              <div style={{ fontSize:13, color:'#475569' }}>{activeWorkout.cardio}</div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                      {activeDay > 0 && (
                        <button onClick={() => setActiveDay(activeDay - 1)}
                          style={{ flex:1, background:'rgba(255,255,255,0.60)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:12, padding:'12px 0', color:'#64748b', fontSize:14, cursor:'pointer' }}>
                          ← {plan.days[activeDay-1].day}
                        </button>
                      )}
                      {activeDay < plan.days.length - 1 && (
                        <button onClick={() => setActiveDay(activeDay + 1)}
                          style={{ flex:1, background:'#3b82f6', border:'none', borderRadius:12, padding:'12px 0', color:'white', fontSize:14, fontWeight:500, cursor:'pointer', boxShadow:'0 4px 12px rgba(59,130,246,0.25)' }}>
                          {plan.days[activeDay+1].day} →
                        </button>
                      )}
                    </div>
                  </>
                )}

                {plan.notes && plan.notes.length > 0 && (
                  <>
                    <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase' as const, margin:'8px 0 10px' }}>Trainer notes</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {plan.notes.map((note, i) => (
                        <div key={i} style={{ ...G.glass, padding:'11px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', marginTop:5, flexShrink:0 }}/>
                          <span style={{ fontSize:13, color:'#475569', lineHeight:1.5 }}>{note}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <button onClick={generatePlan}
                  style={{ width:'100%', marginTop:16, background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:12, padding:'12px 0', color:'#3b82f6', fontSize:14, fontWeight:500, cursor:'pointer' }}>
                  🔄 Regenerate plan — free
                </button>
              </>
            )}
          </>
        )}
      </div>

      {showPayModal && <PayModal onClose={() => setShowPayModal(false)} onSuccess={() => { setShowPayModal(false); setHasPaid(true) }}/>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}