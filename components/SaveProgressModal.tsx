'use client'
import { useState } from 'react'
import { sendOTP, verifyOTP, getUser } from '@/lib/auth'
import { saveAnalysis, replaceSlot2AndShift } from '@/lib/userdata'
import type { FitnessResults, Measurements } from '@/lib/calculations'

interface Props {
    onClose: () => void
    measurements: Measurements
    results: FitnessResults
    aiInsights: any
    onSaved: () => void
}

type Step = 'email' | 'otp' | 'confirm_replace' | 'saving' | 'saved'

export default function SaveProgressModal({ onClose, measurements, results, aiInsights, onSaved }: Props) {
    const [step,        setStep]        = useState<Step>('email')
    const [email,       setEmail]       = useState('')
    const [otp,         setOtp]         = useState('')
    const [loading,     setLoading]     = useState(false)
    const [error,       setError]       = useState('')
    const [replaceInfo, setReplaceInfo] = useState<{ date: string } | null>(null)

    async function handleSendOTP() {
        if (!email.trim() || !email.includes('@')) { setError('Enter a valid email'); return }
        setLoading(true); setError('')
        const { error: err } = await sendOTP(email)
        if (err) { setError(err); setLoading(false); return }
        setStep('otp'); setLoading(false)
    }

    async function handleVerifyOTP() {
        if (otp.length !== 6) { setError('Enter the 6-digit code'); return }
        setLoading(true); setError('')
        const { error: err } = await verifyOTP(email, otp)
        if (err) { setError('Invalid or expired code. Try again.'); setLoading(false); return }
        await handleSave()
    }

    async function handleSave() {
        setLoading(true); setError('')
        try {
            const result = await saveAnalysis(measurements, results, aiInsights)
            if (result.needsConfirmation) {
                setReplaceInfo({ date: result.needsConfirmation.date })
                setStep('confirm_replace')
                setLoading(false)
                return
            }
            setStep('saved')
            onSaved()
        } catch (e) {
            setError('Failed to save. Please try again.')
        }
        setLoading(false)
    }

    async function handleConfirmReplace() {
        setStep('saving'); setLoading(true)
        try {
            await replaceSlot2AndShift(measurements, results, aiInsights)
            setStep('saved')
            onSaved()
        } catch {
            setError('Failed to save.')
            setStep('confirm_replace')
        }
        setLoading(false)
    }

    const inputStyle = { width:'100%', background:'#1a1a1a', border:'0.5px solid #2a2a2a', borderRadius:8, padding:'11px 14px', color:'#f0f0f0', fontSize:14, boxSizing:'border-box' } as const
    const btnPrimary = { width:'100%', background:'#e8ff47', border:'none', borderRadius:10, padding:'12px 0', fontSize:14, fontWeight:500, color:'#0a0a0a', cursor:'pointer', opacity: loading ? 0.7 : 1 } as const
    const btnSecondary = { width:'100%', background:'transparent', border:'0.5px solid #2a2a2a', borderRadius:10, padding:'12px 0', fontSize:14, color:'#888', cursor:'pointer', marginTop:8 } as const

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
            <div style={{ background:'#111', border:'0.5px solid #2a2a2a', borderRadius:16, padding:'28px 24px', maxWidth:380, width:'100%' }}>

                {/* EMAIL STEP */}
                {step === 'email' && (<>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                        <div>
                            <div style={{ fontSize:11, color:'#e8ff47', fontWeight:500, letterSpacing:'0.06em', marginBottom:4 }}>SAVE PROGRESS</div>
                            <h2 style={{ fontSize:20, fontWeight:500, color:'#f0f0f0', marginBottom:4 }}>Save your results</h2>
                            <p style={{ fontSize:13, color:'#888' }}>Enter your email to save and track your progress over time.</p>
                        </div>
                        <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', fontSize:22, cursor:'pointer' }}>×</button>
                    </div>
                    <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:12, color:'#888', display:'block', marginBottom:6 }}>Email address</label>
                        <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendOTP()} style={inputStyle} />
                    </div>
                    {error && <div style={{ fontSize:12, color:'#e24b4a', marginBottom:10 }}>{error}</div>}
                    <button onClick={handleSendOTP} disabled={loading} style={btnPrimary}>
                        {loading ? 'Sending...' : 'Send verification code'}
                    </button>
                    <button onClick={onClose} style={btnSecondary}>Cancel</button>
                </>)}

                {/* OTP STEP */}
                {step === 'otp' && (<>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                        <div>
                            <div style={{ fontSize:11, color:'#e8ff47', fontWeight:500, letterSpacing:'0.06em', marginBottom:4 }}>VERIFY EMAIL</div>
                            <h2 style={{ fontSize:20, fontWeight:500, color:'#f0f0f0', marginBottom:4 }}>Check your email</h2>
                            <p style={{ fontSize:13, color:'#888' }}>We sent a 6-digit code to <strong style={{ color:'#ccc' }}>{email}</strong></p>
                        </div>
                        <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', fontSize:22, cursor:'pointer' }}>×</button>
                    </div>
                    <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:12, color:'#888', display:'block', marginBottom:6 }}>6-digit code</label>
                        <input
                            type="number"
                            placeholder="123456"
                            value={otp}
                            onChange={e => setOtp(e.target.value.slice(0,6))}
                            onKeyDown={e => e.key==='Enter' && handleVerifyOTP()}
                            style={{ ...inputStyle, fontSize:22, letterSpacing:8, textAlign:'center' }}
                        />
                    </div>
                    {error && <div style={{ fontSize:12, color:'#e24b4a', marginBottom:10 }}>{error}</div>}
                    <button onClick={handleVerifyOTP} disabled={loading} style={btnPrimary}>
                        {loading ? 'Verifying...' : 'Verify & save'}
                    </button>
                    <button onClick={() => { setStep('email'); setOtp(''); setError('') }} style={btnSecondary}>
                        Use different email
                    </button>
                </>)}

                {/* CONFIRM REPLACE STEP */}
                {step === 'confirm_replace' && (<>
                    <div style={{ marginBottom:20 }}>
                        <div style={{ fontSize:24, marginBottom:12 }}>⚠️</div>
                        <h2 style={{ fontSize:18, fontWeight:500, color:'#f0f0f0', marginBottom:8 }}>Replace older entry?</h2>
                        <p style={{ fontSize:13, color:'#888', lineHeight:1.6 }}>
                            You already have 3 saved entries. Your baseline (Week 1) will be kept. Your entry from <strong style={{ color:'#ccc' }}>{replaceInfo?.date}</strong> will be replaced with this new analysis.
                        </p>
                    </div>
                    {error && <div style={{ fontSize:12, color:'#e24b4a', marginBottom:10 }}>{error}</div>}
                    <button onClick={handleConfirmReplace} disabled={loading} style={btnPrimary}>
                        {loading ? 'Saving...' : 'Yes, replace it'}
                    </button>
                    <button onClick={onClose} style={btnSecondary}>Cancel</button>
                </>)}

                {/* SAVING STEP */}
                {step === 'saving' && (
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                        <div style={{ width:36, height:36, border:'2px solid #2a2a2a', borderTopColor:'#e8ff47', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
                        <p style={{ fontSize:14, color:'#888' }}>Saving your progress...</p>
                    </div>
                )}

                {/* SAVED STEP */}
                {step === 'saved' && (
                    <div style={{ textAlign:'center', padding:'12px 0' }}>
                        <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                        <h2 style={{ fontSize:20, fontWeight:500, color:'#f0f0f0', marginBottom:8 }}>Progress saved!</h2>
                        <p style={{ fontSize:13, color:'#888', marginBottom:24, lineHeight:1.6 }}>Your results have been saved. View your progress history to track your journey.</p>
                        <a href="/progress" style={{ display:'block', width:'100%', background:'#e8ff47', borderRadius:10, padding:'12px 0', fontSize:14, fontWeight:500, color:'#0a0a0a', textDecoration:'none', textAlign:'center', marginBottom:8 }}>
                            View my progress →
                        </a>
                        <button onClick={onClose} style={btnSecondary}>Close</button>
                    </div>
                )}

            </div>
        </div>
    )
}