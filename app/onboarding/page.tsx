'use client'
import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { getProfile, saveProfile } from '@/lib/profile'

const G = {
  glass: { background:'rgba(255,255,255,0.55)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'0.5px solid rgba(255,255,255,0.85)', borderRadius:14, boxShadow:'0 4px 24px rgba(59,130,246,0.08)' },
  btn:   { background:'#3b82f6', border:'none', borderRadius:12, padding:'13px 0', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 16px rgba(59,130,246,0.28)', transition:'all 0.15s', width:'100%' } as const,
}

export default function OnboardingPage() {
  const [name,    setName]    = useState('')
  const [age,     setAge]     = useState('')
  const [gender,  setGender]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function check() {
      const u = await getUser()
      if (!u) { window.location.href = '/'; return }
      const profile = await getProfile()
      // If already has name + age + gender → skip onboarding
      if (profile?.name && profile?.age && profile?.gender) {
        window.location.href = '/'; return
      }
      if (profile?.name) setName(profile.name)
      if (profile?.age)  setAge(String(profile.age))
      if (profile?.gender) setGender(profile.gender)
    }
    check()
  }, [])

  async function handleSave() {
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!age || +age < 10 || +age > 100) { setError('Enter a valid age (10–100)'); return }
    if (!gender) { setError('Please select your gender'); return }
    setLoading(true); setError('')
    await saveProfile(name.trim(), { age: +age, gender })
    window.location.href = '/'
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ position:'fixed', top:-120, left:-120, width:400, height:400, background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-80, right:-80, width:320, height:320, background:'radial-gradient(circle,rgba(99,179,246,0.08) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>

      <div style={{ maxWidth:400, width:'100%', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:24, fontWeight:500, color:'#1e293b', marginBottom:6, letterSpacing:'-0.3px' }}>
            BodyFit<span style={{ color:'#3b82f6' }}>AI</span>
          </div>
          <div style={{ fontSize:11, color:'#3b82f6', fontWeight:500, letterSpacing:'0.07em', marginBottom:12 }}>WELCOME</div>
          <h1 style={{ fontSize:26, fontWeight:500, color:'#1e293b', marginBottom:8, letterSpacing:'-0.3px' }}>
            Let's set up your profile
          </h1>
          <p style={{ fontSize:14, color:'#64748b', lineHeight:1.6 }}>
            This saves your basic info so you don't have to re-enter it every time.
          </p>
        </div>

        <div style={{ ...G.glass, padding:'24px 20px' }}>
          {/* Name */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:6, fontWeight:500 }}>Full name *</label>
            <input
              type="text"
              placeholder="e.g. Agasthya Kumar"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ border: error && !name ? '0.5px solid #fca5a5' : '0.5px solid rgba(255,255,255,0.9)' }}
            />
          </div>

          {/* Age + Gender */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:6, fontWeight:500 }}>Age *</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="27"
                value={age}
                onChange={e => setAge(e.target.value.replace(/\D/g,''))}
                style={{ border: error && !age ? '0.5px solid #fca5a5' : '0.5px solid rgba(255,255,255,0.9)' }}
              />
            </div>
            <div>
              <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:6, fontWeight:500 }}>Gender *</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                style={{ border: error && !gender ? '0.5px solid #fca5a5' : '0.5px solid rgba(255,255,255,0.9)' }}
              >
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ fontSize:12, color:'#ef4444', marginBottom:12, background:'rgba(254,202,202,0.4)', padding:'8px 12px', borderRadius:8 }}>
              {error}
            </div>
          )}

          <button onClick={handleSave} disabled={loading} style={{ ...G.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : 'Save & continue →'}
          </button>
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:16, lineHeight:1.6 }}>
          You can update these anytime from the analysis form.
        </p>
      </div>
    </div>
  )
}