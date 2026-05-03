'use client'
import { useState, useEffect, useRef } from 'react'
import { getUser, sendOTP, verifyOTP, signOut } from '@/lib/auth'
import { getProfile, saveProfile } from '@/lib/profile'
import type { Measurements, Goal, ActivityLevel, Gender, DietType, DietDays } from '@/lib/calculations'
import ResultsPage from '@/components/ResultsPage'
import { hasCheckedInThisWeek, isMonday, getCheckinHistory } from '@/lib/checkin'

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

const G = {
  nav:      { background:'rgba(255,255,255,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'0.5px solid rgba(255,255,255,0.9)', padding:'13px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky' as const, top:0, zIndex:10 },
  glass:    { background:'rgba(255,255,255,0.55)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'0.5px solid rgba(255,255,255,0.85)', borderRadius:14, boxShadow:'0 4px 24px rgba(59,130,246,0.08)' },
  glassB:   { background:'rgba(59,130,246,0.08)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:14 },
  btn:      { background:'#3b82f6', border:'none', borderRadius:12, padding:'13px 0', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 16px rgba(59,130,246,0.28)', transition:'all 0.15s' } as const,
  btnGhost: { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(8px)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:12, padding:'12px 0', color:'#64748b', fontSize:14, cursor:'pointer', transition:'all 0.15s' } as const,
}

export default function Home() {
  const [screen,       setScreen]       = useState<Screen>('home')
  const [step,         setStep]         = useState(1)
  const [unit,         setUnit]         = useState<Unit>('metric')
  const [form,         setForm]         = useState(defaultForm)
  const [goal,         setGoal]         = useState<Goal>('Weight loss')
  const [activity,     setActivity]     = useState<ActivityLevel>('Moderately active')
  const [dietType,     setDietType]     = useState<DietType>('Non-vegetarian')
  const [nonVegDays,   setNonVegDays]   = useState<string[]>(['Monday','Wednesday','Friday','Saturday'])
  const [analyzeMsg,   setAnalyzeMsg]   = useState('Calculating body fat...')
  const [analyzeStep,  setAnalyzeStep]  = useState(0)
  const [apiData,      setApiData]      = useState<any>(null)
  const [savedMeasurements, setSavedMeasurements] = useState<any>(null)
  const [error,        setError]        = useState('')
  const [fieldErrors,  setFieldErrors]  = useState<Record<string,string>>({})
  const [user,         setUser]         = useState<any>(null)
  const [authLoading,  setAuthLoading]  = useState(true)
  const [showLogin,    setShowLogin]    = useState(false)
  const [showCheckin,  setShowCheckin]  = useState(false)
  const [checkinDue,   setCheckinDue]   = useState(false)
  const [loginEmail,   setLoginEmail]   = useState('')
  const [loginOtp,     setLoginOtp]     = useState('')
  const [loginStep,    setLoginStep]    = useState<'email'|'otp'>('email')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError,   setLoginError]   = useState('')

  // ── Load user on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const u = await getUser()
        if (cancelled) return
        setUser(u)

        if (u) {
          const [profile, checkedIn] = await Promise.all([
            getProfile(),
            hasCheckedInThisWeek().catch(() => false),
          ])
          if (cancelled) return

          if (profile?.name) {
            setForm(f => ({
              ...f,
              name:   profile.name,
              age:    profile.age    ? String(profile.age)    : f.age,
              gender: profile.gender ? profile.gender          : f.gender,
            }))
          } else {
            const saved = localStorage.getItem('bodyfitai_user_name')
            if (saved) setForm(f => ({ ...f, name: saved }))
          }

          if (!checkedIn) {
            setCheckinDue(true)
            // Only show Monday popup if user has at least 1 previous check-in
            if (isMonday()) {
              const history = await getCheckinHistory(1).catch(() => [])
              if (history.length > 0) {
                setTimeout(() => setShowCheckin(true), 3000)
              }
            }
          }
        } else {
          const saved = localStorage.getItem('bodyfitai_user_name')
          if (saved) setForm(f => ({ ...f, name: saved }))
        }
      } catch (e) {
        console.error('Auth init error:', e)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }

    init()

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('login') === '1') {
        setShowLogin(true)
        window.history.replaceState({}, '', '/')
      }
    }

    return () => { cancelled = true }
  }, [])

  // ── OTP handlers ────────────────────────────────────────────────────────────
  async function handleSendOTP() {
    if (!loginEmail.trim() || !loginEmail.includes('@')) { setLoginError('Enter a valid email'); return }
    setLoginLoading(true); setLoginError('')
    const { error } = await sendOTP(loginEmail)
    if (error) { setLoginError(error); setLoginLoading(false); return }
    setLoginStep('otp'); setLoginLoading(false)
  }

  async function handleVerifyOTP() {
    if (loginOtp.length !== 6) { setLoginError('Enter the 6-digit code'); return }
    setLoginLoading(true); setLoginError('')
    const { error } = await verifyOTP(loginEmail, loginOtp)
    if (error) { setLoginError('Invalid or expired code'); setLoginLoading(false); return }

    const u = await getUser()
    setUser(u)

    if (u) {
      const profile = await getProfile()
      if (!profile?.name) {
        window.location.replace('/onboarding')
        return
      }

  // Clear any guest name from localStorage — use Supabase profile only
  localStorage.removeItem('bodyfitai_user_name')


      setForm(f => ({
          ...f,
          name:   profile.name,
          age:    profile.age    ? String(profile.age)    : f.age,
          gender: profile.gender ? profile.gender          : f.gender,
        }))

      const checkedIn = await hasCheckedInThisWeek().catch(() => false)
      if (!checkedIn) {
        setCheckinDue(true)
        // Only show popup if user has previous check-in history
        if (isMonday()) {
          const history = await getCheckinHistory(1).catch(() => [])
          if (history.length > 0) {
            setTimeout(() => setShowCheckin(true), 1000)
          }
        }
      }
    }

    setShowLogin(false); setLoginStep('email'); setLoginEmail(''); setLoginOtp(''); setLoginLoading(false)
  }

  async function handleSignOut() {
    await signOut()
    localStorage.removeItem('bodyfitai_user_name')
    setUser(null); setCheckinDue(false); setShowCheckin(false)
    setForm(defaultForm)
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const ul  = (lbl: string) => `${lbl} (${unit==='metric'?'cm':'in'})`
  const uw  = unit==='metric' ? 'Weight (kg)' : 'Weight (lbs)'
  const uh  = unit==='metric' ? 'Height (cm)' : 'Height (in)'
  const setF = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (fieldErrors[k]) setFieldErrors(p => { const n={...p}; delete n[k]; return n })
  }
  const toggleDay = (d: string) => setNonVegDays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d])

  function validate(n: number) {
    const e: Record<string,string> = {}
    if (n===1) {
      if (!user && !form.name.trim()) e.name = 'Please enter your name'
      if (!form.age || +form.age<10 || +form.age>100) e.age = 'Valid age (10–100)'
      if (!form.gender) e.gender = 'Select gender'
      if (!form.height || +form.height<=0) e.height = 'Enter height'
      if (!form.weight || +form.weight<=0) e.weight = 'Enter weight'
    }
    if (n===2) ['neck','aroundShoulder','chest','bicep','forearm','wrist','stomach'].forEach(k => { if (!(form as any)[k] || +((form as any)[k])<=0) e[k]='Required' })
    if (n===3) ['hip','thigh','knee','calf','ankle'].forEach(k => { if (!(form as any)[k] || +((form as any)[k])<=0) e[k]='Required' })
    if (n===4) {
      if (!form.targetWeight || +form.targetWeight<=0) e.targetWeight='Enter target weight'
      if (dietType==='Mixed' && nonVegDays.length===0) e.nonVegDays='Pick at least one non-veg day'
    }
    setFieldErrors(e)
    return Object.keys(e).length===0
  }

 const tryNext = (n: number) => {
   if (!validate(n-1)) return
   if (n===2 && form.name.trim()) {
     // Only save to localStorage for guests (logged-in users save via Supabase)
     if (!user) localStorage.setItem('bodyfitai_user_name', form.name.trim())
     if (user) void saveProfile(form.name.trim(), {
       age:    form.age    ? +form.age    : undefined,
       gender: form.gender ? form.gender  : undefined,
     })
   }
   setStep(n)
 }

  const tryAnalyze = () => {
    if (!validate(4)) return
    void runAnalysis()
  }

  const toM = (v: string, t: 'weight'|'length') => {
    const n = parseFloat(v)||0
    return unit==='imperial' ? (t==='weight' ? n*0.453592 : n*2.54) : n
  }

  // ── Analysis ─────────────────────────────────────────────────────────────────
  async function runAnalysis() {
    setScreen('analyzing'); setAnalyzeStep(0)
    const msgs = ['Calculating body fat...','Estimating BMR & TDEE...','Building macro plan...','Generating AI insights...']
    let i=0; setAnalyzeMsg(msgs[0])
    const iv = setInterval(() => { i++; if (i<msgs.length) { setAnalyzeMsg(msgs[i]); setAnalyzeStep(i) } }, 900)
    try {
      const diet: DietDays = {
        type: dietType,
        nonVegDays: dietType==='Vegetarian'?[]:dietType==='Non-vegetarian'?DAYS:nonVegDays,
      }
      const measurements: Measurements = {
        name: form.name.trim(), age: +form.age||25, gender: (form.gender as Gender)||'Male',
        height: toM(form.height,'length')||175, weight: toM(form.weight,'weight')||75,
        neck: toM(form.neck,'length')||38, aroundShoulder: toM(form.aroundShoulder,'length')||110,
        chest: toM(form.chest,'length')||95, bicep: toM(form.bicep,'length')||33,
        forearm: toM(form.forearm,'length')||28, wrist: toM(form.wrist,'length')||17,
        stomach: toM(form.stomach,'length')||85, hip: toM(form.hip,'length')||95,
        thigh: toM(form.thigh,'length')||55, knee: toM(form.knee,'length')||37,
        calf: toM(form.calf,'length')||37, ankle: toM(form.ankle,'length')||22,
        goal, targetWeight: toM(form.targetWeight,'weight')||toM(form.weight,'weight')-5,
        activityLevel: activity, diet,
      }
      setSavedMeasurements(measurements)
      if (measurements.name) {
        localStorage.setItem('bodyfitai_user_name', measurements.name)
        if (user) void saveProfile(measurements.name, {
          age:    measurements.age,
          gender: measurements.gender,
        })
      }
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      const cu = await getUser(); if (cu?.id) headers['x-user-id'] = cu.id
      const data = await fetch('/api/analyze', { method:'POST', headers, body:JSON.stringify({ measurements }) }).then(r=>r.json())
      clearInterval(iv)
      if (data.error) { setError(data.error); setScreen('form'); return }
      setApiData(data); setScreen('results')
    } catch {
      clearInterval(iv); setError('Something went wrong. Please try again.'); setScreen('form')
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────────
  const progress = `${step*25}%`
  const eb  = (k: string) => `0.5px solid ${fieldErrors[k]?'#fca5a5':'rgba(255,255,255,0.9)'}`
  const ebg = (k: string) => fieldErrors[k] ? 'rgba(254,202,202,0.3)' : undefined
  const FE  = ({ k }: { k: string }) => fieldErrors[k] ? <div style={{ fontSize:11, color:'#ef4444', marginTop:4 }}>{fieldErrors[k]}</div> : null
  const hasErr = Object.keys(fieldErrors).length>0
  const lbl = (k: string) => ({ fontSize:12, color:fieldErrors[k]?'#ef4444':'#64748b', display:'block' as const, marginBottom:6, fontWeight:500 as const })

  if (authLoading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:40, height:40, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <div style={{ fontSize:20, fontWeight:500, color:'#1e293b' }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)' }}>

      {/* NAV */}
      <nav style={G.nav}>
        <div style={{ fontSize:18, fontWeight:500, color:'#1e293b', cursor:'pointer', letterSpacing:'-0.3px' }} onClick={() => { setScreen('home'); setStep(1) }}>
          BodyFit<span style={{ color:'#3b82f6' }}>AI</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {screen==='form' && <span style={{ fontSize:12, color:'#94a3b8' }}>Step {step} of 4</span>}
          <button style={{ ...G.btnGhost, flex:1 }} onClick={() => {
            setScreen('home')
            setFieldErrors({})
            // Clear guest name when going back — don't show welcome for guests
            if (!user) setForm(defaultForm)
          }}>Back</button>
          {user ? (
            <>
              {form.name && <span style={{ fontSize:12, color:'#475569', fontWeight:500 }}>{form.name.split(' ')[0]}</span>}
              <a href="/progress" style={{ fontSize:11, color:'#64748b', textDecoration:'none', padding:'4px 10px', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, background:'rgba(255,255,255,0.60)' }}>📊 Progress</a>
              <a href="/meal-plan" style={{ fontSize:11, color:'#64748b', textDecoration:'none', padding:'4px 10px', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, background:'rgba(255,255,255,0.60)' }}>🍽️ Meal</a>
              <a href="/workout-plan" style={{ fontSize:11, color:'#64748b', textDecoration:'none', padding:'4px 10px', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, background:'rgba(255,255,255,0.60)' }}>🏋️ Workout</a>
              <button onClick={handleSignOut} style={{ fontSize:11, color:'#94a3b8', background:'none', border:'none', cursor:'pointer' }}>Sign out</button>
            </>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ fontSize:11, color:'white', background:'#3b82f6', border:'none', borderRadius:20, padding:'5px 14px', cursor:'pointer', fontWeight:500, boxShadow:'0 2px 8px rgba(59,130,246,0.30)' }}>Login</button>
          )}
        </div>
      </nav>

      {/* COMING SOON BANNER */}
      <div style={{ background:'rgba(59,130,246,0.06)', borderBottom:'0.5px solid rgba(59,130,246,0.12)', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
        <span style={{ fontSize:10, background:'#3b82f6', color:'white', padding:'2px 8px', borderRadius:10, fontWeight:600, letterSpacing:'0.04em' }}>COMING SOON</span>
        <span style={{ fontSize:12, color:'#3b82f6' }}>Workout plan · Supplement guide · Transformation challenge</span>
      </div>

      {/* CHECKIN BANNER */}
      {user && checkinDue && (
        <div style={{ background:'rgba(59,130,246,0.05)', borderBottom:'0.5px solid rgba(59,130,246,0.12)', padding:'9px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span>📊</span>
            <span style={{ fontSize:12, color:'#3b82f6' }}>{isMonday()?'It\'s Monday! Time for your weekly check-in.':'Your weekly check-in is due.'}</span>
          </div>
          <a href="/checkin" style={{ fontSize:11, background:'rgba(59,130,246,0.10)', border:'0.5px solid rgba(59,130,246,0.25)', color:'#3b82f6', padding:'4px 12px', borderRadius:20, textDecoration:'none', fontWeight:500, whiteSpace:'nowrap' as const }}>Check in →</a>
        </div>
      )}

      {/* HOME */}
      {screen==='home' && (
        <div style={{ maxWidth:480, margin:'0 auto', padding:'40px 20px' }}>
          <div className="fade-up" style={{ textAlign:'center', marginBottom:40 }}>
            {user && form.name && (
              <div style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:10, letterSpacing:'-0.3px' }}>
                Welcome, <span style={{ color:'#3b82f6' }}>{form.name.split(' ')[0]}</span>! 👋
              </div>
            )}
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:20, padding:'5px 14px', fontSize:11, color:'#3b82f6', fontWeight:500, marginBottom:20, letterSpacing:'0.04em' }}>
              <span style={{ width:6, height:6, background:'#3b82f6', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }}/>
              AI-POWERED FITNESS ANALYSIS
            </div>
            <h1 style={{ fontSize:34, fontWeight:500, lineHeight:1.2, color:'#1e293b', marginBottom:12, letterSpacing:'-0.4px' }}>
              Your body.<br/><span style={{ color:'#3b82f6' }}>Analyzed by AI.</span>
            </h1>
            <p style={{ fontSize:15, color:'#64748b', lineHeight:1.7, margin:'0 auto 28px', maxWidth:340 }}>
              Enter your body measurements and get a personalized calorie target, macro split, FFMI score, and full diet plan.
            </p>
            <button onClick={() => setScreen('form')} style={{ ...G.btn, width:'100%', maxWidth:300, display:'block', margin:'0 auto 10px', fontSize:15, padding:'14px 0' }}>
              {user ? 'Start new analysis →' : 'Get my free analysis →'}
            </button>
            {!user && <p style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>No account needed · Completely free</p>}
            {user && checkinDue && (
              <a href="/checkin" style={{ display:'inline-block', marginTop:12, fontSize:12, color:'#3b82f6', textDecoration:'none', background:'rgba(59,130,246,0.08)', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:20, padding:'5px 14px' }}>
                📊 Weekly check-in due →
              </a>
            )}
          </div>
          <div className="fade-up-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { icon:'💪', title:'Body fat + FFMI', desc:'Full body composition analysis' },
              { icon:'🔥', title:'Calorie targets',  desc:'Daily intake + burn goals' },
              { icon:'📊', title:'Macro split',       desc:'Protein, carbs, fat & fiber' },
              { icon:'🥗', title:'Diet plan',         desc:'Veg/non-veg day-by-day' },
            ].map((f,i) => (
              <div key={i} style={{ ...G.glass, padding:'16px 14px', transition:'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 28px rgba(59,130,246,0.14)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='' }}>
                <div style={{ fontSize:22, marginBottom:8 }}>{f.icon}</div>
                <div style={{ fontSize:13, fontWeight:500, color:'#1e293b', marginBottom:3 }}>{f.title}</div>
                <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.4 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORM */}
      {screen==='form' && (
        <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 20px' }}>
          <div style={{ height:4, background:'rgba(59,130,246,0.12)', borderRadius:2, marginBottom:28 }}>
            <div style={{ height:4, background:'linear-gradient(90deg,#3b82f6,#60a5fa)', borderRadius:2, width:progress, transition:'width 0.4s ease', boxShadow:'0 0 8px rgba(59,130,246,0.35)' }}/>
          </div>
          {error && <div style={{ background:'rgba(254,202,202,0.5)', border:'0.5px solid #fca5a5', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626' }}>{error}</div>}
          {hasErr && <div style={{ background:'rgba(254,202,202,0.4)', border:'0.5px solid #fca5a5', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626', display:'flex', alignItems:'center', gap:8 }}>⚠ Please fill in all required fields.</div>}

          {/* STEP 1 */}
          {step===1 && (
            <div className="fade-up">
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.08em', marginBottom:6 }}>STEP 1 OF 4</div>
              <h2 style={{ fontSize:20, fontWeight:500, color:'#1e293b', marginBottom:4 }}>Basic info</h2>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>{user ? 'Tap ✏️ to edit your details' : 'Tell us about yourself'}</p>

              {/* Unit toggle */}
              <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                {(['metric','imperial'] as Unit[]).map(ut => (
                  <button key={ut} onClick={() => setUnit(ut)} style={{ padding:'7px 16px', borderRadius:20, border:`0.5px solid ${unit===ut?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.9)'}`, background:unit===ut?'rgba(59,130,246,0.10)':'rgba(255,255,255,0.60)', color:unit===ut?'#3b82f6':'#64748b', fontSize:12, cursor:'pointer', transition:'all 0.2s', fontWeight:unit===ut?500:400 }}>
                    {ut==='metric'?'Metric (cm/kg)':'Imperial (in/lbs)'}
                  </button>
                ))}
              </div>

              {/* GUEST — show full form */}
              {!user && (
                <div style={{ marginBottom:14 }}>
                  <label style={lbl('name')}>Full name *</label>
                  <input placeholder="e.g. Agasthya Kumar" value={form.name} onChange={e=>setF('name',e.target.value)} style={{ border:eb('name'), background:ebg('name') }}/>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Login to save your progress after analysis</div>
                  <FE k="name"/>
                </div>
              )}

              {/* LOGGED IN — show display cards for name/age/gender */}
              {user && (
                <div style={{ marginBottom:16 }}>
                  {/* Name card */}
                  <div style={{ ...G.glass, padding:'12px 14px', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'0.05em', marginBottom:3 }}>NAME</div>
                      {fieldErrors.name ? (
                        <input type="text" value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="Your name" style={{ fontSize:14, fontWeight:500, border:'0.5px solid #fca5a5', borderRadius:8, padding:'4px 8px', width:'100%', background:'rgba(254,202,202,0.2)' }}/>
                      ) : (
                        <div style={{ fontSize:15, fontWeight:500, color:'#1e293b' }}>{form.name || <span style={{ color:'#94a3b8' }}>Not set</span>}</div>
                      )}
                    </div>
                    <button onClick={() => { setFieldErrors(p => ({...p, name: 'editing'})) }} style={{ width:28, height:28, borderRadius:8, border:'0.5px solid rgba(255,255,255,0.9)', background:'rgba(59,130,246,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginLeft:10 }}>
                      <span style={{ fontSize:12 }}>✏️</span>
                    </button>
                  </div>

                  {/* Age + Gender cards */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {/* Age card */}
                    <div style={{ ...G.glass, padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'0.05em', marginBottom:3 }}>AGE</div>
                          {fieldErrors.age ? (
                            <input type="text" inputMode="numeric" value={form.age} onChange={e=>setF('age',e.target.value)} placeholder="27" style={{ fontSize:14, fontWeight:500, border:'0.5px solid #fca5a5', borderRadius:8, padding:'4px 8px', width:'100%', background:'rgba(254,202,202,0.2)' }}/>
                          ) : (
                            <div style={{ fontSize:15, fontWeight:500, color:'#1e293b' }}>{form.age ? `${form.age} yrs` : <span style={{ color:'#94a3b8', fontSize:13 }}>Not set</span>}</div>
                          )}
                        </div>
                        <button onClick={() => setFieldErrors(p => ({...p, age: 'editing'}))} style={{ width:26, height:26, borderRadius:8, border:'0.5px solid rgba(255,255,255,0.9)', background:'rgba(59,130,246,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginLeft:6 }}>
                          <span style={{ fontSize:11 }}>✏️</span>
                        </button>
                      </div>
                    </div>

                    {/* Gender card */}
                    <div style={{ ...G.glass, padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'0.05em', marginBottom:3 }}>GENDER</div>
                          {fieldErrors.gender ? (
                            <select value={form.gender} onChange={e=>setF('gender',e.target.value)} style={{ fontSize:13, fontWeight:500, border:'0.5px solid #fca5a5', borderRadius:8, padding:'4px 6px', width:'100%', background:'rgba(254,202,202,0.2)' }}>
                              <option value="">Select</option><option>Male</option><option>Female</option>
                            </select>
                          ) : (
                            <div style={{ fontSize:15, fontWeight:500, color:'#1e293b' }}>{form.gender || <span style={{ color:'#94a3b8', fontSize:13 }}>Not set</span>}</div>
                          )}
                        </div>
                        <button onClick={() => setFieldErrors(p => ({...p, gender: 'editing'}))} style={{ width:26, height:26, borderRadius:8, border:'0.5px solid rgba(255,255,255,0.9)', background:'rgba(59,130,246,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginLeft:6 }}>
                          <span style={{ fontSize:11 }}>✏️</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Guest age + gender fields */}
              {!user && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                  <div>
                    <label style={lbl('age')}>Age *</label>
                    <input type="text" inputMode="numeric" placeholder="25" value={form.age} onChange={e=>setF('age',e.target.value)} style={{ border:eb('age'), background:ebg('age') }}/>
                    <FE k="age"/>
                  </div>
                  <div>
                    <label style={lbl('gender')}>Gender *</label>
                    <select value={form.gender} onChange={e=>setF('gender',e.target.value)} style={{ border:eb('gender'), background:ebg('gender') }}>
                      <option value="">Select</option><option>Male</option><option>Female</option>
                    </select>
                    <FE k="gender"/>
                  </div>
                </div>
              )}

              {/* Height + Weight — always inputs */}
              {user && (
                <div style={{ fontSize:11, color:'#94a3b8', fontWeight:500, letterSpacing:'0.06em', marginBottom:10, marginTop:4 }}>
                  CURRENT MEASUREMENTS
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div>
                  <label style={lbl('height')}>{uh} *</label>
                  <input type="text" inputMode="decimal" placeholder={unit==='metric'?'175':'69'} value={form.height} onChange={e=>setF('height',e.target.value)} style={{ border:eb('height'), background:ebg('height') }}/>
                  <FE k="height"/>
                </div>
                <div>
                  <label style={lbl('weight')}>{uw} *</label>
                  <input type="text" inputMode="decimal" placeholder={unit==='metric'?'75':'165'} value={form.weight} onChange={e=>setF('weight',e.target.value)} style={{ border:eb('weight'), background:ebg('weight') }}/>
                  <FE k="weight"/>
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button style={{ ...G.btnGhost, flex:1 }} onClick={() => {
                  setScreen('home')
                  setFieldErrors({})
                  // Clear guest name when going back — don't show welcome for guests
                  if (!user) setForm(defaultForm)
                }}>Back</button>
                <button style={{ ...G.btn, flex:2 }} onClick={() => tryNext(2)}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step===2 && (
            <div className="fade-up">
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.08em', marginBottom:6 }}>STEP 2 OF 4</div>
              <h2 style={{ fontSize:20, fontWeight:500, color:'#1e293b', marginBottom:4 }}>Upper body</h2>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Measure at the widest / fullest point of each area.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                {[
                  { key:'neck',           label:'Neck',                 ph:'38' },
                  { key:'aroundShoulder', label:'Around both shoulders',ph:'110' },
                  { key:'chest',          label:'Chest',                ph:'95' },
                  { key:'bicep',          label:'Biceps',               ph:'33' },
                  { key:'forearm',        label:'Forearm',              ph:'28' },
                  { key:'wrist',          label:'Wrist',                ph:'17' },
                  { key:'stomach',        label:'Stomach',              ph:'85' },
                ].map(f => (
                  <div key={f.key} style={f.key==='aroundShoulder'||f.key==='stomach'?{gridColumn:'1 / -1'}:{}}>
                    <label style={lbl(f.key)}>{ul(f.label)} *</label>
                    <input type="text" inputMode="decimal" placeholder={f.ph} value={(form as any)[f.key]} onChange={e=>setF(f.key,e.target.value)} style={{ border:eb(f.key), background:ebg(f.key) }}/>
                    <FE k={f.key}/>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button style={{ ...G.btnGhost, flex:1 }} onClick={() => { setStep(1); setFieldErrors({}) }}>Back</button>
                <button style={{ ...G.btn, flex:2 }} onClick={() => tryNext(3)}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step===3 && (
            <div className="fade-up">
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.08em', marginBottom:6 }}>STEP 3 OF 4</div>
              <h2 style={{ fontSize:20, fontWeight:500, color:'#1e293b', marginBottom:4 }}>Lower body</h2>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Stand straight, muscles relaxed.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                {[
                  { key:'hip',   label:'Hips',   ph:'95' },
                  { key:'thigh', label:'Thighs', ph:'55' },
                  { key:'knee',  label:'Knees',  ph:'37' },
                  { key:'calf',  label:'Calves', ph:'37' },
                  { key:'ankle', label:'Ankles', ph:'22' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={lbl(f.key)}>{ul(f.label)} *</label>
                    <input type="text" inputMode="decimal" placeholder={f.ph} value={(form as any)[f.key]} onChange={e=>setF(f.key,e.target.value)} style={{ border:eb(f.key), background:ebg(f.key) }}/>
                    <FE k={f.key}/>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button style={{ ...G.btnGhost, flex:1 }} onClick={() => { setStep(2); setFieldErrors({}) }}>Back</button>
                <button style={{ ...G.btn, flex:2 }} onClick={() => tryNext(4)}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step===4 && (
            <div className="fade-up">
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.08em', marginBottom:6 }}>STEP 4 OF 4</div>
              <h2 style={{ fontSize:20, fontWeight:500, color:'#1e293b', marginBottom:4 }}>Goal & diet</h2>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>What do you want to achieve?</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                {GOALS.map(g => (
                  <div key={g.value} onClick={() => setGoal(g.value)}
                    style={{ background:goal===g.value?'rgba(59,130,246,0.10)':'rgba(255,255,255,0.55)', backdropFilter:'blur(16px)', border:`0.5px solid ${goal===g.value?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.85)'}`, borderRadius:14, padding:'14px 12px', cursor:'pointer', textAlign:'center', transition:'all 0.2s', boxShadow:goal===g.value?'0 4px 16px rgba(59,130,246,0.15)':'' }}>
                    <div style={{ fontSize:22, marginBottom:6 }}>{g.icon}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:goal===g.value?'#3b82f6':'#1e293b', marginBottom:2 }}>{g.title}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{g.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={lbl('targetWeight')}>Target {unit==='metric'?'weight (kg)':'weight (lbs)'} *</label>
                <input type="text" inputMode="decimal" placeholder={unit==='metric'?'70':'154'} value={form.targetWeight} onChange={e=>setF('targetWeight',e.target.value)} style={{ border:eb('targetWeight'), background:ebg('targetWeight') }}/>
                <FE k="targetWeight"/>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:10, fontWeight:500 }}>Activity level</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {ACTIVITIES.map(a => (
                    <div key={a.value} onClick={() => setActivity(a.value)}
                      style={{ background:activity===a.value?'rgba(59,130,246,0.10)':'rgba(255,255,255,0.55)', backdropFilter:'blur(12px)', border:`0.5px solid ${activity===a.value?'rgba(59,130,246,0.30)':'rgba(255,255,255,0.85)'}`, borderRadius:12, padding:'11px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'all 0.2s' }}>
                      <span style={{ fontSize:13, fontWeight:500, color:activity===a.value?'#3b82f6':'#1e293b' }}>{a.label}</span>
                      <span style={{ fontSize:11, color:'#94a3b8' }}>{a.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:10, fontWeight:500 }}>Diet type</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {(['Vegetarian','Non-vegetarian','Mixed','Navratri fast','Ramadan','Ekadashi fast'] as DietType[]).map(d => (
                    <div key={d} onClick={() => setDietType(d)}
                      style={{ background:dietType===d?'rgba(59,130,246,0.10)':'rgba(255,255,255,0.55)', backdropFilter:'blur(12px)', border:`0.5px solid ${dietType===d?'rgba(59,130,246,0.30)':'rgba(255,255,255,0.85)'}`, borderRadius:12, padding:'10px 8px', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{d==='Vegetarian'?'🥗':d==='Non-vegetarian'?'🍗':d==='Navratri fast'?'🪔':d==='Ramadan'?'🌙':d==='Ekadashi fast'?'✨':'🔀'}</div>
                      <div style={{ fontSize:11, fontWeight:500, color:dietType===d?'#3b82f6':'#475569' }}>{d==='Non-vegetarian'?'Non-veg':d==='Navratri fast'?'Navratri':d==='Ekadashi fast'?'Ekadashi':d}</div>
                    </div>
                  ))}
                </div>
              </div>
              {dietType==='Mixed' && (
                <div style={{ marginBottom:20 }}>
                  <label style={{ fontSize:12, color:fieldErrors.nonVegDays?'#ef4444':'#64748b', display:'block', marginBottom:10, fontWeight:500 }}>Which days are non-veg?</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {DAYS.map(d => (
                      <div key={d} onClick={() => toggleDay(d)}
                        style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:500, background:nonVegDays.includes(d)?'rgba(59,130,246,0.10)':'rgba(255,255,255,0.60)', border:`0.5px solid ${nonVegDays.includes(d)?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.9)'}`, color:nonVegDays.includes(d)?'#3b82f6':'#64748b', transition:'all 0.2s' }}>
                        {d.slice(0,3)}
                      </div>
                    ))}
                  </div>
                  <FE k="nonVegDays"/>
                </div>
              )}
              <div style={{ display:'flex', gap:10 }}>
                <button style={{ ...G.btnGhost, flex:1 }} onClick={() => { setStep(3); setFieldErrors({}) }}>Back</button>
                <button style={{ ...G.btn, flex:2 }} onClick={tryAnalyze}>Analyze my body →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ANALYZING */}
      {screen==='analyzing' && (
        <div style={{ maxWidth:480, margin:'0 auto', padding:'80px 20px', textAlign:'center' }}>
          <div style={{ ...G.glass, padding:'40px 24px' }}>
            <div style={{ width:48, height:48, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 20px' }}/>
            <h3 style={{ fontSize:18, fontWeight:500, color:'#1e293b', marginBottom:8 }}>Analyzing your body...</h3>
            <p style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>{analyzeMsg}</p>
            <div style={{ display:'flex', justifyContent:'center', gap:6 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:analyzeStep===i?'#3b82f6':'rgba(59,130,246,0.20)', transition:'background 0.3s' }}/>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {screen==='results' && apiData && (
        <ResultsPage
          results={apiData.results}
          goal={goal} name={form.name} isLoggedIn={!!user}
          onLogin={() => setShowLogin(true)}
          measurements={savedMeasurements}
          onRestart={() => { setScreen('home'); setStep(1); setForm(defaultForm); setApiData(null); setSavedMeasurements(null) }}
        />
      )}

      {/* CHECKIN POPUP */}
      {showCheckin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ ...G.glass, padding:'32px 24px', maxWidth:380, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
            <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.06em', marginBottom:8 }}>WEEKLY CHECK-IN</div>
            <h2 style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:8 }}>Time to check in{form.name?`, ${form.name.split(' ')[0]}`:''}!</h2>
            <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6, marginBottom:24 }}>Track your progress with a quick 2-minute measurement update.</p>
            <a href="/checkin" style={{ display:'block', background:'#3b82f6', borderRadius:12, padding:'13px 0', fontSize:14, fontWeight:600, color:'white', textDecoration:'none', marginBottom:10, boxShadow:'0 4px 16px rgba(59,130,246,0.30)' }}>Start check-in →</a>
            <button onClick={() => setShowCheckin(false)} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:13, cursor:'pointer' }}>Remind me later</button>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLogin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ ...G.glass, padding:'28px 24px', maxWidth:360, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.06em', marginBottom:4 }}>{loginStep==='email'?'LOGIN':'VERIFY EMAIL'}</div>
                <h2 style={{ fontSize:20, fontWeight:500, color:'#1e293b', marginBottom:4 }}>{loginStep==='email'?'Welcome back':'Check your email'}</h2>
                <p style={{ fontSize:13, color:'#64748b' }}>{loginStep==='email'?'Login to save your progress':'Code sent to '+loginEmail}</p>
              </div>
              <button onClick={() => { setShowLogin(false); setLoginStep('email'); setLoginError('') }} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>
            {loginStep==='email' ? (
              <>
                <input type="email" placeholder="you@example.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSendOTP()} style={{ marginBottom:10 }}/>
                {loginError && <div style={{ fontSize:12, color:'#ef4444', marginBottom:8 }}>{loginError}</div>}
                <button onClick={handleSendOTP} disabled={loginLoading} style={{ ...G.btn, width:'100%' }}>{loginLoading?'Sending...':'Send code'}</button>
              </>
            ) : (
              <>
                <input type="text" inputMode="numeric" placeholder="123456" value={loginOtp} onChange={e=>setLoginOtp(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e=>e.key==='Enter'&&handleVerifyOTP()} style={{ fontSize:22, letterSpacing:8, textAlign:'center', marginBottom:10 }}/>
                {loginError && <div style={{ fontSize:12, color:'#ef4444', marginBottom:8 }}>{loginError}</div>}
                <button onClick={handleVerifyOTP} disabled={loginLoading} style={{ ...G.btn, width:'100%', marginBottom:8 }}>{loginLoading?'Verifying...':'Verify & login'}</button>
                <button onClick={() => { setLoginStep('email'); setLoginOtp(''); setLoginError('') }} style={{ width:'100%', background:'none', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer' }}>Use different email</button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up   { animation: fadeUp 0.45s ease both; }
        .fade-up-2 { animation: fadeUp 0.45s ease 0.08s both; }
      `}</style>
    </div>
  )
}