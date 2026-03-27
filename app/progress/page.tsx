'use client'
import { useState, useEffect, useRef } from 'react'
import { getUser, signOut } from '@/lib/auth'
import { getSavedAnalyses } from '@/lib/userdata'
import { getProfile } from '@/lib/profile'
import type { SavedAnalysis } from '@/lib/userdata'

const SLOT_LABELS: Record<number, string> = { 1: 'Baseline', 2: 'Previous', 3: 'Latest' }

function diff(a: number, b: number, lowerIsBetter = false) {
    const d = b - a
    if (Math.abs(d) < 0.1) return { text: '—', color: '#666' }
    const better = lowerIsBetter ? d < 0 : d > 0
    return { text: `${d > 0 ? '+' : ''}${d.toFixed(1)}`, color: better ? '#5DCAA5' : '#e24b4a' }
}

function MiniChart({ data, color, label }: { data: number[]; color: string; label: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || data.length < 2) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const W = canvas.width, H = canvas.height
        const pad = 8
        const min = Math.min(...data) - 1
        const max = Math.max(...data) + 1
        const range = max - min || 1

        ctx.clearRect(0, 0, W, H)

        // Gradient fill
        const grad = ctx.createLinearGradient(0, 0, 0, H)
        grad.addColorStop(0, color + '30')
        grad.addColorStop(1, color + '00')
        ctx.fillStyle = grad

        // Draw filled area
        ctx.beginPath()
        data.forEach((v, i) => {
            const x = pad + (i / (data.length - 1)) * (W - pad * 2)
            const y = H - pad - ((v - min) / range) * (H - pad * 2)
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.lineTo(pad + (W - pad * 2), H)
        ctx.lineTo(pad, H)
        ctx.closePath()
        ctx.fill()

        // Draw line
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.lineJoin = 'round'
        data.forEach((v, i) => {
            const x = pad + (i / (data.length - 1)) * (W - pad * 2)
            const y = H - pad - ((v - min) / range) * (H - pad * 2)
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.stroke()

        // Draw dots
        data.forEach((v, i) => {
            const x = pad + (i / (data.length - 1)) * (W - pad * 2)
            const y = H - pad - ((v - min) / range) * (H - pad * 2)
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
        })
    }, [data, color])

    if (data.length < 2) return (
        <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.2)', fontSize:12 }}>
            Need 2+ entries to show chart
        </div>
    )

    return <canvas ref={canvasRef} width={400} height={80} style={{ width:'100%', height:80 }} />
}

export default function ProgressPage() {
    const [user,     setUser]     = useState<any>(null)
    const [name,     setName]     = useState('')
    const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
    const [loading,  setLoading]  = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const u = await getUser()
                if (!u) { window.location.href = '/?login=1'; return }
                setUser(u)
                const [profile, data] = await Promise.all([
                    getProfile(),
                    getSavedAnalyses(),
                ])
                setName(profile?.name ?? '')
                setAnalyses(data)
            } catch (e) {
                console.error('Progress page error:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    async function handleSignOut() {
        await signOut()
        window.location.href = '/'
    }

    const latest = analyses[analyses.length - 1]
    const first  = analyses[0]

    // Chart data
    const bfData     = analyses.map(a => a.body_fat)
    const weightData = analyses.map(a => a.weight)
    const leanData   = analyses.map(a => a.lean_mass)

    if (loading) return (
        <div style={{ minHeight:'100vh', background:'#060606', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:36, height:36, border:'2px solid rgba(255,255,255,0.06)', borderTopColor:'#e8ff47', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    return (
        <div style={{ minHeight:'100vh', background:'#060606', color:'#f0f0f0', position:'relative', overflow:'hidden' }}>
            {/* Background blobs */}
            <div style={{ position:'fixed', top:-200, left:-200, width:600, height:600, background:'radial-gradient(circle, rgba(232,255,71,0.08) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }}/>
            <div style={{ position:'fixed', bottom:-100, right:-100, width:400, height:400, background:'radial-gradient(circle, rgba(232,255,71,0.05) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }}/>

            {/* NAV */}
            <nav style={{ background:'rgba(6,6,6,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'0.5px solid rgba(255,255,255,0.06)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:10 }}>
                <a href="/" style={{ fontSize:18, fontWeight:500, textDecoration:'none' }}>
                    <span style={{ color:'#f0f0f0' }}>Body</span><span style={{ color:'#f0f0f0' }}>Fit</span><span style={{ color:'#e8ff47' }}>AI</span>
                </a>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>{user?.email}</span>
                    <button onClick={handleSignOut} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'5px 14px', color:'rgba(255,255,255,0.4)', fontSize:12, cursor:'pointer' }}>Sign out</button>
                </div>
            </nav>

            <div style={{ maxWidth:700, margin:'0 auto', padding:'32px 20px', position:'relative', zIndex:1 }}>

                {/* Greeting */}
                <div style={{ marginBottom:32 }}>
                    <div style={{ fontSize:11, color:'#e8ff47', fontWeight:500, letterSpacing:'0.06em', marginBottom:8 }}>MY PROGRESS</div>
                    <h1 style={{ fontSize:28, fontWeight:500, color:'#f0f0f0', marginBottom:6, letterSpacing:'-0.3px' }}>
                        Hi {name || 'there'}, here's your progress 💪
                    </h1>
                    <p style={{ fontSize:14, color:'rgba(240,240,240,0.4)', lineHeight:1.6 }}>
                        {analyses.length === 0 ? 'No saved analyses yet. Complete an analysis and save your progress.' :
                            analyses.length === 1 ? '1 entry saved. Do another analysis to start tracking your journey.' :
                                `${analyses.length} entries saved. Your body is transforming!`}
                    </p>
                </div>

                {analyses.length === 0 && (
                    <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(16px)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'48px 24px', textAlign:'center' }}>
                        <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
                        <h2 style={{ fontSize:20, fontWeight:500, marginBottom:8 }}>No progress saved yet</h2>
                        <p style={{ fontSize:14, color:'rgba(240,240,240,0.4)', marginBottom:24, lineHeight:1.6, maxWidth:320, margin:'0 auto 24px' }}>
                            Complete a body analysis and click "Save my progress" to start tracking your fitness journey.
                        </p>
                        <a href="/" style={{ background:'#e8ff47', borderRadius:10, padding:'12px 32px', fontSize:14, fontWeight:600, color:'#0a0a0a', textDecoration:'none', display:'inline-block', boxShadow:'0 0 24px rgba(232,255,71,0.18)' }}>
                            Start my first analysis →
                        </a>
                    </div>
                )}

                {analyses.length >= 1 && (
                    <>
                        {/* Key metrics */}
                        {latest && (
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:10, marginBottom:24 }}>
                                {[
                                    { label:'Current weight',  value:`${latest.weight}kg`,    color:'#e8ff47' },
                                    { label:'Body fat',         value:`${latest.body_fat}%`,   color:'#f09595' },
                                    { label:'Lean mass',        value:`${latest.lean_mass}kg`, color:'#5DCAA5' },
                                    { label:'FFMI',             value:`${latest.ffmi}`,        color:'#80a0ff' },
                                ].map((m, i) => (
                                    <div key={i} style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px' }}>
                                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:6, letterSpacing:'0.05em' }}>{m.label.toUpperCase()}</div>
                                        <div style={{ fontSize:22, fontWeight:500, color:m.color }}>{m.value}</div>
                                        {first && latest !== first && (
                                            <div style={{ fontSize:11, color: diff(first[m.label === 'Current weight' ? 'weight' : m.label === 'Body fat' ? 'body_fat' : m.label === 'Lean mass' ? 'lean_mass' : 'ffmi'] as number, latest[m.label === 'Current weight' ? 'weight' : m.label === 'Body fat' ? 'body_fat' : m.label === 'Lean mass' ? 'lean_mass' : 'ffmi'] as number, m.label === 'Body fat' || m.label === 'Current weight').color, marginTop:4 }}>
                                                {diff(first[m.label === 'Current weight' ? 'weight' : m.label === 'Body fat' ? 'body_fat' : m.label === 'Lean mass' ? 'lean_mass' : 'ffmi'] as number, latest[m.label === 'Current weight' ? 'weight' : m.label === 'Body fat' ? 'body_fat' : m.label === 'Lean mass' ? 'lean_mass' : 'ffmi'] as number, m.label === 'Body fat' || m.label === 'Current weight').text} since start
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Charts */}
                        {analyses.length >= 2 && (
                            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
                                {[
                                    { label:'Body fat %',    data: bfData,     color:'#f09595', unit:'%' },
                                    { label:'Weight',        data: weightData, color:'#e8ff47', unit:'kg' },
                                    { label:'Lean mass',     data: leanData,   color:'#5DCAA5', unit:'kg' },
                                ].map((chart, i) => (
                                    <div key={i} style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'16px 16px 12px' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                                            <div style={{ fontSize:13, fontWeight:500, color:'rgba(240,240,240,0.7)' }}>{chart.label}</div>
                                            <div style={{ display:'flex', gap:16 }}>
                                                {analyses.map((a, idx) => (
                                                    <div key={idx} style={{ textAlign:'center' }}>
                                                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:2 }}>{SLOT_LABELS[a.slot]}</div>
                                                        <div style={{ fontSize:13, fontWeight:500, color: idx === analyses.length-1 ? chart.color : 'rgba(240,240,240,0.6)' }}>
                                                            {(chart.data[idx] ?? 0).toFixed(1)}{chart.unit}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <MiniChart data={chart.data} color={chart.color} label={chart.label} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Comparison table */}
                        <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:16, overflow:'hidden', marginBottom:24 }}>
                            <div style={{ padding:'14px 20px', borderBottom:'0.5px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <div style={{ fontSize:13, fontWeight:500 }}>Detailed comparison</div>
                                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>🟢 improvement &nbsp; 🔴 needs work</div>
                            </div>
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
                                    <thead>
                                    <tr style={{ background:'rgba(0,0,0,0.2)' }}>
                                        <th style={{ padding:'10px 16px', fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'left', fontWeight:500 }}>Metric</th>
                                        {analyses.map(a => (
                                            <th key={a.slot} style={{ padding:'10px 16px', fontSize:11, color: a.slot===analyses.length?'#e8ff47':'rgba(255,255,255,0.3)', textAlign:'center', fontWeight:500 }}>
                                                {SLOT_LABELS[a.slot]}
                                                <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontWeight:400 }}>
                                                    {new Date(a.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                                                </div>
                                            </th>
                                        ))}
                                        {analyses.length >= 2 && <th style={{ padding:'10px 16px', fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'center', fontWeight:500 }}>Change</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {[
                                        { label:'Weight',        key:'weight',        unit:'kg',   lower:true },
                                        { label:'Body fat %',    key:'body_fat',      unit:'%',    lower:true },
                                        { label:'Lean mass',     key:'lean_mass',     unit:'kg',   lower:false },
                                        { label:'FFMI',          key:'ffmi',          unit:'',     lower:false },
                                        { label:'Waist/Stomach', key:'stomach',       unit:'cm',   lower:true },
                                        { label:'Chest',         key:'chest',         unit:'cm',   lower:false },
                                        { label:'Hip',           key:'hip',           unit:'cm',   lower:true },
                                        { label:'Calories/day',  key:'daily_calories',unit:'kcal', lower:false },
                                        { label:'Protein',       key:'protein',       unit:'g',    lower:false },
                                    ].map((row, i) => (
                                        <tr key={row.key} style={{ borderTop:'0.5px solid rgba(255,255,255,0.04)', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                                            <td style={{ padding:'10px 16px', fontSize:13, color:'rgba(240,240,240,0.6)' }}>{row.label}</td>
                                            {analyses.map(a => (
                                                <td key={a.slot} style={{ padding:'10px 16px', fontSize:13, textAlign:'center', fontWeight: a.slot===analyses.length?500:400, color: a.slot===analyses.length?'#f0f0f0':'rgba(240,240,240,0.5)' }}>
                                                    {(a as any)[row.key]}{row.unit}
                                                </td>
                                            ))}
                                            {analyses.length >= 2 && (() => {
                                                const d = diff((analyses[0] as any)[row.key], (analyses[analyses.length-1] as any)[row.key], row.lower)
                                                return <td style={{ padding:'10px 16px', textAlign:'center', fontSize:12, fontWeight:500, color:d.color }}>{d.text}{row.unit}</td>
                                            })()}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ textAlign:'center' }}>
                            <a href="/" style={{ background:'#e8ff47', borderRadius:10, padding:'12px 32px', fontSize:14, fontWeight:600, color:'#0a0a0a', textDecoration:'none', display:'inline-block', boxShadow:'0 0 24px rgba(232,255,71,0.18)' }}>
                                New analysis →
                            </a>
                        </div>
                    </>
                )}
            </div>

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}