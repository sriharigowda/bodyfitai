'use client'
import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { saveCheckin, getLastCheckin, detectStagnation, getCheckinHistory } from '@/lib/checkin'
import type { WeeklyCheckin } from '@/lib/checkin'
import { getProfile } from '@/lib/profile'

type Step = 'measurements' | 'compliance' | 'done'

const G = {
  glass:  { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:14, boxShadow:'0 4px 24px rgba(59,130,246,0.07)' },
  glassB: { background:'rgba(59,130,246,0.07)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(59,130,246,0.20)', borderRadius:14 },
  btn:    { background:'#3b82f6', border:'none', borderRadius:12, padding:'13px 0', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(59,130,246,0.28)' } as const,
  ghost:  { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(8px)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:12, padding:'12px 0', color:'#64748b', fontSize:14, cursor:'pointer' } as const,
}

export default function CheckinPage() {
  const [step,     setStep]     = useState<Step>('measurements')
  const [loading,  setLoading]  = useState(false)
  const [checking, setChecking] = useState(true)
  const [name,     setName]     = useState('')
  const [last,     setLast]     = useState<WeeklyCheckin | null>(null)
  const [stagnant, setStagnant] = useState(false)
  const [form, setForm] = useState({ weight:'', waist:'', chest:'', hip:'', arms:'', body_fat:'' })
  const [errors, setErrors]     = useState<Record<string,string>>({})
  const [compliance, setCompliance] = useState<{ diet:boolean|null; workout:boolean|null }>({ diet:null, workout:null })

  useEffect(() => {
    async function init() {
      const user = await getUser()
      if (!user) { window.location.href = '/?login=1'; return }
      const [profile, lastCheckin, history] = await Promise.all([getProfile(), getLastCheckin(), getCheckinHistory(4)])
      setName(profile?.name ?? '')
      setLast(lastCheckin)
      if (lastCheckin && detectStagnation(history)) setStagnant(true)
      setChecking(false)
    }
    init()
  }, [])

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setErrors(e => { const n = {...e}; delete n[k]; return n }) }

  function validate() {
    const e: Record<string,string> = {}
    Object.entries(form).forEach(([k, v]) => { if (!v || +v <= 0) e[k] = 'Required' })
    setErrors(e); return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    await saveCheckin({ weight:+form.weight, waist:+form.waist, chest:+form.chest, hip:+form.hip, arms:+form.arms, body_fat:+form.body_fat, following_diet:compliance.diet, following_workout:compliance.workout })
    setLoading(false); setStep('done')
  }

  const diffVal = (key: keyof typeof form, lower = false) => {
    if (!last || !form[key]) return null
    const d = +form[key] - +(last[key as keyof WeeklyCheckin] as number)
    if (Math.abs(d) < 0.1) return { text:'—', color:'#94a3b8' }
    const better = lower ? d < 0 : d > 0
    return { text:`${d>0?'+':''}${d.toFixed(1)}`, color: better?'#10b981':'#ef4444' }
  }

  const inp = (k: keyof typeof form, label: string, ph: string, lower = false) => {
    const d = diffVal(k, lower)
    return (
      <div key={k}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <label style={{ fontSize:12, color: errors[k]?'#ef4444':'#64748b', fontWeight:500 }}>{label}</label>
          {d && <span style={{ fontSize:11, color:d.color, fontWeight:500 }}>{d.text}</span>}
        </div>
        <input type="text" inputMode="decimal" placeholder={ph} value={form[k]} onChange={e => setF(k, e.target.value)}
          style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(8px)', border:`0.5px solid ${errors[k]?'#fca5a5':'rgba(255,255,255,0.95)'}`, borderRadius:10, color:'#1e293b', fontSize:14, outline:'none', transition:'all 0.2s', boxSizing:'border-box' as const }}/>
        {errors[k] && <div style={{ fontSize:11, color:'#ef4444', marginTop:3 }}>{errors[k]}</div>}
      </div>
    )
  }

  if (checking) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe,#f0f7ff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)', color:'#1e293b', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:-120, left:-120, width:400, height:400, background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>

      <nav style={{ background:'rgba(255,255,255,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'0.5px solid rgba(255,255,255,0.9)', padding:'13px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <a href="/" style={{ fontSize:18, fontWeight:500, textDecoration:'none', color:'#1e293b' }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></a>
        <div style={{ fontSize:12, color:'#94a3b8' }}>Weekly Check-in</div>
      </nav>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'32px 20px', position:'relative', zIndex:1 }}>

        {step === 'measurements' && (
          <div className="fade-up">
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.06em', marginBottom:8 }}>WEEKLY CHECK-IN</div>
              <h1 style={{ fontSize:26, fontWeight:500, color:'#1e293b', marginBottom:6 }}>How are you doing{name?`, ${name.split(' ')[0]}`:''} 💪</h1>
              <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>
                Quick 2-minute update.{last && ` Last check-in: ${new Date(last.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`}
              </p>
            </div>

            {stagnant && (
              <div style={{ background:'rgba(251,191,36,0.10)', border:'0.5px solid rgba(251,191,36,0.35)', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#d97706', marginBottom:4 }}>⚠️ No change detected last week</div>
                <div style={{ fontSize:12, color:'#92400e', lineHeight:1.5 }}>Your measurements haven't changed much. Let's check in and adjust your plan.</div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
              {inp('weight',   'Weight (kg)',  '75',  true)}
              {inp('waist',    'Waist (cm)',   '85',  true)}
              {inp('chest',    'Chest (cm)',   '95',  false)}
              {inp('hip',      'Hip (cm)',     '95',  true)}
              {inp('arms',     'Arms (cm)',    '33',  false)}
              {inp('body_fat', 'Body fat (%)', '20',  true)}
            </div>

            {last && (
              <div style={{ ...G.glass, padding:'14px 16px', marginBottom:20 }}>
                <div style={{ fontSize:11, color:'#94a3b8', marginBottom:10, fontWeight:500, letterSpacing:'0.04em' }}>LAST WEEK</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[{l:'Weight',v:last.weight+'kg'},{l:'Waist',v:last.waist+'cm'},{l:'Body fat',v:last.body_fat+'%'}].map(m => (
                    <div key={m.l} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'#94a3b8', marginBottom:2 }}>{m.l}</div>
                      <div style={{ fontSize:15, fontWeight:500, color:'#1e293b' }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { if (validate()) setStep('compliance') }} style={{ ...G.btn, width:'100%' }}>Continue →</button>
          </div>
        )}

        {step === 'compliance' && (
          <div className="fade-up">
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.06em', marginBottom:8 }}>THIS WEEK</div>
              <h1 style={{ fontSize:26, fontWeight:500, color:'#1e293b', marginBottom:6 }}>How did you do? 🤔</h1>
              <p style={{ fontSize:13, color:'#64748b' }}>Be honest — this helps us adjust your plan</p>
            </div>

            {[{label:'Did you follow the diet plan?',key:'diet',icon:'🥗'},{label:'Did you follow the workout plan?',key:'workout',icon:'🏋️'}].map(q => (
              <div key={q.key} style={{ ...G.glass, padding:'18px 16px', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <span style={{ fontSize:20 }}>{q.icon}</span>
                  <span style={{ fontSize:14, fontWeight:500, color:'#1e293b' }}>{q.label}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[{label:'Yes ✅',value:true},{label:'Partially 🤷',value:null},{label:'No ❌',value:false}].map(opt => {
                    const sel = compliance[q.key as 'diet'|'workout'] === opt.value
                    return (
                      <button key={opt.label} onClick={() => setCompliance(c => ({ ...c, [q.key]: opt.value }))}
                        style={{ padding:'10px 0', borderRadius:10, border:`0.5px solid ${sel?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.9)'}`, background:sel?'rgba(59,130,246,0.10)':'rgba(255,255,255,0.60)', color:sel?'#3b82f6':'#64748b', fontSize:12, cursor:'pointer', fontWeight:sel?600:400, transition:'all 0.15s' }}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button style={{ ...G.ghost, flex:1 }} onClick={() => setStep('measurements')}>Back</button>
              <button style={{ ...G.btn, flex:2 }} onClick={handleSave} disabled={loading}>{loading?'Saving...':'Save check-in ✓'}</button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="fade-up" style={{ textAlign:'center', paddingTop:40 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
            <h1 style={{ fontSize:26, fontWeight:500, color:'#1e293b', marginBottom:8 }}>Check-in complete!</h1>
            <p style={{ fontSize:14, color:'#64748b', lineHeight:1.6, marginBottom:28, maxWidth:300, margin:'0 auto 28px' }}>
              {compliance.diet===false||compliance.workout===false
                ? "No worries — consistency takes time. We'll adjust your plan based on your feedback."
                : "Great work staying consistent! Keep it up and you'll see results."}
            </p>

            {last && (
              <div style={{ ...G.glass, padding:20, marginBottom:24, textAlign:'left' }}>
                <div style={{ fontSize:11, color:'#94a3b8', marginBottom:14, fontWeight:500, letterSpacing:'0.04em' }}>THIS WEEK VS LAST WEEK</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[
                    { l:'Weight',   curr:+form.weight,   prev:last.weight,   lower:true,  unit:'kg' },
                    { l:'Waist',    curr:+form.waist,    prev:last.waist,    lower:true,  unit:'cm' },
                    { l:'Body fat', curr:+form.body_fat, prev:last.body_fat, lower:true,  unit:'%'  },
                    { l:'Chest',    curr:+form.chest,    prev:last.chest,    lower:false, unit:'cm' },
                    { l:'Hip',      curr:+form.hip,      prev:last.hip,      lower:true,  unit:'cm' },
                    { l:'Arms',     curr:+form.arms,     prev:last.arms,     lower:false, unit:'cm' },
                  ].map(m => {
                    const d = m.curr - m.prev
                    const better = m.lower ? d < 0 : d > 0
                    const color = Math.abs(d) < 0.1 ? '#94a3b8' : better ? '#10b981' : '#ef4444'
                    return (
                      <div key={m.l} style={{ textAlign:'center', background:'rgba(255,255,255,0.50)', borderRadius:10, padding:'10px 8px' }}>
                        <div style={{ fontSize:10, color:'#94a3b8', marginBottom:4 }}>{m.l}</div>
                        <div style={{ fontSize:16, fontWeight:500, color:'#1e293b' }}>{m.curr}{m.unit}</div>
                        <div style={{ fontSize:11, color, marginTop:2 }}>{Math.abs(d)<0.1?'—':`${d>0?'+':''}${d.toFixed(1)}${m.unit}`}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <a href="/progress" style={{ background:'#3b82f6', borderRadius:12, padding:'13px 0', fontSize:14, fontWeight:600, color:'white', textDecoration:'none', display:'block', boxShadow:'0 4px 16px rgba(59,130,246,0.28)' }}>View full progress →</a>
              <a href="/" style={{ background:'rgba(255,255,255,0.60)', backdropFilter:'blur(8px)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:12, padding:'13px 0', fontSize:14, color:'#64748b', textDecoration:'none', display:'block' }}>Back to home</a>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} .fade-up{animation:fadeUp 0.45s ease both}`}</style>
    </div>
  )
}