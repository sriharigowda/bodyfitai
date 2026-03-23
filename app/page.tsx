'use client'
import { useState, useEffect, useRef } from 'react'
import type { Measurements, Goal, ActivityLevel, Gender, DietType, DietDays } from '@/lib/calculations'
import ResultsPage from '@/components/ResultsPage'
import UpgradeModal from '@/components/UpgradeModal'

type Unit   = 'metric' | 'imperial'
type Screen = 'home' | 'form' | 'analyzing' | 'results'

const GOALS = [
  { value: 'Weight loss'          as Goal, icon: '🔥', title: 'Lose weight',  desc: 'Burn fat, get lean' },
  { value: 'Muscle gain'          as Goal, icon: '💪', title: 'Build muscle', desc: 'Gain size & strength' },
  { value: 'Maintain weight'      as Goal, icon: '⚖️', title: 'Maintain',     desc: 'Stay at current weight' },
  { value: 'Athletic performance' as Goal, icon: '🏃', title: 'Performance',  desc: 'Train like an athlete' },
]
const ACTIVITIES = [
  { value: 'Sedentary'         as ActivityLevel, label: 'Sedentary',         sub: 'Desk job, little exercise' },
  { value: 'Lightly active'    as ActivityLevel, label: 'Lightly active',    sub: '1–3 workouts/week' },
  { value: 'Moderately active' as ActivityLevel, label: 'Moderately active', sub: '3–5 workouts/week' },
  { value: 'Very active'       as ActivityLevel, label: 'Very active',       sub: '6–7 workouts/week' },
]
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const defaultForm = {
  name:'', age:'', gender:'', height:'', weight:'',
  neck:'', aroundShoulder:'', chest:'', bicep:'', forearm:'', wrist:'', stomach:'',
  hip:'', thigh:'', knee:'', calf:'', ankle:'', targetWeight:'',
}

export default function Home() {
  const [screen,      setScreen]      = useState<Screen>('home')
  const [step,        setStep]        = useState(1)
  const [unit,        setUnit]        = useState<Unit>('metric')
  const [form,        setForm]        = useState(defaultForm)
  const [goal,        setGoal]        = useState<Goal>('Weight loss')
  const [activity,    setActivity]    = useState<ActivityLevel>('Moderately active')
  const [dietType,    setDietType]    = useState<DietType>('Non-vegetarian')
  const [nonVegDays,  setNonVegDays]  = useState<string[]>(['Monday','Wednesday','Friday','Saturday'])
  const [analyzeMsg,  setAnalyzeMsg]  = useState('Calculating body fat percentage...')
  const [apiData,     setApiData]     = useState<any>(null)
  const [error,       setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({})
  const [freeLeft,    setFreeLeft]    = useState<number | undefined>(undefined)
  const [credits,     setCredits]     = useState(0)
  const [isPro,       setIsPro]       = useState(false)
  const [showUpgrade,   setShowUpgrade]   = useState(false)
  const blockedRef = useRef(false)  // tracks if analysis was blocked by limit
  const [showPopup, setShowPopup] = useState(false)
  const [userIp,      setUserIp]      = useState('anonymous')

  useEffect(() => {
    const seen = localStorage.getItem('bodyfitai_popup_seen')
    if (!seen) {
      setTimeout(() => setShowPopup(true), 2000)
      localStorage.setItem('bodyfitai_popup_seen', '1')
    }
  }, [])

  function refreshUsage() {
    fetch('/api/usage')
        .then(r => r.json())
        .then(d => {
          setFreeLeft(d.freeLeft ?? 1)
          setCredits(d.credits ?? 0)
          setIsPro(d.isPro ?? false)
          if (d.identifier) setUserIp(d.identifier)
        })
        .catch(() => {})
  }

  useEffect(() => {
    refreshUsage()
  }, [])

  const u  = (lbl: string) => `${lbl} (${unit==='metric'?'cm':'in'})`
  const uw = unit==='metric' ? 'Weight (kg)' : 'Weight (lbs)'
  const uh = unit==='metric' ? 'Height (cm)' : 'Height (in)'

  const setF = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (fieldErrors[k]) setFieldErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const toggleDay = (d: string) =>
      setNonVegDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])

  function validate(n: number) {
    const e: Record<string,string> = {}
    if (n === 1) {
      if (!form.name.trim())                       e.name   = 'Please enter your name'
      if (!form.age || +form.age < 10 || +form.age > 100) e.age = 'Valid age (10–100)'
      if (!form.gender)                            e.gender = 'Select gender'
      if (!form.height || +form.height <= 0)       e.height = 'Enter height'
      if (!form.weight || +form.weight <= 0)       e.weight = 'Enter weight'
    }
    if (n === 2) {
      ;['neck','aroundShoulder','chest','bicep','forearm','wrist','stomach'].forEach(k => {
        if (!(form as any)[k] || +((form as any)[k]) <= 0) e[k] = 'Required'
      })
    }
    if (n === 3) {
      ;['hip','thigh','knee','calf','ankle'].forEach(k => {
        if (!(form as any)[k] || +((form as any)[k]) <= 0) e[k] = 'Required'
      })
    }
    if (n === 4) {
      if (!form.targetWeight || +form.targetWeight <= 0) e.targetWeight = 'Enter target weight'
      if (dietType === 'Mixed' && nonVegDays.length === 0) e.nonVegDays = 'Pick at least one non-veg day'
    }
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  const tryNext    = (n: number) => { if (validate(n - 1)) setStep(n) }
  const tryAnalyze = ()          => { if (validate(4)) runAnalysis() }

  const toM = (v: string, t: 'weight' | 'length') => {
    const n = parseFloat(v) || 0
    return unit === 'imperial' ? (t === 'weight' ? n * 0.453592 : n * 2.54) : n
  }

  async function runAnalysis() {
    setScreen('analyzing')
    const msgs = [
      'Calculating body fat...',
      'Estimating BMR & TDEE...',
      'Building macro plan...',
      'Generating AI insights...',
    ]
    let i = 0
    const iv = setInterval(() => { i++; if (i < msgs.length) setAnalyzeMsg(msgs[i]) }, 900)

    try {
      const diet: DietDays = {
        type: dietType,
        nonVegDays: dietType === 'Vegetarian' ? [] : dietType === 'Non-vegetarian' ? DAYS : nonVegDays,
      }
      const measurements: Measurements = {
        name:           form.name.trim(),
        age:            +form.age || 25,
        gender:         (form.gender as Gender) || 'Male',
        height:         toM(form.height, 'length') || 175,
        weight:         toM(form.weight, 'weight') || 75,
        neck:           toM(form.neck, 'length') || 38,
        aroundShoulder: toM(form.aroundShoulder, 'length') || 110,
        chest:          toM(form.chest, 'length') || 95,
        bicep:          toM(form.bicep, 'length') || 33,
        forearm:        toM(form.forearm, 'length') || 28,
        wrist:          toM(form.wrist, 'length') || 17,
        stomach:        toM(form.stomach, 'length') || 85,
        hip:            toM(form.hip, 'length') || 95,
        thigh:          toM(form.thigh, 'length') || 55,
        knee:           toM(form.knee, 'length') || 37,
        calf:           toM(form.calf, 'length') || 37,
        ankle:          toM(form.ankle, 'length') || 22,
        goal,
        targetWeight:   toM(form.targetWeight, 'weight') || toM(form.weight, 'weight') - 5,
        activityLevel:  activity,
        diet,
      }

      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements }),
      })
      const data = await res.json()
      clearInterval(iv)

      if (data.error === 'FREE_LIMIT_REACHED') {
        setScreen('form')  // keep form data intact
        blockedRef.current = true
        setShowUpgrade(true)
        return
      }
      if (data.error) {
        setError(data.error)
        setScreen('form')
        return
      }

      setApiData(data)
      setScreen('results')
      refreshUsage()  // update credits display after analysis
    } catch {
      clearInterval(iv)
      setError('Something went wrong. Please try again.')
      setScreen('form')
    }
  }

  const progress  = `${step * 25}%`
  const eb        = (k: string) => fieldErrors[k] ? '0.5px solid #e24b4a' : '0.5px solid var(--border2)'
  const ebg       = (k: string) => fieldErrors[k] ? 'rgba(226,75,74,0.06)' : undefined
  const FE        = ({ k }: { k: string }) =>
      fieldErrors[k] ? <div style={{ fontSize:11, color:'#e24b4a', marginTop:4 }}>{fieldErrors[k]}</div> : null
  const hasErr    = Object.keys(fieldErrors).length > 0
  const backS     = { flex:1, background:'transparent', border:'0.5px solid var(--border2)', borderRadius:10, padding:12, color:'var(--text2)', fontSize:14, cursor:'pointer' } as const
  const nextS     = { flex:2, background:'var(--accent)', border:'none', borderRadius:10, padding:12, color:'#0a0a0a', fontSize:14, fontWeight:500, cursor:'pointer' } as const


  return (
      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

        {/* NAV */}
        <nav style={{ background:'var(--bg2)', borderBottom:'0.5px solid var(--border)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ fontSize:18, fontWeight:500, letterSpacing:'-0.3px', cursor:'pointer' }}
               onClick={() => { setScreen('home'); setStep(1) }}>
            <span style={{ color:'var(--text)' }}>Body</span>
            <span style={{ color:'var(--text)' }}>Fit</span>
            <span style={{ color:'var(--accent)' }}>AI</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {screen === 'form' && <span style={{ fontSize:12, color:'var(--text3)' }}>Step {step} of 4</span>}
            {screen === 'results' && (
                <button onClick={() => { setScreen('home'); setStep(1); setForm(defaultForm); setApiData(null) }}
                        style={{ fontSize:12, color:'var(--text3)', background:'none', border:'none', cursor:'pointer' }}>
                  Start over
                </button>
            )}
            {isPro
                ? <span style={{ fontSize:11, background:'rgba(93,202,165,0.15)', color:'#5DCAA5', padding:'3px 10px', borderRadius:10, fontWeight:500 }}>Pro</span>
                : (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text3)' }}>
                  {freeLeft === undefined ? '' : freeLeft > 0 ? `${freeLeft} free left` : `${credits} credits`}
                </span>
                      <button onClick={() => { blockedRef.current = false; setShowUpgrade(true) }} style={{ fontSize:11, background:'var(--accent-dim)', border:'0.5px solid var(--accent-border)', color:'var(--accent)', padding:'3px 10px', borderRadius:10, cursor:'pointer', fontWeight:500 }}>
                        {credits === 0 && freeLeft === 0 ? 'Buy credits' : '+ Add more'}
                      </button>
                    </div>
                )
            }
          </div>
        </nav>

        {/* COMING SOON BANNER */}
        <div style={{ background:'linear-gradient(90deg,#1a2a00,#0a1a00,#1a2a00)', borderBottom:'0.5px solid rgba(232,255,71,0.2)', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <span style={{ fontSize:11, background:'rgba(232,255,71,0.15)', color:'#e8ff47', padding:'2px 8px', borderRadius:10, fontWeight:500, letterSpacing:'0.04em' }}>COMING SOON</span>
          <span style={{ fontSize:12, color:'#a0b060' }}>Save your results · Weekly body tracking · Progress history</span>
          <span style={{ fontSize:12, color:'#e8ff47', marginLeft:4 }}>🚀</span>
        </div>

        {/* HOME */}
        {screen === 'home' && (
            <div style={{ maxWidth:480, margin:'0 auto', padding:'40px 20px' }}>
              <div className="fade-up" style={{ textAlign:'center', marginBottom:40 }}>
                <div style={{ display:'inline-block', background:'var(--accent-dim)', border:'0.5px solid var(--accent-border)', borderRadius:20, padding:'4px 14px', fontSize:12, color:'var(--accent)', fontWeight:500, marginBottom:20, letterSpacing:'0.04em' }}>
                  AI-POWERED FITNESS ANALYSIS
                </div>
                <h1 style={{ fontSize:36, fontWeight:500, lineHeight:1.2, marginBottom:14, letterSpacing:'-0.5px' }}>
                  Your body.<br />
                  <span style={{ color:'var(--accent)' }}>Analyzed by AI.</span>
                </h1>
                <p style={{ fontSize:15, color:'var(--text2)', lineHeight:1.7, margin:'0 auto 32px', maxWidth:360 }}>
                  Enter your body measurements and get a personalized calorie target, macro split, FFMI score, and full diet plan.
                </p>
                <button onClick={() => setScreen('form')} style={{ background:'var(--accent)', color:'#0a0a0a', border:'none', padding:'14px 40px', borderRadius:10, fontSize:15, fontWeight:500, cursor:'pointer', width:'100%', maxWidth:300, display:'block', margin:'0 auto 12px' }}>
                  Get my free plan
                </button>
                {!isPro && (
                    <p style={{ fontSize:12, color:'var(--text3)', marginTop:8 }}>
                      {freeLeft === undefined ? '' : freeLeft > 0
                          ? `${freeLeft} free ${freeLeft === 1 ? 'analysis' : 'analyses'} remaining`
                          : credits > 0 ? `${credits} credits available` : '0 analyses left — buy credits to continue'}
                    </p>
                )}
              </div>
              <div className="fade-up-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { title:'Body fat % + FFMI', desc:'Full body composition analysis' },
                  { title:'Calorie targets',   desc:'Daily intake + burn goals' },
                  { title:'Macro split',       desc:'Protein, carbs, fat & fiber' },
                  { title:'Diet plan',         desc:'Veg/non-veg day-by-day' },
                ].map((f, i) => (
                    <div key={i} style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:12, padding:'16px 14px' }}>
                      <div style={{ width:28, height:28, background:'var(--accent-dim)', borderRadius:6, marginBottom:8 }} />
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>{f.title}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.4 }}>{f.desc}</div>
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* FORM */}
        {screen === 'form' && (
            <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 20px' }}>
              <div style={{ height:3, background:'var(--border)', borderRadius:2, marginBottom:28 }}>
                <div style={{ height:3, background:'var(--accent)', borderRadius:2, width:progress, transition:'width 0.3s' }} />
              </div>
              {error && (
                  <div style={{ background:'#2a1010', border:'0.5px solid #5a2020', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#f09595' }}>
                    {error}
                  </div>
              )}
              {hasErr && (
                  <div style={{ background:'rgba(226,75,74,0.08)', border:'0.5px solid rgba(226,75,74,0.4)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#e24b4a', display:'flex', alignItems:'center', gap:8 }}>
                    ⚠ Please fill in all required fields.
                  </div>
              )}

              {/* STEP 1 */}
              {step === 1 && (
                  <div className="fade-up">
                    <div style={{ fontSize:11, color:'var(--accent)', fontWeight:500, letterSpacing:'0.08em', marginBottom:6 }}>STEP 1 OF 4</div>
                    <h2 style={{ fontSize:20, fontWeight:500, marginBottom:4 }}>Basic info</h2>
                    <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>Tell us about yourself</p>
                    <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                      {(['metric','imperial'] as Unit[]).map(u => (
                          <button key={u} onClick={() => setUnit(u)} style={{ padding:'7px 16px', borderRadius:8, border:`0.5px solid ${unit===u?'var(--accent)':'var(--border2)'}`, background:unit===u?'var(--accent-dim)':'transparent', color:unit===u?'var(--accent)':'var(--text3)', fontSize:12, cursor:'pointer' }}>
                            {u === 'metric' ? 'Metric (cm/kg)' : 'Imperial (in/lbs)'}
                          </button>
                      ))}
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <label style={{ fontSize:12, color:fieldErrors.name?'#e24b4a':'var(--text2)', display:'block', marginBottom:6 }}>Full name *</label>
                      <input placeholder="e.g. Srini Kumar" value={form.name} onChange={e => setF('name', e.target.value)} style={{ border:eb('name'), background:ebg('name') }} />
                      <FE k="name" />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                      <div>
                        <label style={{ fontSize:12, color:fieldErrors.age?'#e24b4a':'var(--text2)', display:'block', marginBottom:6 }}>Age *</label>
                        <input type="number" placeholder="25" value={form.age} onChange={e => setF('age', e.target.value)} style={{ border:eb('age'), background:ebg('age') }} />
                        <FE k="age" />
                      </div>
                      <div>
                        <label style={{ fontSize:12, color:fieldErrors.gender?'#e24b4a':'var(--text2)', display:'block', marginBottom:6 }}>Gender *</label>
                        <select value={form.gender} onChange={e => setF('gender', e.target.value)} style={{ border:eb('gender'), background:ebg('gender') }}>
                          <option value="">Select</option>
                          <option>Male</option>
                          <option>Female</option>
                        </select>
                        <FE k="gender" />
                      </div>
                      <div>
                        <label style={{ fontSize:12, color:fieldErrors.height?'#e24b4a':'var(--text2)', display:'block', marginBottom:6 }}>{uh} *</label>
                        <input type="number" placeholder={unit==='metric'?'175':'69'} value={form.height} onChange={e => setF('height', e.target.value)} style={{ border:eb('height'), background:ebg('height') }} />
                        <FE k="height" />
                      </div>
                      <div>
                        <label style={{ fontSize:12, color:fieldErrors.weight?'#e24b4a':'var(--text2)', display:'block', marginBottom:6 }}>{uw} *</label>
                        <input type="number" placeholder={unit==='metric'?'75':'165'} value={form.weight} onChange={e => setF('weight', e.target.value)} style={{ border:eb('weight'), background:ebg('weight') }} />
                        <FE k="weight" />
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button style={backS} onClick={() => { setScreen('home'); setFieldErrors({}) }}>Back</button>
                      <button style={nextS} onClick={() => tryNext(2)}>Continue</button>
                    </div>
                  </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                  <div className="fade-up">
                    <div style={{ fontSize:11, color:'var(--accent)', fontWeight:500, letterSpacing:'0.08em', marginBottom:6 }}>STEP 2 OF 4</div>
                    <h2 style={{ fontSize:20, fontWeight:500, marginBottom:4 }}>Upper body</h2>
                    <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>Measure at the widest / fullest point of each area.</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                      {[
                        { key:'neck',           label:'Neck',                 ph:'38' },
                        { key:'aroundShoulder', label:'Around both shoulders', ph:'110' },
                        { key:'chest',          label:'Chest',                ph:'95' },
                        { key:'bicep',          label:'Biceps',               ph:'33' },
                        { key:'forearm',        label:'Forearm',              ph:'28' },
                        { key:'wrist',          label:'Wrist',                ph:'17' },
                        { key:'stomach',        label:'Stomach',              ph:'85' },
                      ].map(f => (
                          <div key={f.key} style={f.key==='aroundShoulder'||f.key==='stomach' ? { gridColumn:'1 / -1' } : {}}>
                            <label style={{ fontSize:12, color:fieldErrors[f.key]?'#e24b4a':'var(--text2)', display:'block', marginBottom:6 }}>{u(f.label)} *</label>
                            <input type="number" placeholder={f.ph} value={(form as any)[f.key]} onChange={e => setF(f.key, e.target.value)} style={{ border:eb(f.key), background:ebg(f.key) }} />
                            <FE k={f.key} />
                          </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button style={backS} onClick={() => { setStep(1); setFieldErrors({}) }}>Back</button>
                      <button style={nextS} onClick={() => tryNext(3)}>Continue</button>
                    </div>
                  </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                  <div className="fade-up">
                    <div style={{ fontSize:11, color:'var(--accent)', fontWeight:500, letterSpacing:'0.08em', marginBottom:6 }}>STEP 3 OF 4</div>
                    <h2 style={{ fontSize:20, fontWeight:500, marginBottom:4 }}>Lower body</h2>
                    <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>Stand straight, muscles relaxed.</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                      {[
                        { key:'hip',   label:'Hips',   ph:'95' },
                        { key:'thigh', label:'Thighs', ph:'55' },
                        { key:'knee',  label:'Knees',  ph:'37' },
                        { key:'calf',  label:'Calves', ph:'37' },
                        { key:'ankle', label:'Ankles', ph:'22' },
                      ].map(f => (
                          <div key={f.key}>
                            <label style={{ fontSize:12, color:fieldErrors[f.key]?'#e24b4a':'var(--text2)', display:'block', marginBottom:6 }}>{u(f.label)} *</label>
                            <input type="number" placeholder={f.ph} value={(form as any)[f.key]} onChange={e => setF(f.key, e.target.value)} style={{ border:eb(f.key), background:ebg(f.key) }} />
                            <FE k={f.key} />
                          </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button style={backS} onClick={() => { setStep(2); setFieldErrors({}) }}>Back</button>
                      <button style={nextS} onClick={() => tryNext(4)}>Continue</button>
                    </div>
                  </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                  <div className="fade-up">
                    <div style={{ fontSize:11, color:'var(--accent)', fontWeight:500, letterSpacing:'0.08em', marginBottom:6 }}>STEP 4 OF 4</div>
                    <h2 style={{ fontSize:20, fontWeight:500, marginBottom:4 }}>Goal & diet</h2>
                    <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>What do you want to achieve and how do you eat?</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                      {GOALS.map(g => (
                          <div key={g.value} onClick={() => setGoal(g.value)} style={{ background:goal===g.value?'var(--accent-dim)':'var(--bg2)', border:`0.5px solid ${goal===g.value?'var(--accent)':'var(--border)'}`, borderRadius:12, padding:'14px 12px', cursor:'pointer', textAlign:'center' }}>
                            <div style={{ fontSize:22, marginBottom:6 }}>{g.icon}</div>
                            <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{g.title}</div>
                            <div style={{ fontSize:11, color:'var(--text3)' }}>{g.desc}</div>
                          </div>
                      ))}
                    </div>
                    <div style={{ marginBottom:16 }}>
                      <label style={{ fontSize:12, color:fieldErrors.targetWeight?'#e24b4a':'var(--text2)', display:'block', marginBottom:6 }}>
                        Target {unit==='metric'?'weight (kg)':'weight (lbs)'} *
                      </label>
                      <input type="number" placeholder={unit==='metric'?'70':'154'} value={form.targetWeight} onChange={e => setF('targetWeight', e.target.value)} style={{ border:eb('targetWeight'), background:ebg('targetWeight') }} />
                      <FE k="targetWeight" />
                    </div>
                    <div style={{ marginBottom:20 }}>
                      <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:10 }}>Activity level</label>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {ACTIVITIES.map(a => (
                            <div key={a.value} onClick={() => setActivity(a.value)} style={{ background:activity===a.value?'var(--accent-dim)':'var(--bg2)', border:`0.5px solid ${activity===a.value?'var(--accent)':'var(--border)'}`, borderRadius:10, padding:'11px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={{ fontSize:13 }}>{a.label}</span>
                              <span style={{ fontSize:11, color:'var(--text3)' }}>{a.sub}</span>
                            </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom:16 }}>
                      <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:10 }}>Diet type</label>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                        {(['Vegetarian','Non-vegetarian','Mixed'] as DietType[]).map(d => (
                            <div key={d} onClick={() => setDietType(d)} style={{ background:dietType===d?'var(--accent-dim)':'var(--bg2)', border:`0.5px solid ${dietType===d?'var(--accent)':'var(--border)'}`, borderRadius:10, padding:'10px 8px', cursor:'pointer', textAlign:'center' }}>
                              <div style={{ fontSize:18, marginBottom:4 }}>{d==='Vegetarian'?'🥗':d==='Non-vegetarian'?'🍗':'🔀'}</div>
                              <div style={{ fontSize:11, fontWeight:500, color:dietType===d?'var(--accent)':'var(--text2)' }}>{d==='Non-vegetarian'?'Non-veg':d}</div>
                            </div>
                        ))}
                      </div>
                    </div>
                    {dietType === 'Mixed' && (
                        <div style={{ marginBottom:20 }}>
                          <label style={{ fontSize:12, color:fieldErrors.nonVegDays?'#e24b4a':'var(--text2)', display:'block', marginBottom:10 }}>Which days are non-veg?</label>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                            {DAYS.map(d => (
                                <div key={d} onClick={() => toggleDay(d)} style={{ padding:'6px 12px', borderRadius:20, cursor:'pointer', fontSize:12, background:nonVegDays.includes(d)?'var(--accent-dim)':'var(--bg2)', border:`0.5px solid ${nonVegDays.includes(d)?'var(--accent)':'var(--border)'}`, color:nonVegDays.includes(d)?'var(--accent)':'var(--text3)' }}>
                                  {d.slice(0, 3)}
                                </div>
                            ))}
                          </div>
                          <FE k="nonVegDays" />
                        </div>
                    )}
                    <div style={{ display:'flex', gap:10 }}>
                      <button style={backS} onClick={() => { setStep(3); setFieldErrors({}) }}>Back</button>
                      <button style={nextS} onClick={tryAnalyze}>Analyze my body</button>
                    </div>
                  </div>
              )}
            </div>
        )}

        {/* ANALYZING */}
        {screen === 'analyzing' && (
            <div style={{ maxWidth:480, margin:'0 auto', padding:'80px 20px', textAlign:'center' }}>
              <div style={{ width:44, height:44, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 20px' }} />
              <h3 style={{ fontSize:18, fontWeight:500, marginBottom:8 }}>Analyzing your body...</h3>
              <p style={{ fontSize:13, color:'var(--text3)' }}>{analyzeMsg}</p>
            </div>
        )}

        {/* RESULTS */}
        {screen === 'results' && apiData && (
            <ResultsPage
                results={apiData.results}
                aiInsights={apiData.aiInsights}
                goal={goal}
                name={form.name}
                isPro={isPro}
                onUpgrade={() => setShowUpgrade(true)}
                onRestart={() => { setScreen('home'); setStep(1); setForm(defaultForm); setApiData(null) }}
            />
        )}

        {/* COMING SOON POPUP */}
        {showPopup && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
              <div style={{ background:'#111', border:'0.5px solid #2a2a2a', borderRadius:20, padding:'32px 28px', maxWidth:400, width:'100%', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:16 }}>🚀</div>
                <div style={{ fontSize:11, color:'#e8ff47', fontWeight:500, letterSpacing:'0.06em', marginBottom:8 }}>COMING SOON</div>
                <h2 style={{ fontSize:22, fontWeight:500, color:'#f0f0f0', marginBottom:8, lineHeight:1.3 }}>Big updates are coming to BodyFitAI</h2>
                <p style={{ fontSize:13, color:'#888', marginBottom:24, lineHeight:1.6 }}>We are working on powerful new features to help you track your fitness journey week by week.</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
                  {[
                    { icon:'💾', title:'Save your results',           desc:'Save every analysis to your account' },
                    { icon:'📊', title:'Progress tracking & history', desc:'See how your body changes over time' },
                    { icon:'📅', title:'Weekly body tracking',        desc:'Compare week 1 vs now side by side' },
                  ].map((f, i) => (
                      <div key={i} style={{ background:'#1a1a1a', border:'0.5px solid #2a2a2a', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, textAlign:'left' }}>
                        <span style={{ fontSize:20 }}>{f.icon}</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500, color:'#f0f0f0', marginBottom:2 }}>{f.title}</div>
                          <div style={{ fontSize:11, color:'#666' }}>{f.desc}</div>
                        </div>
                      </div>
                  ))}
                </div>
                <button onClick={() => setShowPopup(false)} style={{ width:'100%', background:'#e8ff47', border:'none', borderRadius:10, padding:'13px 0', fontSize:14, fontWeight:500, color:'#0a0a0a', cursor:'pointer', marginBottom:10 }}>
                  Got it, let me try the app!
                </button>
                <button onClick={() => setShowPopup(false)} style={{ background:'none', border:'none', color:'#555', fontSize:12, cursor:'pointer' }}>
                  Dismiss
                </button>
              </div>
            </div>
        )}

        {/* UPGRADE MODAL */}
        {showUpgrade && (
            <UpgradeModal
                onClose={() => setShowUpgrade(false)}
                identifier={userIp}
                freeLeft={freeLeft}
                currentCredits={credits}
                onSuccess={(newCredits) => {
                  setCredits(newCredits)
                  setIsPro(newCredits > 0)
                  setShowUpgrade(false)
                  const wasBlocked = blockedRef.current
                  blockedRef.current = false
                  refreshUsage()  // update credits after payment
                  // Only re-run analysis if user was blocked mid-analysis
                  if (wasBlocked) {
                    setTimeout(() => void runAnalysis(), 300)
                  }
                }}
            />
        )}
      </div>
  )
}