'use client'
import type { FitnessResults, Goal } from '@/lib/calculations'
import DownloadReport from '@/components/DownloadReport'

interface DayPlan { type: string; breakfast: string; lunch: string; dinner: string; snack: string }
interface AiInsights {
    greeting: string
    summary: string
    currentAnalysis: { bodyFatExplanation: string; leanMassExplanation: string; ffmiExplanation: string; bodyComposition: string }
    targetAnalysis:  { bodyFatExplanation: string; leanMassExplanation: string; ffmiExplanation: string; targetBodyMeasurements: string }
    nutritionTips: string[]
    workoutRecommendation: string
    weeklyDietPlan: Record<string, DayPlan>
    duration: { weeks: number; months: string; milestone4weeks: string; milestone8weeks: string; milestoneGoal: string }
    motivation: string
    warnings: string[]
}

interface Props { results: FitnessResults; aiInsights: AiInsights; goal: Goal; name: string; onRestart: () => void; isPro?: boolean; onUpgrade?: () => void }

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function LockOverlay({ onUpgrade }: { onUpgrade?: () => void }) {
    return (
        <div style={{ position:'relative', marginBottom:10 }}>
            <div style={{ position:'absolute', inset:0, background:'rgba(10,10,10,0.85)', borderRadius:12, zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:20 }}>
                <div style={{ fontSize:22 }}>🔒</div>
                <div style={{ fontSize:14, fontWeight:500, color:'var(--text)', textAlign:'center' }}>Pro feature</div>
                <div style={{ fontSize:12, color:'var(--text2)', textAlign:'center' }}>Buy credits to unlock diet plan, PDF report and more</div>
                <button onClick={onUpgrade} style={{ background:'var(--accent)', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:500, color:'#0a0a0a', cursor:'pointer', marginTop:4 }}>
                    Buy credits — from ₹29
                </button>
            </div>
        </div>
    )
}



function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
    return (
        <div style={{ background: accent ? 'var(--accent-dim)' : 'var(--bg2)', border: `0.5px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
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
        <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ background: color, padding: '6px 14px' }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', letterSpacing: '0.04em' }}>{title}</span>
            </div>
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{text}</div>
        </div>
    )
}

export default function ResultsPage({ results: r, aiInsights: ai, goal, name, onRestart, isPro = false, onUpgrade }: Props) {
    const firstName = name.split(' ')[0]

    return (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 48px' }}>

            {/* ── Greeting ── */}
            <div className="fade-up" style={{ background: 'var(--accent-dim)', border: '0.5px solid var(--accent-border)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 6 }}>YOUR REPORT</div>
                <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                    Hi {firstName}! 👋
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{ai.greeting}</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>"{ai.motivation}"</p>
            </div>

            {/* ══════════════════════════════════════════════════════
          SECTION 1 — CURRENT STATUS
      ══════════════════════════════════════════════════════ */}
            <SectionTitle>Current body status — {firstName}</SectionTitle>

            {/* Current measurements overview */}
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

            {/* Body fat explanation */}
            <ExplainCard
                title={`Body fat — ${r.bodyFatPercent}% (${r.bodyFatCategory})`}
                text={ai.currentAnalysis.bodyFatExplanation}
                color="rgba(240,149,149,0.4)"
            />

            {/* Lean mass explanation */}
            <ExplainCard
                title={`Lean mass — ${r.leanMass} kg (${r.leanMassPercent}%)`}
                text={ai.currentAnalysis.leanMassExplanation}
                color="rgba(93,202,165,0.4)"
            />

            {/* FFMI explanation */}
            <ExplainCard
                title={`FFMI — ${r.ffmi} (${r.ffmiCategory})`}
                text={ai.currentAnalysis.ffmiExplanation}
                color="rgba(133,183,235,0.4)"
            />

            {/* Body composition summary */}
            <Card>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Body composition overview</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{ai.currentAnalysis.bodyComposition}</p>
            </Card>

            {/* ══════════════════════════════════════════════════════
          SECTION 2 — TARGET STATUS
      ══════════════════════════════════════════════════════ */}
            <SectionTitle>Target body status — {firstName}</SectionTitle>

            {/* Current → Target comparison */}
            <Card>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>Current → Target</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text2)' }}>current</span>
                    <span style={{ margin: '0 8px' }}>→</span>
                    <span style={{ color: 'var(--accent)' }}>target</span>
                </div>
                <MetricRow label="Weight"     current={`${r.leanMass + r.fatMass} kg`}  target={`${r.target.targetLeanMass + r.target.targetFatMass} kg`} />
                <MetricRow label="Body fat"   current={`${r.bodyFatPercent}%`}            target={`${r.target.targetBodyFat}%`} currentColor="var(--red)" />
                <MetricRow label="Lean mass"  current={`${r.leanMass} kg`}               target={`${r.target.targetLeanMass} kg`} currentColor="var(--green)" />
                <MetricRow label="Fat mass"   current={`${r.fatMass} kg`}                 target={`${r.target.targetFatMass} kg`} />
                <MetricRow label="FFMI"       current={`${r.ffmi}`}                        target={`${r.target.targetFFMI}`} />
                <div style={{ paddingTop: 4 }}>
                    <MetricRow label="Category" current={r.bodyFatCategory} target={r.target.targetBodyFatCategory} />
                </div>
            </Card>

            {/* Target body fat explanation */}
            <ExplainCard
                title={`Target body fat — ${r.target.targetBodyFat}% (${r.target.targetBodyFatCategory})`}
                text={ai.targetAnalysis.bodyFatExplanation}
                color="rgba(240,149,149,0.25)"
            />

            {/* Target lean mass explanation */}
            <ExplainCard
                title={`Target lean mass — ${r.target.targetLeanMass} kg`}
                text={ai.targetAnalysis.leanMassExplanation}
                color="rgba(93,202,165,0.25)"
            />

            {/* Target FFMI explanation */}
            <ExplainCard
                title={`Target FFMI — ${r.target.targetFFMI}`}
                text={ai.targetAnalysis.ffmiExplanation}
                color="rgba(133,183,235,0.25)"
            />

            {/* Target measurements */}
            <Card>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Target body shape</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{ai.targetAnalysis.targetBodyMeasurements}</p>
            </Card>

            {/* ══════════════════════════════════════════════════════
          SECTION 3 — DAILY PLAN
      ══════════════════════════════════════════════════════ */}
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
                    <div key={m.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 500, color: m.color }}>{m.value}<span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 2 }}>{m.unit}</span></div>
                    </div>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════
          SECTION 4 — WEEKLY DIET PLAN
      ══════════════════════════════════════════════════════ */}
            <SectionTitle>Weekly diet plan</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DAYS.map(day => {
                    const plan = ai.weeklyDietPlan?.[day]
                    if (!plan) return null
                    const isVeg = plan.type?.toLowerCase().includes('veg') && !plan.type?.toLowerCase().includes('non')
                    return (
                        <div key={day} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
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

            )
            {/* ══════════════════════════════════════════════════════
          SECTION 5 — WORKOUT + NUTRITION TIPS
      ══════════════════════════════════════════════════════ */}
            <SectionTitle>Workout recommendation</SectionTitle>
            <Card>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, margin: 0 }}>{ai.workoutRecommendation}</p>
            </Card>

            <SectionTitle>Nutrition tips</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ai.nutritionTips.map((tip, i) => (
                    <div key={i} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{tip}</span>
                    </div>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════
          SECTION 6 — DURATION / TIMELINE
      ══════════════════════════════════════════════════════ */}
            <SectionTitle>Timeline to reach goal</SectionTitle>
            <div style={{ background: 'var(--accent-dim)', border: '0.5px solid var(--accent-border)', borderRadius: 12, padding: '16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 2 }}>ESTIMATED TIME</div>
                        <div style={{ fontSize: 28, fontWeight: 500, color: 'var(--accent)' }}>{ai.duration.months}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>~{ai.duration.weeks} weeks</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>GOAL</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{goal}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>400 kcal deficit/day</div>
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
                Based on US Navy body fat method & Mifflin-St Jeor BMR formula. Not a substitute for medical advice.
            </p>

            <DownloadReport results={r} aiInsights={ai as any} goal={goal} name={name} />
            <button onClick={onRestart} style={{ width: '100%', background: 'transparent', border: '0.5px solid var(--border2)', borderRadius: 10, padding: 12, color: 'var(--text2)', fontSize: 14, cursor: 'pointer' }}>
                Analyze again
            </button>
        </div>
    )
}