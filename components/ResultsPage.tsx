'use client'
import type { FitnessResults } from '@/lib/calculations'
import type { Goal } from '@/lib/calculations'
import DownloadReport from '@/components/DownloadReport'

interface Props {
    results: FitnessResults
    aiInsights: {
        summary: string
        bodyComposition: string
        nutritionTips: string[]
        workoutRecommendation: string
        weeklyMealPlan: { breakfast: string; lunch: string; dinner: string; snack: string }
        motivation: string
        warnings: string[]
    }
    goal: Goal
    onRestart: () => void
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
    return (
        <div style={{
            background: accent ? 'var(--accent-dim)' : 'var(--bg2)',
            border: `0.5px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
            borderRadius: 12, padding: '14px 16px',
        }}>
            <div style={{ fontSize: 12, color: accent ? 'var(--accent)' : 'var(--text3)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: accent ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
        </div>
    )
}

function MacroCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
    return (
        <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{unit}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{label}</div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 12, textTransform: 'uppercase' }}>{title}</div>
            {children}
        </div>
    )
}

export default function ResultsPage({ results, aiInsights, goal, onRestart }: Props) {
    const r = results
    const ai = aiInsights

    return (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 48px' }}>

            {/* AI Summary */}
            <div className="fade-up" style={{
                background: 'var(--accent-dim)', border: '0.5px solid var(--accent-border)',
                borderRadius: 14, padding: '16px 18px', marginBottom: 24,
            }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 8 }}>
                    AI ANALYSIS
                </div>
                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{ai.summary}</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, fontStyle: 'italic' }}>"{ai.motivation}"</p>
            </div>

            {/* Top metrics */}
            <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <MetricCard label="Daily calories" value={r.dailyCalories.toLocaleString()} sub="kcal / day" accent />
                <MetricCard label="Body fat" value={`${r.bodyFatPercent}%`} sub={r.bodyFatCategory} />
                <MetricCard label="Lean mass" value={`${r.leanMass} kg`} sub="Muscle & bone" />
                <MetricCard label="Fat mass" value={`${r.fatMass} kg`} sub="Body fat mass" />
            </div>

            {/* Macros */}
            <Section title="Daily macro targets">
                <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <MacroCard label="Protein" value={r.protein} unit="g/day" color="var(--green)" />
                    <MacroCard label="Carbs" value={r.carbs} unit="g/day" color="var(--amber)" />
                    <MacroCard label="Fat" value={r.fat} unit="g/day" color="var(--red)" />
                    <MacroCard label="Fiber" value={r.fiber} unit="g/day" color="var(--blue)" />
                </div>
            </Section>

            {/* Stats table */}
            <Section title="Energy breakdown">
                <div className="fade-up-3" style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    {[
                        { label: 'Basal metabolic rate (BMR)', val: `${r.bmr.toLocaleString()} kcal` },
                        { label: 'Total daily energy (TDEE)', val: `${r.tdee.toLocaleString()} kcal` },
                        { label: 'Daily deficit / surplus', val: r.deficit >= 0 ? `+${r.deficit} kcal` : `${r.deficit} kcal` },
                        { label: 'Calories to burn daily', val: `${r.caloriesToBurn} kcal` },
                        { label: 'Estimated weeks to goal', val: r.weeksToGoal > 0 ? `~${r.weeksToGoal} weeks` : 'At goal!' },
                    ].map((row, i, arr) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '11px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none',
                            fontSize: 13,
                        }}>
                            <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                            <span style={{ fontWeight: 500 }}>{row.val}</span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Body composition insight */}
            <Section title="Body composition">
                <div className="fade-up-3" style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{ai.bodyComposition}</p>
                </div>
            </Section>

            {/* Nutrition tips */}
            <Section title="Nutrition tips">
                <div className="fade-up-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ai.nutritionTips.map((tip, i) => (
                        <div key={i} style={{
                            background: 'var(--bg2)', border: '0.5px solid var(--border)',
                            borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{tip}</span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Workout recommendation */}
            <Section title="Workout recommendation">
                <div className="fade-up-4" style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{ai.workoutRecommendation}</p>
                </div>
            </Section>

            {/* Sample meal plan */}
            <Section title="Sample meal plan">
                <div className="fade-up-5" style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    {Object.entries(ai.weeklyMealPlan).map(([meal, desc], i, arr) => (
                        <div key={meal} style={{
                            padding: '12px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none',
                        }}>
                            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>{meal}</div>
                            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.4 }}>{desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Warnings */}
            {ai.warnings && ai.warnings.length > 0 && (
                <Section title="Important notes">
                    <div style={{ background: '#1a1000', border: '0.5px solid #3a2800', borderRadius: 12, padding: '14px 16px' }}>
                        {ai.warnings.map((w, i) => (
                            <p key={i} style={{ fontSize: 13, color: '#d4a050', lineHeight: 1.5, marginBottom: i < ai.warnings.length - 1 ? 8 : 0 }}>• {w}</p>
                        ))}
                    </div>
                </Section>
            )}

            {/* Disclaimer */}
            <p className="fade-up-6" style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
                Based on US Navy body fat method & Mifflin-St Jeor BMR formula. Not a substitute for medical advice.
            </p>

            {/* Download PDF */}
            <div className="fade-up-6" style={{ marginBottom: 10 }}>
                <DownloadReport results={results} aiInsights={aiInsights} goal={goal} />
            </div>

            <button onClick={onRestart} className="fade-up-6" style={{
                width: '100%', background: 'transparent', border: '0.5px solid var(--border2)',
                borderRadius: 10, padding: 12, color: 'var(--text2)', fontSize: 14, cursor: 'pointer',
            }}>
                Analyze again
            </button>
        </div>
    )
}