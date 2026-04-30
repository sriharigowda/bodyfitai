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
}

const TYPE_STYLES: Record<string, { border: string; timeBg: string; timeColor: string; timeBorder: string }> = {
  pre_workout:  { border:'3px solid #f59e0b', timeBg:'rgba(245,158,11,0.10)', timeColor:'#d97706', timeBorder:'rgba(245,158,11,0.25)' },
  post_workout: { border:'3px solid #10b981', timeBg:'rgba(16,185,129,0.10)', timeColor:'#059669', timeBorder:'rgba(16,185,129,0.25)' },
  gym:          { border:'3px solid #ef4444', timeBg:'rgba(239,68,68,0.10)',  timeColor:'#dc2626', timeBorder:'rgba(239,68,68,0.25)' },
  bed:          { border:'3px solid #8b5cf6', timeBg:'rgba(139,92,246,0.10)', timeColor:'#7c3aed', timeBorder:'rgba(139,92,246,0.25)' },
  default:      { border:'none',              timeBg:'rgba(59,130,246,0.10)', timeColor:'#3b82f6', timeBorder:'rgba(59,130,246,0.22)' },
}

const TAG_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pre_workout:  { bg:'rgba(245,158,11,0.12)', color:'#d97706', label:'PRE-WORKOUT' },
  post_workout: { bg:'rgba(16,185,129,0.12)', color:'#059669', label:'MOST IMPORTANT' },
  bed:          { bg:'rgba(139,92,246,0.12)', color:'#7c3aed', label:'BEFORE BED' },
}

const GYM_TIMES = ['5:00 AM','6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM']

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

  useEffect(() => {
    getUser().then(u => { if (!u) { window.location.href = '/'; return } })
    const stored = sessionStorage.getItem('bodyfitai_analysis')
    if (stored) {
      const data = JSON.parse(stored)
      setAnalysisData(data)
      // Set default tab based on diet type
      const diet = data.measurements?.diet?.type || 'Non-vegetarian'
      setActiveTab(diet === 'Vegetarian' ? 'veg' : 'nonveg')
    } else {
      window.location.href = '/'
    }
  }, [])

  const r = analysisData?.results
  const m = analysisData?.measurements
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
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          m?.name     || 'User',
          goal:          m?.goal     || 'Recomp',
          dailyCalories: r?.dailyCalories || 2000,
          protein:       r?.protein  || 150,
          carbs:         r?.carbs    || 200,
          fat:           r?.fat      || 60,
          dietType:      dietType,
          gymTime:       gymTime,
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
      // Set active tab based on which plans exist
      if (data.vegPlan && !data.nonvegPlan) setActiveTab('veg')
      else setActiveTab('nonveg')
    } catch (e) {
      setError('Failed to generate plan. Please try again.')
    }
    setLoading(false)
  }

  const activePlan = activeTab === 'nonveg' ? nonvegPlan : vegPlan

  // Totals
  const totals = activePlan?.meals?.reduce((acc, meal) => ({
    protein: acc.protein + (meal.protein || 0),
    carbs:   acc.carbs   + (meal.carbs   || 0),
    kcal:    acc.kcal    + (meal.kcal    || 0),
  }), { protein:0, carbs:0, kcal:0 })

  if (!analysisData) return (
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
        <div style={{ fontSize:18, fontWeight:500, color:'#1e293b' }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></div>
        <a href="/" style={{ fontSize:12, color:'#64748b', textDecoration:'none', background:'rgba(255,255,255,0.60)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, padding:'5px 12px' }}>← Back</a>
      </nav>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'24px 16px 48px', position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ ...G.glassB, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.07em', marginBottom:6 }}>YOUR MEAL PLAN</div>
          <div style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:4 }}>
            {firstName}'s {modeLabel} Plan 🍽️
          </div>
          <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>
            {dietType} · {modeLabel} · Generated by AI
          </div>
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
          <select value={gymTime} onChange={e => { setGymTime(e.target.value); setGenerated(false); setNonvegPlan(null); setVegPlan(null) }}
            style={{ background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.25)', borderRadius:10, padding:'8px 14px', fontSize:13, color:'#3b82f6', fontWeight:500, outline:'none', cursor:'pointer' }}>
            {GYM_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Generate button */}
        {!generated && !loading && (
          <button onClick={generatePlan}
            style={{ width:'100%', background:'#3b82f6', border:'none', borderRadius:12, padding:'14px 0', color:'white', fontSize:15, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 16px rgba(59,130,246,0.28)', marginBottom:20 }}>
            Generate my meal plan →
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ ...G.glass, padding:'40px 24px', textAlign:'center', marginBottom:20 }}>
            <div style={{ width:44, height:44, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
            <div style={{ fontSize:15, fontWeight:500, color:'#1e293b', marginBottom:6 }}>Generating your meal plan...</div>
            <div style={{ fontSize:13, color:'#94a3b8' }}>Calculating exact macros for your {gymTime} session</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background:'rgba(254,202,202,0.5)', border:'0.5px solid #fca5a5', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#dc2626' }}>
            {error}
            <button onClick={generatePlan} style={{ marginLeft:8, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>Try again</button>
          </div>
        )}

        {/* Generated plan */}
        {generated && (nonvegPlan || vegPlan) && (
          <>
            {/* Veg / Non-veg toggle */}
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

            {/* Single type label for veg-only or non-veg-only */}
            {!hasBothPlans && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:isVegOnly?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`0.5px solid ${isVegOnly?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`, borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:600, color:isVegOnly?'#10b981':'#dc2626', marginBottom:16 }}>
                {isVegOnly ? '🌿 Vegetarian Plan' : '🍗 Non-Veg Plan'}
              </div>
            )}

            {/* Supplements */}
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

            {/* Meal timeline */}
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
                      <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', borderBottom: isGym||meal.items?.length===0 ? 'none' : '0.5px solid rgba(59,130,246,0.08)' }}>
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

                {/* Daily totals */}
                <div style={{ ...G.glass, overflow:'hidden', marginTop:20 }}>
                  <div style={{ padding:'12px 16px', background:'rgba(59,130,246,0.05)', borderBottom:'0.5px solid rgba(59,130,246,0.08)', fontSize:12, fontWeight:600, color:'#3b82f6', letterSpacing:'0.05em' }}>
                    📊 DAILY TOTALS
                  </div>
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

                <button onClick={generatePlan}
                  style={{ width:'100%', marginTop:16, background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:12, padding:'12px 0', color:'#3b82f6', fontSize:14, fontWeight:500, cursor:'pointer' }}>
                  🔄 Regenerate plan
                </button>
              </>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}