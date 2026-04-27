'use client'
import { useState, useEffect, useRef } from 'react'
import { getUser, signOut } from '@/lib/auth'
import { getSavedAnalyses } from '@/lib/userdata'
import { getProfile } from '@/lib/profile'
import { getCheckinHistory } from '@/lib/checkin'
import type { SavedAnalysis } from '@/lib/userdata'
import type { WeeklyCheckin } from '@/lib/checkin'

const SLOT_LABELS: Record<number, string> = { 1:'Baseline', 2:'Previous', 3:'Latest' }

function diff(a: number, b: number, lower = false) {
  const d = b - a
  if (Math.abs(d) < 0.1) return { text:'—', color:'#94a3b8' }
  const better = lower ? d < 0 : d > 0
  return { text:`${d>0?'+':''}${d.toFixed(1)}`, color:better?'#10b981':'#ef4444' }
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c || data.length < 2) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const W=c.width, H=c.height, pad=8
    const min=Math.min(...data)-1, max=Math.max(...data)+1, range=max-min||1
    ctx.clearRect(0,0,W,H)
    const grad = ctx.createLinearGradient(0,0,0,H)
    grad.addColorStop(0, color+'25'); grad.addColorStop(1, color+'00')
    ctx.fillStyle = grad
    ctx.beginPath()
    data.forEach((v,i) => { const x=pad+(i/(data.length-1))*(W-pad*2); const y=H-pad-((v-min)/range)*(H-pad*2); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.lineTo(pad+(W-pad*2),H); ctx.lineTo(pad,H); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=2; ctx.lineJoin='round'
    data.forEach((v,i) => { const x=pad+(i/(data.length-1))*(W-pad*2); const y=H-pad-((v-min)/range)*(H-pad*2); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.stroke()
    data.forEach((v,i) => { const x=pad+(i/(data.length-1))*(W-pad*2); const y=H-pad-((v-min)/range)*(H-pad*2); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle=color; ctx.fill() })
  }, [data, color])

  if (data.length < 2) return <div style={{ height:72, display:'flex', alignItems:'center', justifyContent:'center', color:'#cbd5e1', fontSize:12 }}>Need 2+ entries</div>
  return <canvas ref={ref} width={400} height={72} style={{ width:'100%', height:72 }}/>
}

const G = {
  glass: { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'0.5px solid rgba(255,255,255,0.88)', borderRadius:14, boxShadow:'0 2px 16px rgba(59,130,246,0.06)' },
}

export default function ProgressPage() {
  const [user,      setUser]      = useState<any>(null)
  const [name,      setName]      = useState('')
  const [analyses,  setAnalyses]  = useState<SavedAnalysis[]>([])
  const [checkins,  setCheckins]  = useState<WeeklyCheckin[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<'analyses'|'checkins'>('analyses')

  useEffect(() => {
    async function load() {
      const u = await getUser()
      if (!u) { window.location.href = '/?login=1'; return }
      setUser(u)
      const [profile, data, history] = await Promise.all([getProfile(), getSavedAnalyses(), getCheckinHistory(12)])
      setName(profile?.name ?? '')
      setAnalyses(data)
      setCheckins(history)
      setLoading(false)
    }
    load()
  }, [])

  const latest = analyses[analyses.length - 1]
  const first  = analyses[0]
  const bfData     = analyses.map(a => a.body_fat)
  const weightData = analyses.map(a => a.weight)
  const leanData   = analyses.map(a => a.lean_mass)
  const checkinBf  = checkins.map(c => c.body_fat)
  const checkinW   = checkins.map(c => c.weight)
  const checkinWaist = checkins.map(c => c.waist)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe,#f0f7ff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)', color:'#1e293b', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:-120, left:-120, width:400, height:400, background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }}/>
      <div style={{ position:'fixed', bottom:-80, right:-80, width:320, height:320, background:'radial-gradient(circle,rgba(99,179,246,0.08) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }}/>

      {/* NAV */}
      <nav style={{ background:'rgba(255,255,255,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'0.5px solid rgba(255,255,255,0.9)', padding:'13px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:10 }}>
        <a href="/" style={{ fontSize:18, fontWeight:500, textDecoration:'none', color:'#1e293b' }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></a>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href="/checkin" style={{ fontSize:12, color:'#3b82f6', textDecoration:'none', background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:20, padding:'5px 12px', fontWeight:500 }}>+ Check in</a>
          <button onClick={async () => { await signOut(); window.location.href='/' }} style={{ background:'rgba(255,255,255,0.60)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, padding:'5px 12px', color:'#64748b', fontSize:12, cursor:'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'32px 20px', position:'relative', zIndex:1 }}>

        {/* Greeting */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.06em', marginBottom:8 }}>MY PROGRESS</div>
          <h1 style={{ fontSize:28, fontWeight:500, color:'#1e293b', marginBottom:6, letterSpacing:'-0.3px' }}>
            Hi {name||'there'}, here's your progress 💪
          </h1>
          <p style={{ fontSize:14, color:'#64748b', lineHeight:1.6 }}>
            {analyses.length===0 ? 'No saved analyses yet. Complete an analysis and save your progress.'
              : analyses.length===1 ? '1 entry saved. Do another analysis to start tracking your journey.'
              : `${analyses.length} entries · ${checkins.length} weekly check-ins`}
          </p>
        </div>

        {/* Empty state */}
        {analyses.length === 0 && checkins.length === 0 && (
          <div style={{ ...G.glass, padding:'48px 24px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
            <h2 style={{ fontSize:20, fontWeight:500, color:'#1e293b', marginBottom:8 }}>No progress saved yet</h2>
            <p style={{ fontSize:14, color:'#64748b', marginBottom:24, lineHeight:1.6, maxWidth:320, margin:'0 auto 24px' }}>
              Complete a body analysis and click "Save my progress" to start tracking your fitness journey.
            </p>
            <a href="/" style={{ background:'#3b82f6', borderRadius:10, padding:'12px 32px', fontSize:14, fontWeight:600, color:'white', textDecoration:'none', display:'inline-block', boxShadow:'0 4px 16px rgba(59,130,246,0.28)' }}>
              Start my first analysis →
            </a>
          </div>
        )}

        {/* Tabs */}
        {(analyses.length > 0 || checkins.length > 0) && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:24 }}>
              {[{k:'analyses',l:`Analyses (${analyses.length})`},{k:'checkins',l:`Weekly check-ins (${checkins.length})`}].map(t => (
                <button key={t.k} onClick={() => setTab(t.k as any)}
                  style={{ padding:'8px 18px', borderRadius:20, border:`0.5px solid ${tab===t.k?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.9)'}`, background:tab===t.k?'rgba(59,130,246,0.10)':'rgba(255,255,255,0.60)', color:tab===t.k?'#3b82f6':'#64748b', fontSize:13, cursor:'pointer', fontWeight:tab===t.k?500:400, transition:'all 0.2s' }}>
                  {t.l}
                </button>
              ))}
            </div>

            {/* ANALYSES TAB */}
            {tab === 'analyses' && analyses.length > 0 && (
              <>
                {/* Key metrics */}
                {latest && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
                    {[
                      { label:'Weight',    value:`${latest.weight}kg`,    color:'#3b82f6' },
                      { label:'Body fat',  value:`${latest.body_fat}%`,   color:'#ef4444' },
                      { label:'Lean mass', value:`${latest.lean_mass}kg`, color:'#10b981' },
                      { label:'FFMI',      value:`${latest.ffmi}`,        color:'#f59e0b' },
                    ].map((m, i) => (
                      <div key={i} style={{ ...G.glass, padding:'14px 16px' }}>
                        <div style={{ fontSize:10, color:'#94a3b8', marginBottom:6, letterSpacing:'0.05em' }}>{m.label.toUpperCase()}</div>
                        <div style={{ fontSize:22, fontWeight:500, color:m.color }}>{m.value}</div>
                        {first && latest !== first && (
                          <div style={{ fontSize:11, color:diff(+(first[m.label==='Weight'?'weight':m.label==='Body fat'?'body_fat':m.label==='Lean mass'?'lean_mass':'ffmi'] as any), +(latest[m.label==='Weight'?'weight':m.label==='Body fat'?'body_fat':m.label==='Lean mass'?'lean_mass':'ffmi'] as any), m.label==='Body fat'||m.label==='Weight').color, marginTop:4 }}>
                            {diff(+(first[m.label==='Weight'?'weight':m.label==='Body fat'?'body_fat':m.label==='Lean mass'?'lean_mass':'ffmi'] as any), +(latest[m.label==='Weight'?'weight':m.label==='Body fat'?'body_fat':m.label==='Lean mass'?'lean_mass':'ffmi'] as any), m.label==='Body fat'||m.label==='Weight').text} since start
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Charts */}
                {analyses.length >= 2 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                    {[
                      { label:'Body fat %', data:bfData,     color:'#ef4444', unit:'%' },
                      { label:'Weight',     data:weightData, color:'#3b82f6', unit:'kg' },
                      { label:'Lean mass',  data:leanData,   color:'#10b981', unit:'kg' },
                    ].map((chart, i) => (
                      <div key={i} style={{ ...G.glass, padding:'16px 16px 12px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>{chart.label}</div>
                          <div style={{ display:'flex', gap:16 }}>
                            {analyses.map((a, idx) => (
                              <div key={idx} style={{ textAlign:'center' }}>
                                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{SLOT_LABELS[a.slot]}</div>
                                <div style={{ fontSize:13, fontWeight:500, color:idx===analyses.length-1?chart.color:'#64748b' }}>
                                  {(chart.data[idx]??0).toFixed(1)}{chart.unit}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <MiniChart data={chart.data} color={chart.color}/>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comparison table */}
                <div style={{ ...G.glass, overflow:'hidden', marginBottom:24 }}>
                  <div style={{ padding:'14px 20px', borderBottom:'0.5px solid rgba(59,130,246,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>Detailed comparison</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>🟢 better · 🔴 needs work</div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:380 }}>
                      <thead>
                        <tr style={{ background:'rgba(59,130,246,0.04)' }}>
                          <th style={{ padding:'10px 16px', fontSize:11, color:'#94a3b8', textAlign:'left', fontWeight:500 }}>Metric</th>
                          {analyses.map(a => (
                            <th key={a.slot} style={{ padding:'10px 16px', fontSize:11, color:a.slot===analyses.length?'#3b82f6':'#94a3b8', textAlign:'center', fontWeight:500 }}>
                              {SLOT_LABELS[a.slot]}
                              <div style={{ fontSize:10, color:'#cbd5e1', fontWeight:400 }}>{new Date(a.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                            </th>
                          ))}
                          {analyses.length >= 2 && <th style={{ padding:'10px 16px', fontSize:11, color:'#94a3b8', textAlign:'center', fontWeight:500 }}>Change</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label:'Weight',       key:'weight',         unit:'kg',   lower:true },
                          { label:'Body fat %',   key:'body_fat',       unit:'%',    lower:true },
                          { label:'Lean mass',    key:'lean_mass',      unit:'kg',   lower:false },
                          { label:'FFMI',         key:'ffmi',           unit:'',     lower:false },
                          { label:'Waist',        key:'stomach',        unit:'cm',   lower:true },
                          { label:'Chest',        key:'chest',          unit:'cm',   lower:false },
                          { label:'Calories/day', key:'daily_calories', unit:'kcal', lower:false },
                          { label:'Protein',      key:'protein',        unit:'g',    lower:false },
                        ].map((row, i) => (
                          <tr key={row.key} style={{ borderTop:'0.5px solid rgba(59,130,246,0.07)', background:i%2===0?'transparent':'rgba(255,255,255,0.30)' }}>
                            <td style={{ padding:'10px 16px', fontSize:13, color:'#64748b' }}>{row.label}</td>
                            {analyses.map(a => (
                              <td key={a.slot} style={{ padding:'10px 16px', fontSize:13, textAlign:'center', fontWeight:a.slot===analyses.length?500:400, color:a.slot===analyses.length?'#1e293b':'#64748b' }}>
                                {(a as any)[row.key]}{row.unit}
                              </td>
                            ))}
                            {analyses.length >= 2 && (() => {
                              const d = diff(+(analyses[0] as any)[row.key], +(analyses[analyses.length-1] as any)[row.key], row.lower)
                              return <td style={{ padding:'10px 16px', textAlign:'center', fontSize:12, fontWeight:500, color:d.color }}>{d.text}{row.unit}</td>
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* CHECKINS TAB */}
            {tab === 'checkins' && (
              <>
                {checkins.length === 0 ? (
                  <div style={{ ...G.glass, padding:'40px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
                    <h2 style={{ fontSize:18, fontWeight:500, color:'#1e293b', marginBottom:8 }}>No check-ins yet</h2>
                    <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>Start your weekly tracking to see your progress here.</p>
                    <a href="/checkin" style={{ background:'#3b82f6', borderRadius:10, padding:'11px 28px', fontSize:14, fontWeight:600, color:'white', textDecoration:'none', display:'inline-block', boxShadow:'0 4px 14px rgba(59,130,246,0.28)' }}>Start check-in →</a>
                  </div>
                ) : (
                  <>
                    {/* Checkin charts */}
                    {checkins.length >= 2 && (
                      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                        {[
                          { label:'Body fat % (weekly)', data:checkinBf,    color:'#ef4444', unit:'%' },
                          { label:'Weight (weekly)',      data:checkinW,     color:'#3b82f6', unit:'kg' },
                          { label:'Waist (weekly)',       data:checkinWaist, color:'#f59e0b', unit:'cm' },
                        ].map((chart, i) => (
                          <div key={i} style={{ ...G.glass, padding:'16px 16px 12px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                              <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>{chart.label}</div>
                              <div style={{ fontSize:12, color:chart.color, fontWeight:500 }}>
                                {checkins[checkins.length-1][chart.label.includes('fat')?'body_fat':chart.label.includes('Waist')?'waist':'weight']}{chart.unit}
                              </div>
                            </div>
                            <MiniChart data={chart.data} color={chart.color}/>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Checkin history */}
                    <div style={{ ...G.glass, overflow:'hidden' }}>
                      <div style={{ padding:'14px 16px', borderBottom:'0.5px solid rgba(59,130,246,0.08)' }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>Check-in history</div>
                      </div>
                      {[...checkins].reverse().map((c, i) => (
                        <div key={c.id} style={{ padding:'14px 16px', borderBottom:i<checkins.length-1?'0.5px solid rgba(59,130,246,0.07)':'none', background:i%2===0?'transparent':'rgba(255,255,255,0.30)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                            <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>Week {c.week_number}, {c.year}</div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>{new Date(c.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                            {[{l:'Weight',v:c.weight+'kg'},{l:'Waist',v:c.waist+'cm'},{l:'Body fat',v:c.body_fat+'%'},{l:'Chest',v:c.chest+'cm'},{l:'Hip',v:c.hip+'cm'},{l:'Arms',v:c.arms+'cm'}].map(m => (
                              <div key={m.l} style={{ textAlign:'center' }}>
                                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{m.l}</div>
                                <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>{m.v}</div>
                              </div>
                            ))}
                          </div>
                          {(c.following_diet !== null || c.following_workout !== null) && (
                            <div style={{ display:'flex', gap:8, marginTop:8 }}>
                              {c.following_diet !== null && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:c.following_diet?'rgba(16,185,129,0.10)':'rgba(239,68,68,0.10)', color:c.following_diet?'#10b981':'#ef4444' }}>🥗 Diet: {c.following_diet?'Yes':'No'}</span>}
                              {c.following_workout !== null && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:c.following_workout?'rgba(16,185,129,0.10)':'rgba(239,68,68,0.10)', color:c.following_workout?'#10b981':'#ef4444' }}>🏋️ Workout: {c.following_workout?'Yes':'No'}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <div style={{ textAlign:'center', marginTop:24 }}>
              <a href="/" style={{ background:'#3b82f6', borderRadius:10, padding:'12px 32px', fontSize:14, fontWeight:600, color:'white', textDecoration:'none', display:'inline-block', boxShadow:'0 4px 14px rgba(59,130,246,0.28)' }}>New analysis →</a>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}