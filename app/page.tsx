'use client'
import { useState } from 'react'
import type { Measurements, Goal, ActivityLevel, Gender } from '@/lib/calculations'
import ResultsPage from '@/components/ResultsPage'

type Unit = 'metric' | 'imperial'
type Screen = 'home' | 'form' | 'analyzing' | 'results'

const GOALS: { value: Goal; icon: string; title: string; desc: string }[] = [
  { value: 'Weight loss', icon: '🔥', title: 'Lose weight', desc: 'Burn fat, get lean' },
  { value: 'Muscle gain', icon: '💪', title: 'Build muscle', desc: 'Gain size & strength' },
  { value: 'Maintain weight', icon: '⚖️', title: 'Maintain', desc: 'Stay at current weight' },
  { value: 'Athletic performance', icon: '🏃', title: 'Performance', desc: 'Train like an athlete' },
]

const ACTIVITIES: { value: ActivityLevel; label: string; sub: string }[] = [
  { value: 'Sedentary', label: 'Sedentary', sub: 'Desk job, little exercise' },
  { value: 'Lightly active', label: 'Lightly active', sub: '1–3 workouts/week' },
  { value: 'Moderately active', label: 'Moderately active', sub: '3–5 workouts/week' },
  { value: 'Very active', label: 'Very active', sub: '6–7 workouts/week' },
]

const defaultForm = {
  age: '', gender: '', height: '', weight: '',
  neck: '', shoulder: '', chest: '', bicep: '',
  forearm: '', stomach: '', hip: '', thigh: '', calf: '',
  targetWeight: '',
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('home')
  const [step, setStep] = useState(1)
  const [unit, setUnit] = useState<Unit>('metric')
  const [form, setForm] = useState(defaultForm)
  const [goal, setGoal] = useState<Goal>('Weight loss')
  const [activity, setActivity] = useState<ActivityLevel>('Moderately active')
  const [analyzeMsg, setAnalyzeMsg] = useState('Calculating body fat percentage...')
  const [apiData, setApiData] = useState<any>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const u = (label: string) => unit === 'metric' ? `${label} (cm)` : `${label} (in)`
  const uw = unit === 'metric' ? 'Weight (kg)' : 'Weight (lbs)'
  const uh = unit === 'metric' ? 'Height (cm)' : 'Height (in)'

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    // Clear error for this field as user types
    if (fieldErrors[key]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  function validateStep(stepNum: number): boolean {
    const errors: Record<string, string> = {}

    if (stepNum === 1) {
      if (!form.age || parseInt(form.age) < 10 || parseInt(form.age) > 100)
        errors.age = 'Enter a valid age (10–100)'
      if (!form.gender)
        errors.gender = 'Please select your gender'
      if (!form.height || parseFloat(form.height) <= 0)
        errors.height = 'Enter a valid height'
      if (!form.weight || parseFloat(form.weight) <= 0)
        errors.weight = 'Enter a valid weight'
    }

    if (stepNum === 2) {
      const fields = ['neck', 'shoulder', 'chest', 'bicep', 'forearm', 'stomach']
      fields.forEach(f => {
        if (!(form as any)[f] || parseFloat((form as any)[f]) <= 0)
          errors[f] = 'Required'
      })
    }

    if (stepNum === 3) {
      const fields = ['hip', 'thigh', 'calf']
      fields.forEach(f => {
        if (!(form as any)[f] || parseFloat((form as any)[f]) <= 0)
          errors[f] = 'Required'
      })
    }

    if (stepNum === 4) {
      if (!form.targetWeight || parseFloat(form.targetWeight) <= 0)
        errors.targetWeight = 'Enter your target weight'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function tryNextStep(nextStepNum: number) {
    if (validateStep(nextStepNum - 1)) setStep(nextStepNum)
  }

  function tryAnalyze() {
    if (validateStep(4)) runAnalysis()
  }

  function toMetric(v: string, type: 'weight' | 'length') {
    const n = parseFloat(v) || 0
    if (unit === 'imperial') {
      return type === 'weight' ? n * 0.453592 : n * 2.54
    }
    return n
  }

  async function runAnalysis() {
    setScreen('analyzing')
    const msgs = [
      'Calculating body fat percentage...',
      'Estimating your BMR & TDEE...',
      'Building your macro plan...',
      'Asking AI for personalized insights...',
    ]
    let i = 0
    const iv = setInterval(() => {
      i++
      if (i < msgs.length) setAnalyzeMsg(msgs[i])
    }, 900)

    try {
      const measurements: Measurements = {
        age: parseInt(form.age) || 25,
        gender: (form.gender as Gender) || 'Male',
        height: toMetric(form.height, 'length') || 175,
        weight: toMetric(form.weight, 'weight') || 75,
        neck: toMetric(form.neck, 'length') || 38,
        shoulder: toMetric(form.shoulder, 'length') || 46,
        chest: toMetric(form.chest, 'length') || 95,
        bicep: toMetric(form.bicep, 'length') || 33,
        forearm: toMetric(form.forearm, 'length') || 28,
        stomach: toMetric(form.stomach, 'length') || 85,
        hip: toMetric(form.hip, 'length') || 95,
        thigh: toMetric(form.thigh, 'length') || 55,
        calf: toMetric(form.calf, 'length') || 37,
        goal,
        targetWeight: toMetric(form.targetWeight, 'weight') || toMetric(form.weight, 'weight') - 5,
        activityLevel: activity,
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements }),
      })
      const data = await res.json()
      clearInterval(iv)
      if (data.error) { setError(data.error); setScreen('form'); return }
      setApiData(data)
      setScreen('results')
    } catch (e) {
      clearInterval(iv)
      setError('Something went wrong. Please try again.')
      setScreen('form')
    }
  }

  const progress = `${step * 25}%`

  const errBorder = (key: string) => fieldErrors[key]
      ? '0.5px solid #e24b4a'
      : '0.5px solid var(--border2)'
  const errBg = (key: string) => fieldErrors[key] ? 'rgba(226,75,74,0.06)' : undefined
  const FieldErr = ({ k }: { k: string }) => fieldErrors[k]
      ? <div style={{ fontSize: 11, color: '#e24b4a', marginTop: 4 }}>{fieldErrors[k]}</div>
      : null
  const stepHasErrors = Object.keys(fieldErrors).length > 0

  return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* NAV */}
        <nav style={{
          background: 'var(--bg2)', borderBottom: '0.5px solid var(--border)',
          padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px', cursor: 'pointer' }}
               onClick={() => { setScreen('home'); setStep(1); }}>
            <span style={{ color: 'var(--text)' }}>Body</span>
            <span style={{ color: 'var(--text)' }}>Fit</span>
            <span style={{ color: 'var(--accent)' }}>AI</span>
          </div>
          {screen === 'form' && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Step {step} of 4</span>
          )}
          {screen === 'results' && (
              <button onClick={() => { setScreen('home'); setStep(1); setForm(defaultForm); setApiData(null) }}
                      style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Start over
              </button>
          )}
        </nav>

        {/* HOME */}
        {screen === 'home' && (
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px' }}>
              <div className="fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{
                  display: 'inline-block', background: 'var(--accent-dim)', border: '0.5px solid var(--accent-border)',
                  borderRadius: 20, padding: '4px 14px', fontSize: 12, color: 'var(--accent)',
                  fontWeight: 500, marginBottom: 20, letterSpacing: '0.04em',
                }}>
                  AI-POWERED FITNESS ANALYSIS
                </div>
                <h1 style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.2, marginBottom: 14, letterSpacing: '-0.5px' }}>
                  Your body.<br />
                  <span style={{ color: 'var(--accent)' }}>Analyzed by AI.</span>
                </h1>
                <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 32, maxWidth: 360, margin: '0 auto 32px' }}>
                  Enter 12 body measurements and your goal. Get a personalized calorie target, macro split, and fat loss roadmap — powered by Claude AI.
                </p>
                <button onClick={() => setScreen('form')} style={{
                  background: 'var(--accent)', color: '#0a0a0a', border: 'none',
                  padding: '14px 40px', borderRadius: 10, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', width: '100%', maxWidth: 300,
                }}>
                  Get my free plan
                </button>
              </div>

              <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { title: 'Body fat %', desc: 'US Navy method from 12 measurements' },
                  { title: 'Calorie targets', desc: 'Daily intake + calories to burn' },
                  { title: 'Macro split', desc: 'Protein, carbs, fat & fiber' },
                  { title: 'AI insights', desc: 'Personalized tips & meal ideas' },
                ].map((f, i) => (
                    <div key={i} style={{
                      background: 'var(--bg2)', border: '0.5px solid var(--border)',
                      borderRadius: 12, padding: '16px 14px',
                    }}>
                      <div style={{
                        width: 28, height: 28, background: 'var(--accent-dim)',
                        borderRadius: 6, marginBottom: 8,
                      }} />
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{f.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{f.desc}</div>
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* FORM */}
        {screen === 'form' && (
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px' }}>
              {/* Progress bar */}
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 28 }}>
                <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, width: progress, transition: 'width 0.3s' }} />
              </div>

              {error && (
                  <div style={{ background: '#2a1010', border: '0.5px solid #5a2020', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f09595' }}>
                    {error}
                  </div>
              )}

              {stepHasErrors && (
                  <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.4)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e24b4a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⚠</span> Please fill in all required fields to continue.
                  </div>
              )}

              {/* STEP 1 */}
              {step === 1 && (
                  <div className="fade-up">
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.08em', marginBottom: 6 }}>STEP 1 OF 4</div>
                    <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Basic info</h2>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Tell us about yourself</p>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                      {(['metric', 'imperial'] as Unit[]).map(u => (
                          <button key={u} onClick={() => setUnit(u)} style={{
                            padding: '7px 16px', borderRadius: 8,
                            border: `0.5px solid ${unit === u ? 'var(--accent)' : 'var(--border2)'}`,
                            background: unit === u ? 'var(--accent-dim)' : 'transparent',
                            color: unit === u ? 'var(--accent)' : 'var(--text3)',
                            fontSize: 12, cursor: 'pointer',
                          }}>
                            {u === 'metric' ? 'Metric (cm / kg)' : 'Imperial (in / lbs)'}
                          </button>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, color: fieldErrors.age ? '#e24b4a' : 'var(--text2)', display: 'block', marginBottom: 6 }}>Age *</label>
                        <input type="number" placeholder="25" value={form.age} onChange={e => set('age', e.target.value)}
                               style={{ border: errBorder('age'), background: errBg('age') }} />
                        <FieldErr k="age" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: fieldErrors.gender ? '#e24b4a' : 'var(--text2)', display: 'block', marginBottom: 6 }}>Gender *</label>
                        <select value={form.gender} onChange={e => set('gender', e.target.value)}
                                style={{ border: errBorder('gender'), background: errBg('gender') }}>
                          <option value="">Select</option>
                          <option>Male</option>
                          <option>Female</option>
                        </select>
                        <FieldErr k="gender" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: fieldErrors.height ? '#e24b4a' : 'var(--text2)', display: 'block', marginBottom: 6 }}>{uh} *</label>
                        <input type="number" placeholder={unit === 'metric' ? '175' : '69'} value={form.height} onChange={e => set('height', e.target.value)}
                               style={{ border: errBorder('height'), background: errBg('height') }} />
                        <FieldErr k="height" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: fieldErrors.weight ? '#e24b4a' : 'var(--text2)', display: 'block', marginBottom: 6 }}>{uw} *</label>
                        <input type="number" placeholder={unit === 'metric' ? '75' : '165'} value={form.weight} onChange={e => set('weight', e.target.value)}
                               style={{ border: errBorder('weight'), background: errBg('weight') }} />
                        <FieldErr k="weight" />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setScreen('home'); setFieldErrors({}) }} style={{
                        flex: 1, background: 'transparent', border: '0.5px solid var(--border2)',
                        borderRadius: 10, padding: 12, color: 'var(--text2)', fontSize: 14, cursor: 'pointer',
                      }}>Back</button>
                      <button onClick={() => tryNextStep(2)} style={{
                        flex: 2, background: 'var(--accent)', border: 'none',
                        borderRadius: 10, padding: 12, color: '#0a0a0a', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                      }}>Continue</button>
                    </div>
                  </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                  <div className="fade-up">
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.08em', marginBottom: 6 }}>STEP 2 OF 4</div>
                    <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Upper body</h2>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Use a soft tape measure. Measure at the widest point.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      {[
                        { key: 'neck', label: 'Neck', ph: '38' },
                        { key: 'shoulder', label: 'Shoulders', ph: '46' },
                        { key: 'chest', label: 'Chest', ph: '95' },
                        { key: 'bicep', label: 'Biceps', ph: '33' },
                        { key: 'forearm', label: 'Forearm', ph: '28' },
                        { key: 'stomach', label: 'Stomach', ph: '85' },
                      ].map(f => (
                          <div key={f.key}>
                            <label style={{ fontSize: 12, color: fieldErrors[f.key] ? '#e24b4a' : 'var(--text2)', display: 'block', marginBottom: 6 }}>{u(f.label)} *</label>
                            <input type="number" placeholder={f.ph} value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
                                   style={{ border: errBorder(f.key), background: errBg(f.key) }} />
                            <FieldErr k={f.key} />
                          </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setStep(1); setFieldErrors({}) }} style={{ flex: 1, background: 'transparent', border: '0.5px solid var(--border2)', borderRadius: 10, padding: 12, color: 'var(--text2)', fontSize: 14, cursor: 'pointer' }}>Back</button>
                      <button onClick={() => tryNextStep(3)} style={{ flex: 2, background: 'var(--accent)', border: 'none', borderRadius: 10, padding: 12, color: '#0a0a0a', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Continue</button>
                    </div>
                  </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                  <div className="fade-up">
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.08em', marginBottom: 6 }}>STEP 3 OF 4</div>
                    <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Lower body</h2>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Measure while standing, muscles relaxed.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      {[
                        { key: 'hip', label: 'Hips', ph: '95' },
                        { key: 'thigh', label: 'Thighs', ph: '55' },
                        { key: 'calf', label: 'Calves', ph: '37' },
                      ].map(f => (
                          <div key={f.key}>
                            <label style={{ fontSize: 12, color: fieldErrors[f.key] ? '#e24b4a' : 'var(--text2)', display: 'block', marginBottom: 6 }}>{u(f.label)} *</label>
                            <input type="number" placeholder={f.ph} value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
                                   style={{ border: errBorder(f.key), background: errBg(f.key) }} />
                            <FieldErr k={f.key} />
                          </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setStep(2); setFieldErrors({}) }} style={{ flex: 1, background: 'transparent', border: '0.5px solid var(--border2)', borderRadius: 10, padding: 12, color: 'var(--text2)', fontSize: 14, cursor: 'pointer' }}>Back</button>
                      <button onClick={() => tryNextStep(4)} style={{ flex: 2, background: 'var(--accent)', border: 'none', borderRadius: 10, padding: 12, color: '#0a0a0a', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Continue</button>
                    </div>
                  </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                  <div className="fade-up">
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.08em', marginBottom: 6 }}>STEP 4 OF 4</div>
                    <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Your goal</h2>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>What do you want to achieve?</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                      {GOALS.map(g => (
                          <div key={g.value} onClick={() => setGoal(g.value)} style={{
                            background: goal === g.value ? 'var(--accent-dim)' : 'var(--bg2)',
                            border: `0.5px solid ${goal === g.value ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: 12, padding: '14px 12px', cursor: 'pointer', textAlign: 'center',
                          }}>
                            <div style={{ fontSize: 22, marginBottom: 6 }}>{g.icon}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{g.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{g.desc}</div>
                          </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, color: fieldErrors.targetWeight ? '#e24b4a' : 'var(--text2)', display: 'block', marginBottom: 6 }}>
                        Target {unit === 'metric' ? 'weight (kg)' : 'weight (lbs)'} *
                      </label>
                      <input type="number" placeholder={unit === 'metric' ? '70' : '154'} value={form.targetWeight} onChange={e => set('targetWeight', e.target.value)}
                             style={{ border: errBorder('targetWeight'), background: errBg('targetWeight') }} />
                      <FieldErr k="targetWeight" />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 10 }}>Activity level</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ACTIVITIES.map(a => (
                            <div key={a.value} onClick={() => setActivity(a.value)} style={{
                              background: activity === a.value ? 'var(--accent-dim)' : 'var(--bg2)',
                              border: `0.5px solid ${activity === a.value ? 'var(--accent)' : 'var(--border)'}`,
                              borderRadius: 10, padding: '11px 14px', cursor: 'pointer',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                              <span style={{ fontSize: 13 }}>{a.label}</span>
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{a.sub}</span>
                            </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setStep(3); setFieldErrors({}) }} style={{ flex: 1, background: 'transparent', border: '0.5px solid var(--border2)', borderRadius: 10, padding: 12, color: 'var(--text2)', fontSize: 14, cursor: 'pointer' }}>Back</button>
                      <button onClick={tryAnalyze} style={{ flex: 2, background: 'var(--accent)', border: 'none', borderRadius: 10, padding: 12, color: '#0a0a0a', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                        Analyze my body
                      </button>
                    </div>
                  </div>
              )}
            </div>
        )}

        {/* ANALYZING */}
        {screen === 'analyzing' && (
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
              <div style={{
                width: 44, height: 44, border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
              }} />
              <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Analyzing your body...</h3>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>{analyzeMsg}</p>
            </div>
        )}

        {/* RESULTS */}
        {screen === 'results' && apiData && (
            <ResultsPage
                results={apiData.results}
                aiInsights={apiData.aiInsights}
                goal={goal}
                onRestart={() => { setScreen('home'); setStep(1); setForm(defaultForm); setApiData(null) }}
            />
        )}
      </div>
  )
}