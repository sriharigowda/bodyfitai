'use client'
import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { saveProfile, getProfile } from '@/lib/profile'

export default function OnboardingPage() {
    const [name,    setName]    = useState('')
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState('')
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
        <div style={{ minHeight:'100vh', background:'#060606', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:32, height:32, border:'2px solid rgba(255,255,255,0.06)', borderTopColor:'#e8ff47', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
    )

    return (
        <div style={{ minHeight:'100vh', background:'#060606', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
            {/* Background blobs */}
            <div style={{ position:'fixed', top:-200, left:-200, width:600, height:600, background:'radial-gradient(circle, rgba(232,255,71,0.10) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>
            <div style={{ position:'fixed', bottom:-100, right:-100, width:500, height:500, background:'radial-gradient(circle, rgba(232,255,71,0.06) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>

            <div style={{ maxWidth:400, width:'100%', position:'relative', zIndex:1 }}>
                {/* Logo */}
                <div style={{ textAlign:'center', marginBottom:40 }}>
                    <div style={{ fontSize:24, fontWeight:500, color:'#f0f0f0', letterSpacing:'-0.3px', marginBottom:8 }}>
                        Body<span style={{ color:'#f0f0f0' }}>Fit</span><span style={{ color:'#e8ff47' }}>AI</span>
                    </div>
                </div>

                {/* Card */}
                <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'36px 28px' }}>
                    <div style={{ fontSize:28, marginBottom:12, textAlign:'center' }}>👋</div>
                    <h1 style={{ fontSize:24, fontWeight:500, color:'#f0f0f0', textAlign:'center', marginBottom:8, letterSpacing:'-0.3px' }}>
                        Welcome to BodyFitAI
                    </h1>
                    <p style={{ fontSize:14, color:'rgba(240,240,240,0.5)', textAlign:'center', marginBottom:32, lineHeight:1.6 }}>
                        What should we call you? We'll use your name to personalize your fitness analysis.
                    </p>

                    <div style={{ marginBottom:20 }}>
                        <label style={{ fontSize:12, color:'rgba(240,240,240,0.45)', display:'block', marginBottom:8 }}>Your name</label>
                        <input
                            type="text"
                            placeholder="e.g. Srihari"
                            value={name}
                            onChange={e => { setName(e.target.value); setError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                            autoFocus
                            style={{ width:'100%', padding:'13px 16px', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.10)', borderRadius:12, color:'#f0f0f0', fontSize:16, outline:'none', boxSizing:'border-box' as const }}
                        />
                        {error && <div style={{ fontSize:12, color:'#f09595', marginTop:6 }}>{error}</div>}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{ width:'100%', background:'#e8ff47', border:'none', borderRadius:12, padding:'14px 0', fontSize:15, fontWeight:600, color:'#0a0a0a', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow:'0 0 32px rgba(232,255,71,0.20)' }}
                    >
                        {loading ? 'Saving...' : "Let's go →"}
                    </button>

                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', textAlign:'center', marginTop:16 }}>
                        You can change this anytime
                    </p>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}