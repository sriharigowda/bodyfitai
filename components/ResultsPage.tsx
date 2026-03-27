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
    results: FitnessResults
    aiInsights: AiInsights
    goal: Goal
    name: string
    onRestart: () => void
    isPro?: boolean
    onUpgrade?: () => void
    measurements?: Measurements
    isLoggedIn?: boolean
    onLogin?: () => void
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
    return (
        <div style={{ background: accent ? 'rgba(232,255,71,0.05)' : 'rgba(255,255,255,0.04)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border: `0.5px solid ${accent ? 'rgba(232,255,71,0.18)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
            {children}
        </div>
    )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12, marginTop: 24 }}>
            {children}
        </div>
    )
}

function MetricRow({ label, current, target, currentColor }: { label: string; current: string; target?: string; currentColor?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--text2)' }}>{label}</span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontWeight: 500, color: currentColor || 'var(--text)' }}>{current}</span>
                {target && <>
                    <span style={{ color: 'var(--text3)', fontSize: 10 }}>→</span>
                    <span style={{ fontWeight: 500, color: 'var(--accent)' }}>{target}</span>
                </>}
            </div>
        </div>
    )
}

function ExplainCard({ title, text, color }: { title: string; text: string; color: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ background: color, padding: '6px 14px' }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', letterSpacing: '0.04em' }}>{title}</span>
            </div>
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{text}</div>
        </div>
    )
}

export default function ResultsPage({ results: r, aiInsights: ai, goal, name, onRestart, isPro = false, onUpgrade, measurements, isLoggedIn = false, onLogin }: Props) {
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [saved,         setSaved]         = useState(false)
    const [hasSaved,      setHasSaved]      = useState(false)

    useEffect(() => {
        getUser().then(u => {
            if (u) getSavedAnalyses().then(d => setHasSaved(d.length > 0)).catch(() => {})
        })
    }, [])

    const firstName = name.split(' ')[0]
    const bodyAge = r.bodyFatPercent && r.ffmi
        ? calculateBodyAge(r.bmr > 0 ? Math.round(r.bmr / 10) : 25, r.bodyFatPercent, r.ffmi, 'Male')
        : null
    const ideal = r.leanMass > 0
        ? calculateIdealMeasurements(r.leanMass > 0 ? 170 : 170, 'Male')
        : null

    return (
        <>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 48px' }}>

                {/* Greeting */}
                <div className="fade-up" style={{ background: 'rgba(232,255,71,0.05)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border: '0.5px solid rgba(232,255,71,0.18)', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 6 }}>YOUR REPORT</div>
                    <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Hi {firstName}! 👋</h2>
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{ai.greeting}</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>"{ai.motivation}"</p>
                </div>

                {/* SECTION 1 — CURRENT STATUS */}
                <SectionTitle>Current body status — {firstName}</SectionTitle>
                <Card>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>Current measurements</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                        {[
                            ['Body weight', `${r.leanMass + r.fatMass} kg`],
                            ['Body fat',    `${r.bodyFatPercent}%`],
                            ['Lean mass',   `${r.leanMass} kg`],
                            ['Fat mass',    `${r.fatMass} kg`],
                            ['FFMI',        `${r.ffmi}`],
                            ['BMR',         `${r.bmr} kcal`],
                        ].map(([l, v]) => (
                            <div key={l} style={{ padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text3)' }}>{l}</span>
                                <span style={{ fontWeight: 500 }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </Card>
                <ExplainCard title={`Body fat — ${r.bodyFatPercent}% (${r.bodyFatCategory})`}    text={ai.currentAnalysis.bodyFatExplanation}  color="rgba(240,149,149,0.4)" />
                <ExplainCard title={`Lean mass — ${r.leanMass} kg (${r.leanMassPercent}%)`}      text={ai.currentAnalysis.leanMassExplanation}  color="rgba(93,202,165,0.4)" />
                <ExplainCard title={`FFMI — ${r.ffmi} (${r.ffmiCategory})`}                      text={ai.currentAnalysis.ffmiExplanation}      color="rgba(133,183,235,0.4)" />
                <Card>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Body composition overview</div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{ai.currentAnalysis.bodyComposition}</p>
                </Card>

                {/* SECTION 2 — TARGET STATUS */}
                <SectionTitle>Target body status — {firstName}</SectionTitle>
                <Card>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>Current → Target</div>
                    <MetricRow label="Weight"    current={`${r.leanMass + r.fatMass} kg`} target={`${r.target.targetLeanMass + r.target.targetFatMass} kg`} />
                    <MetricRow label="Body fat"  current={`${r.bodyFatPercent}%`}          target={`${r.target.targetBodyFat}%`} currentColor="var(--red)" />
                    <MetricRow label="Lean mass" current={`${r.leanMass} kg`}              target={`${r.target.targetLeanMass} kg`} currentColor="var(--green)" />
                    <MetricRow label="FFMI"      current={`${r.ffmi}`}                      target={`${r.target.targetFFMI}`} />
                    <MetricRow label="Category"  current={r.bodyFatCategory}               target={r.target.targetBodyFatCategory} />
                </Card>
                <ExplainCard title={`Target body fat — ${r.target.targetBodyFat}%`}      text={ai.targetAnalysis.bodyFatExplanation}      color="rgba(240,149,149,0.25)" />
                <ExplainCard title={`Target lean mass — ${r.target.targetLeanMass} kg`}  text={ai.targetAnalysis.leanMassExplanation}     color="rgba(93,202,165,0.25)" />
                <ExplainCard title={`Target FFMI — ${r.target.targetFFMI}`}              text={ai.targetAnalysis.ffmiExplanation}         color="rgba(133,183,235,0.25)" />
                <Card>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Target body shape</div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{ai.targetAnalysis.targetBodyMeasurements}</p>
                </Card>

                {/* SECTION 3 — DAILY PLAN */}
                <SectionTitle>Daily nutrition targets</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                        { label: 'Daily calories', value: r.dailyCalories.toLocaleString(), unit: 'kcal', color: 'var(--accent)' },
                        { label: 'Daily energy',   value: r.tdee.toLocaleString(),           unit: 'kcal', color: 'var(--text)' },
                        { label: 'Protein',        value: `${r.protein}g`,                  unit: '/day',  color: 'var(--green)' },
                        { label: 'Carbs',          value: `${r.carbs}g`,                    unit: '/day',  color: 'var(--amber)' },
                        { label: 'Fat',            value: `${r.fat}g`,                      unit: '/day',  color: 'var(--red)' },
                        { label: 'Fiber',          value: `${r.fiber}g`,                    unit: '/day',  color: 'var(--blue)' },
                    ].map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px' }}>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{m.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 500, color: m.color }}>{m.value}<span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 2 }}>{m.unit}</span></div>
                        </div>
                    ))}
                </div>

                {/* SECTION 4 — WEEKLY DIET PLAN */}
                <SectionTitle>Weekly diet plan</SectionTitle>
                {!isPro ? (
                    <div style={{ marginBottom:10 }}>
                        <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'32px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:10, textAlign:'center' }}>
                            <div style={{ fontSize:28 }}>🔒</div>
                            <div style={{ fontSize:14, fontWeight:500, color:'var(--text)' }}>Unlock weekly diet plan</div>
                            <div style={{ fontSize:12, color:'var(--text2)', maxWidth:260, lineHeight:1.6 }}>Buy credits to unlock diet plan, PDF report and more</div>
                            {!isLoggedIn ? (
                                <button onClick={() => onLogin?.()} style={{ background:'var(--accent)', border:'none', borderRadius:10, padding:'11px 28px', fontSize:13, fontWeight:600, color:'#0a0a0a', cursor:'pointer', marginTop:4, boxShadow:'0 0 24px rgba(232,255,71,0.20)' }}>
                                    Login to unlock →
                                </button>
                            ) : (
                                <button onClick={onUpgrade} style={{ background:'var(--accent)', border:'none', borderRadius:10, padding:'11px 28px', fontSize:13, fontWeight:600, color:'#0a0a0a', cursor:'pointer', marginTop:4, boxShadow:'0 0 24px rgba(232,255,71,0.20)' }}>
                                    Buy credits — from ₹29
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {DAYS.map(day => {
                            const plan = ai.weeklyDietPlan?.[day]
                            if (!plan) return null
                            const isVeg = plan.type?.toLowerCase().includes('veg') && !plan.type?.toLowerCase().includes('non')
                            return (
                                <div key={day} style={{ background: 'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '0.5px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{day}</span>
                                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: isVeg ? 'rgba(93,202,165,0.15)' : 'rgba(240,149,149,0.15)', color: isVeg ? 'var(--green)' : 'var(--red)' }}>
                      {isVeg ? '🥗 Veg' : '🍗 Non-veg'}
                    </span>
                                    </div>
                                    <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                                        {[
                                            { label: 'Breakfast', text: plan.breakfast },
                                            { label: 'Lunch',     text: plan.lunch },
                                            { label: 'Dinner',    text: plan.dinner },
                                            { label: 'Snack',     text: plan.snack },
                                        ].map(m => (
                                            <div key={m.label}>
                                                <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.04em', marginBottom: 2 }}>{m.label.toUpperCase()}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{m.text}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* SECTION 5 — WORKOUT + NUTRITION TIPS */}
                <SectionTitle>Workout recommendation</SectionTitle>
                <Card><p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, margin: 0 }}>{ai.workoutRecommendation}</p></Card>

                <SectionTitle>Nutrition tips</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ai.nutritionTips.map((tip, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{tip}</span>
                        </div>
                    ))}
                </div>


                {/* BODY AGE + IDEAL MEASUREMENTS */}
                {bodyAge && bodyAge.bodyAge > 0 && (
                    <>
                        <SectionTitle>Body age</SectionTitle>
                        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 16px', marginBottom: 10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                                <div>
                                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>YOUR BODY AGE</div>
                                    <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                                        <span style={{ fontSize:36, fontWeight:500, color: (bodyAge?.difference ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{bodyAge?.bodyAge}</span>
                                        <span style={{ fontSize:13, color:'var(--text3)' }}>years</span>
                                    </div>
                                </div>
                                <div style={{ textAlign:'right' }}>
                                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>VS ACTUAL AGE</div>
                                    <div style={{ fontSize:22, fontWeight:500, color: bodyAge.difference >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                        {(bodyAge?.difference ?? 0) >= 0 ? ((bodyAge?.difference ?? 0) + ' years younger') : (Math.abs(bodyAge?.difference ?? 0) + ' years older')}
                                    </div>
                                </div>
                            </div>
                            <div style={{ background: (bodyAge?.difference ?? 0) >= 0 ? 'rgba(93,202,165,0.08)' : 'rgba(240,149,149,0.08)', border: '0.5px solid ' + ((bodyAge?.difference ?? 0) >= 0 ? 'rgba(93,202,165,0.2)' : 'rgba(240,149,149,0.2)'), borderRadius:10, padding:'10px 14px' }}>
                                <div style={{ fontSize:12, fontWeight:500, color: (bodyAge?.difference ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', marginBottom:4 }}>{bodyAge?.rating}</div>
                                <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>{bodyAge?.message}</div>
                            </div>
                        </div>
                    </>
                )}

                {ideal && ideal.chest > 0 && (
                    <>
                        <SectionTitle>Ideal measurements — Steve Reeves formula</SectionTitle>
                        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow:'hidden', marginBottom: 10 }}>
                            <div style={{ padding:'10px 16px 4px', background:'rgba(232,255,71,0.04)', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', fontSize:10, color:'var(--text3)', fontWeight:500, letterSpacing:'0.05em' }}>
                                    <span>MEASUREMENT</span><span style={{ textAlign:'center' }}>YOUR SIZE</span><span style={{ textAlign:'right' }}>IDEAL</span>
                                </div>
                            </div>
                            {[
                                { label:'Shoulder', yours: r.leanMass > 0 ? '—' : '—', ideal: `${ideal.shoulder}cm` },
                                { label:'Chest',    yours: '—', ideal: `${ideal.chest}cm` },
                                { label:'Waist',    yours: '—', ideal: `${ideal.waist}cm` },
                                { label:'Hips',     yours: '—', ideal: `${ideal.hips}cm` },
                                { label:'Biceps',   yours: '—', ideal: `${ideal.bicep}cm` },
                                { label:'Forearm',  yours: '—', ideal: `${ideal.forearm}cm` },
                                { label:'Thigh',    yours: '—', ideal: `${ideal.thigh}cm` },
                                { label:'Calf',     yours: '—', ideal: `${ideal.calf}cm` },
                            ].map((row, i) => (
                                <div key={row.label} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'9px 16px', borderBottom: i < 7 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                                    <span style={{ fontSize:13, color:'var(--text2)' }}>{row.label}</span>
                                    <span style={{ fontSize:13, textAlign:'center', color:'var(--text2)' }}>{row.yours}</span>
                                    <span style={{ fontSize:13, textAlign:'right', fontWeight:500, color:'var(--accent)' }}>{row.ideal}</span>
                                </div>
                            ))}
                            <div style={{ padding:'10px 16px', background:'rgba(232,255,71,0.03)', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>Based on your height using the Steve Reeves golden ratio formula. These are aesthetic ideals — your personal goals may differ.</p>
                            </div>
                        </div>
                    </>
                )}

                {/* SECTION 6 — TIMELINE */}
                <SectionTitle>Timeline to reach goal</SectionTitle>
                <div style={{ background: 'rgba(232,255,71,0.04)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border: '0.5px solid rgba(232,255,71,0.15)', borderRadius: 16, padding: '16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 2 }}>ESTIMATED TIME</div>
                            <div style={{ fontSize: 28, fontWeight: 500, color: 'var(--accent)' }}>{ai.duration.months}</div>
                            <div style={{ fontSize: 12, color: 'var(--text3)' }}>~{ai.duration.weeks} weeks</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>GOAL</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{goal}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                            { label: '4 weeks', text: ai.duration.milestone4weeks, color: 'var(--blue)' },
                            { label: '8 weeks', text: ai.duration.milestone8weeks, color: 'var(--amber)' },
                            { label: 'At goal', text: ai.duration.milestoneGoal,   color: 'var(--green)' },
                        ].map(m => (
                            <div key={m.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ fontSize: 10, fontWeight: 500, color: m.color, padding: '2px 8px', borderRadius: 10, border: `0.5px solid ${m.color}`, whiteSpace: 'nowrap', marginTop: 1 }}>{m.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{m.text}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Warnings */}
                {ai.warnings && ai.warnings.length > 0 && (
                    <>
                        <SectionTitle>Important notes</SectionTitle>
                        <div style={{ background: '#1a1000', border: '0.5px solid #3a2800', borderRadius: 12, padding: '14px 16px' }}>
                            {ai.warnings.map((w, i) => (
                                <p key={i} style={{ fontSize: 13, color: '#d4a050', lineHeight: 1.5, marginBottom: i < ai.warnings.length - 1 ? 8 : 0 }}>• {w}</p>
                            ))}
                        </div>
                    </>
                )}

                <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6, margin: '20px 0 16px' }}>
                    Based on US Navy body fat method and Mifflin St Jeor BMR formula. Not a substitute for medical advice.
                </p>

                {/* Save Progress Button */}
                {measurements && (
                    <div style={{ marginBottom: 10 }}>
                        {saved ? (
                            <div style={{ background:'rgba(93,202,165,0.1)', border:'0.5px solid rgba(93,202,165,0.3)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <span style={{ fontSize:13, color:'#5DCAA5' }}>Progress saved!</span>
                                <a href="/progress" style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>View progress →</a>
                            </div>
                        ) : (
                            <button onClick={() => setShowSaveModal(true)} style={{ width:'100%', background:'rgba(232,255,71,0.06)', backdropFilter:'blur(12px)', border:'0.5px solid rgba(232,255,71,0.22)', borderRadius:12, padding:'13px 0', color:'var(--accent)', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 0 20px rgba(232,255,71,0.06)' }}>
                                💾 Save my progress
                            </button>
                        )}
                        {hasSaved && !saved && (
                            <a href="/progress" style={{ display:'block', textAlign:'center', fontSize:12, color:'var(--text3)', marginTop:6, textDecoration:'none' }}>
                                View previous progress →
                            </a>
                        )}
                    </div>
                )}

                {/* Download PDF — always visible, handles payment internally */}
                <div style={{ marginBottom: 10 }}>
                    <DownloadReport results={r} aiInsights={ai as any} goal={goal} name={name} isLoggedIn={isLoggedIn} onLogin={onLogin} />
                </div>

                <button onClick={onRestart} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', backdropFilter:'blur(12px)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, color: 'var(--text2)', fontSize: 14, cursor: 'pointer' }}>
                    Analyze again
                </button>
            </div>

            {/* Save Progress Modal */}
            {showSaveModal && measurements && (
                <SaveProgressModal
                    onClose={() => setShowSaveModal(false)}
                    measurements={measurements}
                    results={r}
                    aiInsights={ai}
                    onSaved={() => { setSaved(true); setShowSaveModal(false) }}
                />
            )}
        </>
    )
}