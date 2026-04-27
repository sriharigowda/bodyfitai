'use client'
import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { saveProfile, getProfile } from '@/lib/profile'

export default function OnboardingPage() {
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const user = await getUser()
      if (!user) { window.location.href = '/'; return }
      const profile = await getProfile()
      if (profile?.name) { window.location.href = '/'; return }
      setChecking(false)
    }
    check()
  }, [])

  async function handleSave() {
    if (!name.trim()) { setError('Please enter your name'); return }
    setLoading(true)
    await saveProfile(name.trim())
    window.location.href = '/'
  }

  if (checking) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe,#f0f7ff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'2px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:-120, left:-120, width:400, height:400, background:'radial-gradient(circle,rgba(59,130,246,0.14) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-80, right:-80, width:320, height:320, background:'radial-gradient(circle,rgba(99,179,246,0.10) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>

      <div style={{ maxWidth:400, width:'100%', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:24, fontWeight:500, color:'#1e293b' }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, padding:'36px 28px', boxShadow:'0 8px 40px rgba(59,130,246,0.10)' }}>
          <div style={{ fontSize:40, textAlign:'center', marginBottom:14 }}>👋</div>
          <h1 style={{ fontSize:24, fontWeight:500, color:'#1e293b', textAlign:'center', marginBottom:8, letterSpacing:'-0.3px' }}>Welcome to BodyFitAI</h1>
          <p style={{ fontSize:14, color:'#64748b', textAlign:'center', marginBottom:28, lineHeight:1.6 }}>What should we call you? We'll use your name to personalize your fitness analysis.</p>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:8, fontWeight:500 }}>Your name</label>
            <input type="text" placeholder="e.g. Srihari" value={name} onChange={e => { setName(e.target.value); setError('') }} onKeyDown={e => e.key==='Enter'&&handleSave()} autoFocus
              style={{ width:'100%', padding:'13px 16px', background:'rgba(255,255,255,0.80)', backdropFilter:'blur(8px)', border:'0.5px solid rgba(255,255,255,0.95)', borderRadius:12, color:'#1e293b', fontSize:16, outline:'none', boxSizing:'border-box' as const, transition:'all 0.2s' }}/>
            {error && <div style={{ fontSize:12, color:'#ef4444', marginTop:6 }}>{error}</div>}
          </div>
          <button onClick={handleSave} disabled={loading}
            style={{ width:'100%', background:'#3b82f6', border:'none', borderRadius:12, padding:'14px 0', fontSize:15, fontWeight:600, color:'white', cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, boxShadow:'0 4px 16px rgba(59,130,246,0.30)' }}>
            {loading ? 'Saving...' : "Let's go →"}
          </button>
          <p style={{ fontSize:12, color:'#94a3b8', textAlign:'center', marginTop:14 }}>You can change this anytime</p>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}