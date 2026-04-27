'use client'
import { useState, useEffect } from 'react'
import type { FitnessResults, Goal, Measurements } from '@/lib/calculations'
import { calculateBodyAge, calculateIdealMeasurements } from '@/lib/calculations'
import DownloadReport from '@/components/DownloadReport'
import dynamic from 'next/dynamic'
const SaveProgressModal = dynamic(() => import('@/components/SaveProgressModal'), { ssr: false })
import { getUser } from '@/lib/auth'
import { getSavedAnalyses } from '@/lib/userdata'

interface DayPlan { type: string; breakfast: string; lunch: string; dinner: string; snack: string }
interface AiInsights {
  greeting: string; summary: string; motivation: string; warnings: string[]
  workoutRecommendation: string; nutritionTips: string[]
  currentAnalysis: { bodyFatExplanation: string; leanMassExplanation: string; ffmiExplanation: string; bodyComposition: string }
  targetAnalysis:  { bodyFatExplanation: string; leanMassExplanation: string; ffmiExplanation: string; targetBodyMeasurements: string }
  weeklyDietPlan: Record<string, DayPlan>
  duration: { weeks: number; months: string; milestone4weeks: string; milestone8weeks: string; milestoneGoal: string }
}
interface Props {
  results: FitnessResults; aiInsights: AiInsights; goal: Goal; name: string; onRestart: () => void
  isPro?: boolean; onUpgrade?: () => void; measurements?: Measurements; isLoggedIn?: boolean; onLogin?: () => void
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

// Light glass shared styles
const G = {
  glass:  { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(255,255,255,0.88)', borderRadius:14, boxShadow:'0 2px 16px rgba(59,130,246,0.06)' },
  glassB: { background:'rgba(59,130,246,0.07)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(59,130,246,0.20)', borderRadius:14 },
  btn:    { background:'#3b82f6', border:'none', borderRadius:12, padding:'13px 0', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(59,130,246,0.28)', transition:'all 0.15s' } as const,
}

function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ background: accent ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.60)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:`0.5px solid ${accent?'rgba(59,130,246,0.20)':'rgba(255,255,255,0.88)'}`, borderRadius:14, padding:'14px 16px', marginBottom:10, boxShadow:'0 2px 16px rgba(59,130,246,0.05)' }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:11, color:'#94a3b8', fontWeight:500, letterSpacing:'0.07em', textTransform:'uppercase' as const, marginBottom:12, marginTop:24 }}>
      {children}
    </div>
  )
}

function MetricRow({ label, current, target, currentColor }: { label: string; current: string; target?: string; currentColor?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'0.5px solid rgba(59,130,246,0.08)', fontSize:13 }}>
      <span style={{ color:'#64748b' }}>{label}</span>
      <div style={{ display:'flex', gap:14, alignItems:'center' }}>
        <span style={{ fontWeight:500, color:currentColor||'#1e293b' }}>{current}</span>
        {target && <>
          <span style={{ color:'#94a3b8', fontSize:10 }}>→</span>
          <span style={{ fontWeight:500, color:'#3b82f6' }}>{target}</span>
        </>}
      </div>
    </div>
  )
}

function ExplainCard({ title, text, bg, border }: { title: string; text: string; bg: string; border: string }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.60)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(255,255,255,0.88)', borderRadius:14, overflow:'hidden', marginBottom:10, boxShadow:'0 2px 12px rgba(59,130,246,0.04)' }}>
      <div style={{ background:bg, border:`0 0 0.5px 0 ${border}`, padding:'7px 14px' }}>
        <span style={{ fontSize:11, fontWeight:600, color:'white', letterSpacing:'0.04em' }}>{title}</span>
      </div>
      <div style={{ padding:'12px 14px', fontSize:13, color:'#475569', lineHeight:1.65 }}>{text}</div>
    </div>
  )
}

export default function ResultsPage({ results: r, aiInsights: ai, goal, name, onRestart, isPro=false, onUpgrade, measurements, isLoggedIn=false, onLogin }: Props) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [hasSaved,      setHasSaved]      = useState(false)

  useEffect(() => {
    getUser().then(u => { if (u) getSavedAnalyses().then(d => setHasSaved(d.length > 0)).catch(() => {}) })
  }, [])

  const firstName = name.split(' ')[0]
  const mGender   = (measurements?.gender as any) ?? 'Male'
  const mHeight   = measurements?.height ?? 170
  const mAge      = measurements?.age    ?? 25
  const bodyAge   = calculateBodyAge(mAge, r.bodyFatPercent, r.ffmi, mGender)
  const ideal     = calculateIdealMeasurements(mHeight, mGender)

  return (
    <>
      <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 20px 48px' }}>

        {/* Greeting */}
        <div className="fade-up" style={{ ...G.glassB, padding:'18px 18px', marginBottom:20 }}>
          <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.06em', marginBottom:6 }}>YOUR REPORT</div>
          <h2 style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:6 }}>Hi {firstName}! 👋</h2>
          <p style={{ fontSize:14, color:'#1e293b', lineHeight:1.6, marginBottom:8 }}>{ai.greeting}</p>
          <p style={{ fontSize:13, color:'#475569', lineHeight:1.6, fontStyle:'italic' }}>"{ai.motivation}"</p>
        </div>

        {/* Key metrics */}
        <div className="fade-up-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label:'Daily calories', value:r.dailyCalories.toLocaleString(), unit:'kcal', color:'#3b82f6' },
            { label:'Body fat',       value:`${r.bodyFatPercent}%`,           unit:'',     color:'#ef4444' },
            { label:'Lean mass',      value:`${r.leanMass}`,                  unit:'kg',   color:'#10b981' },
            { label:'FFMI',           value:`${r.ffmi}`,                      unit:'',     color:'#f59e0b' },
          ].map((m, i) => (
            <div key={i} className="count-up" style={{ ...G.glass, padding:'13px 14px', animationDelay:`${i*0.08}s` }}>
              <div style={{ fontSize:10, color:'#94a3b8', marginBottom:5, letterSpacing:'0.05em' }}>{m.label.toUpperCase()}</div>
              <div style={{ fontSize:22, fontWeight:500, color:m.color }}>{m.value}<span style={{ fontSize:11, color:'#94a3b8', marginLeft:2 }}>{m.unit}</span></div>
            </div>
          ))}
        </div>

        {/* SECTION 1 — CURRENT STATUS */}
        <SectionTitle>Current body status — {firstName}</SectionTitle>
        <Card>
          <div style={{ fontSize:12, fontWeight:500, color:'#64748b', marginBottom:10 }}>Current measurements</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            {[
              ['Body weight', `${r.leanMass + r.fatMass} kg`],
              ['Body fat',    `${r.bodyFatPercent}%`],
              ['Lean mass',   `${r.leanMass} kg`],
              ['Fat mass',    `${r.fatMass} kg`],
              ['FFMI',        `${r.ffmi}`],
              ['BMR',         `${r.bmr} kcal`],
            ].map(([l, v]) => (
              <div key={l} style={{ padding:'7px 0', borderBottom:'0.5px solid rgba(59,130,246,0.08)', fontSize:13, display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#94a3b8' }}>{l}</span>
                <span style={{ fontWeight:500, color:'#1e293b' }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
        <ExplainCard title={`Body fat — ${r.bodyFatPercent}% (${r.bodyFatCategory})`}   text={ai.currentAnalysis.bodyFatExplanation}  bg="rgba(239,68,68,0.70)"   border="rgba(239,68,68,0.3)" />
        <ExplainCard title={`Lean mass — ${r.leanMass} kg (${r.leanMassPercent}%)`}     text={ai.currentAnalysis.leanMassExplanation}  bg="rgba(16,185,129,0.70)"  border="rgba(16,185,129,0.3)" />
        <ExplainCard title={`FFMI — ${r.ffmi} (${r.ffmiCategory})`}                     text={ai.currentAnalysis.ffmiExplanation}      bg="rgba(59,130,246,0.70)"  border="rgba(59,130,246,0.3)" />
        <Card>
          <div style={{ fontSize:12, fontWeight:500, color:'#64748b', marginBottom:8 }}>Body composition overview</div>
          <p style={{ fontSize:13, color:'#475569', lineHeight:1.6, margin:0 }}>{ai.currentAnalysis.bodyComposition}</p>
        </Card>

        {/* SECTION 2 — TARGET */}
        <SectionTitle>Target body status — {firstName}</SectionTitle>
        <Card>
          <div style={{ fontSize:12, fontWeight:500, color:'#64748b', marginBottom:10 }}>Current → Target</div>
          <MetricRow label="Weight"    current={`${r.leanMass + r.fatMass} kg`} target={`${r.target.targetLeanMass + r.target.targetFatMass} kg`} />
          <MetricRow label="Body fat"  current={`${r.bodyFatPercent}%`}          target={`${r.target.targetBodyFat}%`}          currentColor="#ef4444" />
          <MetricRow label="Lean mass" current={`${r.leanMass} kg`}              target={`${r.target.targetLeanMass} kg`}       currentColor="#10b981" />
          <MetricRow label="FFMI"      current={`${r.ffmi}`}                      target={`${r.target.targetFFMI}`} />
          <MetricRow label="Category"  current={r.bodyFatCategory}               target={r.target.targetBodyFatCategory} />
        </Card>
        <ExplainCard title={`Target body fat — ${r.target.targetBodyFat}%`}     text={ai.targetAnalysis.bodyFatExplanation}    bg="rgba(239,68,68,0.55)"  border="rgba(239,68,68,0.2)" />
        <ExplainCard title={`Target lean mass — ${r.target.targetLeanMass} kg`} text={ai.targetAnalysis.leanMassExplanation}   bg="rgba(16,185,129,0.55)" border="rgba(16,185,129,0.2)" />
        <ExplainCard title={`Target FFMI — ${r.target.targetFFMI}`}             text={ai.targetAnalysis.ffmiExplanation}       bg="rgba(59,130,246,0.55)" border="rgba(59,130,246,0.2)" />
        <Card>
          <div style={{ fontSize:12, fontWeight:500, color:'#64748b', marginBottom:8 }}>Target body shape</div>
          <p style={{ fontSize:13, color:'#475569', lineHeight:1.6, margin:0 }}>{ai.targetAnalysis.targetBodyMeasurements}</p>
        </Card>

        {/* SECTION 3 — NUTRITION */}
        <SectionTitle>Daily nutrition targets</SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label:'Daily calories', value:r.dailyCalories.toLocaleString(), unit:'kcal', color:'#3b82f6' },
            { label:'Daily energy',   value:r.tdee.toLocaleString(),           unit:'kcal', color:'#1e293b' },
            { label:'Protein',        value:`${r.protein}g`,                  unit:'/day',  color:'#10b981' },
            { label:'Carbs',          value:`${r.carbs}g`,                    unit:'/day',  color:'#f59e0b' },
            { label:'Fat',            value:`${r.fat}g`,                      unit:'/day',  color:'#ef4444' },
            { label:'Fiber',          value:`${r.fiber}g`,                    unit:'/day',  color:'#3b82f6' },
          ].map(m => (
            <div key={m.label} style={{ ...G.glass, padding:'12px 14px' }}>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:500, color:m.color }}>{m.value}<span style={{ fontSize:11, color:'#94a3b8', marginLeft:2 }}>{m.unit}</span></div>
            </div>
          ))}
        </div>

        {/* SECTION 4 — DIET PLAN */}
        <SectionTitle>Weekly diet plan</SectionTitle>
        {!isPro ? (
          <div style={{ ...G.glass, padding:'32px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:12, textAlign:'center', marginBottom:10 }}>
            <div style={{ width:48, height:48, background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.20)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🔒</div>
            <div style={{ fontSize:15, fontWeight:500, color:'#1e293b' }}>Unlock weekly diet plan</div>
            <div style={{ fontSize:13, color:'#64748b', maxWidth:260, lineHeight:1.6 }}>Buy credits to unlock diet plan, PDF report and more</div>
            {!isLoggedIn ? (
              <button onClick={() => onLogin?.()} style={{ ...G.btn, padding:'11px 28px', width:'auto', marginTop:4 }}>Login to unlock →</button>
            ) : (
              <button onClick={onUpgrade} style={{ ...G.btn, padding:'11px 28px', width:'auto', marginTop:4 }}>Buy credits — from ₹29</button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {DAYS.map(day => {
              const plan = ai.weeklyDietPlan?.[day]
              if (!plan) return null
              const isVeg = plan.type?.toLowerCase().includes('veg') && !plan.type?.toLowerCase().includes('non')
              return (
                <div key={day} style={{ ...G.glass, overflow:'hidden' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 14px', borderBottom:'0.5px solid rgba(59,130,246,0.08)', background:'rgba(255,255,255,0.40)' }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>{day}</span>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10, background:isVeg?'rgba(16,185,129,0.10)':'rgba(239,68,68,0.10)', color:isVeg?'#10b981':'#ef4444' }}>
                      {isVeg?'🥗 Veg':'🍗 Non-veg'}
                    </span>
                  </div>
                  <div style={{ padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 12px' }}>
                    {[{label:'Breakfast',text:plan.breakfast},{label:'Lunch',text:plan.lunch},{label:'Dinner',text:plan.dinner},{label:'Snack',text:plan.snack}].map(m => (
                      <div key={m.label}>
                        <div style={{ fontSize:10, color:'#3b82f6', fontWeight:600, letterSpacing:'0.04em', marginBottom:2 }}>{m.label.toUpperCase()}</div>
                        <div style={{ fontSize:12, color:'#475569', lineHeight:1.4 }}>{m.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* SECTION 5 — WORKOUT + TIPS */}
        <SectionTitle>Workout recommendation</SectionTitle>
        <Card><p style={{ fontSize:13, color:'#475569', lineHeight:1.65, margin:0 }}>{ai.workoutRecommendation}</p></Card>

        <SectionTitle>Nutrition tips</SectionTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ai.nutritionTips.map((tip, i) => (
            <div key={i} style={{ ...G.glass, padding:'11px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', marginTop:5, flexShrink:0 }}/>
              <span style={{ fontSize:13, color:'#475569', lineHeight:1.5 }}>{tip}</span>
            </div>
          ))}
        </div>

        {/* BODY AGE */}
        {bodyAge && bodyAge.bodyAge > 0 && (
          <>
            <SectionTitle>Body age</SectionTitle>
            <div style={{ ...G.glass, padding:'18px 16px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>YOUR BODY AGE</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                    <span style={{ fontSize:40, fontWeight:500, color:(bodyAge?.difference??0)>=0?'#10b981':'#ef4444' }}>{bodyAge?.bodyAge}</span>
                    <span style={{ fontSize:13, color:'#94a3b8' }}>years</span>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>VS ACTUAL AGE</div>
                  <div style={{ fontSize:18, fontWeight:500, color:(bodyAge?.difference??0)>=0?'#10b981':'#ef4444' }}>
                    {(bodyAge?.difference??0)>=0?`${bodyAge?.difference} years younger`:`${Math.abs(bodyAge?.difference??0)} years older`}
                  </div>
                </div>
              </div>
              <div style={{ background:(bodyAge?.difference??0)>=0?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`0.5px solid ${(bodyAge?.difference??0)>=0?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`, borderRadius:10, padding:'10px 14px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:(bodyAge?.difference??0)>=0?'#10b981':'#ef4444', marginBottom:4 }}>{bodyAge?.rating}</div>
                <div style={{ fontSize:12, color:'#475569', lineHeight:1.5 }}>{bodyAge?.message}</div>
              </div>
            </div>
          </>
        )}

        {/* IDEAL MEASUREMENTS */}
        {ideal && ideal.chest > 0 && (
          <>
            <SectionTitle>Ideal measurements — Steve Reeves formula</SectionTitle>
            <div style={{ ...G.glass, overflow:'hidden', marginBottom:10 }}>
              <div style={{ padding:'10px 16px', background:'rgba(59,130,246,0.05)', borderBottom:'0.5px solid rgba(59,130,246,0.10)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', fontSize:10, color:'#94a3b8', fontWeight:600, letterSpacing:'0.06em' }}>
                  <span>MEASUREMENT</span><span style={{ textAlign:'center' }}>YOURS</span><span style={{ textAlign:'right' }}>IDEAL</span>
                </div>
              </div>
              {[
                { label:'Shoulder', yours: measurements?.aroundShoulder?measurements.aroundShoulder+'cm':'—', ideal:ideal.shoulder+'cm' },
                { label:'Chest',    yours: measurements?.chest?measurements.chest+'cm':'—',                   ideal:ideal.chest+'cm' },
                { label:'Waist',    yours: measurements?.stomach?measurements.stomach+'cm':'—',               ideal:ideal.waist+'cm' },
                { label:'Hips',     yours: measurements?.hip?measurements.hip+'cm':'—',                       ideal:ideal.hips+'cm' },
                { label:'Biceps',   yours: measurements?.bicep?measurements.bicep+'cm':'—',                   ideal:ideal.bicep+'cm' },
                { label:'Forearm',  yours: measurements?.forearm?measurements.forearm+'cm':'—',               ideal:ideal.forearm+'cm' },
                { label:'Thigh',    yours: measurements?.thigh?measurements.thigh+'cm':'—',                   ideal:ideal.thigh+'cm' },
                { label:'Calf',     yours: measurements?.calf?measurements.calf+'cm':'—',                     ideal:ideal.calf+'cm' },
              ].map((row, i) => (
                <div key={row.label} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'9px 16px', borderBottom:i<7?'0.5px solid rgba(59,130,246,0.07)':'none', background:i%2===0?'transparent':'rgba(255,255,255,0.30)' }}>
                  <span style={{ fontSize:13, color:'#475569' }}>{row.label}</span>
                  <span style={{ fontSize:13, textAlign:'center', color:'#94a3b8' }}>{row.yours}</span>
                  <span style={{ fontSize:13, textAlign:'right', fontWeight:500, color:'#3b82f6' }}>{row.ideal}</span>
                </div>
              ))}
              <div style={{ padding:'10px 16px', background:'rgba(59,130,246,0.04)', borderTop:'0.5px solid rgba(59,130,246,0.08)' }}>
                <p style={{ fontSize:11, color:'#94a3b8', lineHeight:1.5, margin:0 }}>Based on your height ({mHeight}cm) using Steve Reeves golden ratio formula. Aesthetic ideals — your personal goals may differ.</p>
              </div>
            </div>
          </>
        )}

        {/* TIMELINE */}
        <SectionTitle>Timeline to reach goal</SectionTitle>
        <div style={{ ...G.glassB, padding:'18px 16px', marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:'#3b82f6', marginBottom:2, fontWeight:500 }}>ESTIMATED TIME</div>
              <div style={{ fontSize:30, fontWeight:500, color:'#3b82f6' }}>{ai.duration.months}</div>
              <div style={{ fontSize:12, color:'#94a3b8' }}>~{ai.duration.weeks} weeks</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:2 }}>GOAL</div>
              <div style={{ fontSize:14, fontWeight:500, color:'#1e293b' }}>{goal}</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:'4 weeks', text:ai.duration.milestone4weeks, color:'#3b82f6' },
              { label:'8 weeks', text:ai.duration.milestone8weeks, color:'#f59e0b' },
              { label:'At goal', text:ai.duration.milestoneGoal,   color:'#10b981' },
            ].map(m => (
              <div key={m.label} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ fontSize:10, fontWeight:600, color:m.color, padding:'2px 8px', borderRadius:10, border:`0.5px solid ${m.color}`, whiteSpace:'nowrap' as const, marginTop:1 }}>{m.label}</div>
                <div style={{ fontSize:12, color:'#475569', lineHeight:1.5 }}>{m.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* WARNINGS */}
        {ai.warnings && ai.warnings.length > 0 && (
          <>
            <SectionTitle>Important notes</SectionTitle>
            <div style={{ background:'rgba(251,191,36,0.08)', border:'0.5px solid rgba(251,191,36,0.30)', borderRadius:12, padding:'14px 16px' }}>
              {ai.warnings.map((w, i) => (
                <p key={i} style={{ fontSize:13, color:'#92400e', lineHeight:1.5, marginBottom:i<ai.warnings.length-1?8:0 }}>• {w}</p>
              ))}
            </div>
          </>
        )}

        <p style={{ fontSize:11, color:'#94a3b8', textAlign:'center', lineHeight:1.6, margin:'20px 0 16px' }}>
          Based on US Navy body fat method and Mifflin St Jeor BMR formula. Not a substitute for medical advice.
        </p>

        {/* SAVE PROGRESS */}
        {measurements && (
          <div style={{ marginBottom:10 }}>
            {saved ? (
              <div style={{ background:'rgba(16,185,129,0.08)', border:'0.5px solid rgba(16,185,129,0.25)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:'#10b981', fontWeight:500 }}>✓ Progress saved!</span>
                <a href="/progress" style={{ fontSize:12, color:'#3b82f6', textDecoration:'none', fontWeight:500 }}>View progress →</a>
              </div>
            ) : (
              <button onClick={() => setShowSaveModal(true)} style={{ width:'100%', background:'rgba(59,130,246,0.08)', backdropFilter:'blur(12px)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:12, padding:'13px 0', color:'#3b82f6', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                💾 Save my progress
              </button>
            )}
            {hasSaved && !saved && (
              <a href="/progress" style={{ display:'block', textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:6, textDecoration:'none' }}>View previous progress →</a>
            )}
          </div>
        )}

        {/* DOWNLOAD PDF */}
        <div style={{ marginBottom:10 }}>
          <DownloadReport results={r} aiInsights={ai as any} goal={goal} name={name} isLoggedIn={isLoggedIn} onLogin={onLogin}/>
        </div>

        <button onClick={onRestart} style={{ width:'100%', background:'rgba(255,255,255,0.60)', backdropFilter:'blur(12px)', border:'0.5px solid rgba(255,255,255,0.88)', borderRadius:12, padding:12, color:'#64748b', fontSize:14, cursor:'pointer' }}>
          Analyze again
        </button>
      </div>

      {showSaveModal && measurements && (
        <SaveProgressModal onClose={() => setShowSaveModal(false)} measurements={measurements} results={r} aiInsights={ai}
          onSaved={() => { setSaved(true); setShowSaveModal(false) }}/>
      )}
    </>
  )
}