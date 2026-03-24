'use client'
import { useState, useEffect } from 'react'
import { getUser, signOut } from '@/lib/auth'
import { getSavedAnalyses } from '@/lib/userdata'
import type { SavedAnalysis } from '@/lib/userdata'

const SLOT_LABELS: Record<number, string> = { 1: 'Baseline (Week 1)', 2: 'Previous', 3: 'Latest' }

function diff(a: number, b: number, lowerIsBetter = false) {
    const d = b - a
    if (Math.abs(d) < 0.1) return { text: '—', color: '#666' }
    const better = lowerIsBetter ? d < 0 : d > 0
    return {
        text: `${d > 0 ? '+' : ''}${d.toFixed(1)}`,
        color: better ? '#5DCAA5' : '#e24b4a',
    }
}

function diffStr(a: number, b: number, lowerIsBetter = false, unit = '') {
    const d = diff(a, b, lowerIsBetter)
    return <span style={{ fontSize:11, color:d.color, fontWeight:500 }}>{d.text}{unit}</span>
}

export default function ProgressPage() {
    const [user,     setUser]     = useState<any>(null)
    const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
    const [loading,  setLoading]  = useState(true)

    useEffect(() => {
        async function load() {
            const u = await getUser()
            if (!u) { window.location.href = '/'; return }
            setUser(u)
            const data = await getSavedAnalyses()
            setAnalyses(data)
            setLoading(false)
        }
        load()
    }, [])

    async function handleSignOut() {
        await signOut()
        window.location.href = '/'
    }

    const s1 = analyses.find(a => a.slot === 1)
    const s2 = analyses.find(a => a.slot === 2)
    const s3 = analyses.find(a => a.slot === 3)
    const latest = s3 ?? s2 ?? s1

    if (loading) return (
        <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:36, height:36, border:'2px solid #2a2a2a', borderTopColor:'#e8ff47', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
    )

    return (
        <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#f0f0f0' }}>
            {/* NAV */}
            <nav style={{ background:'#111', borderBottom:'0.5px solid #1e1e1e', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <a href="/" style={{ fontSize:18, fontWeight:500, textDecoration:'none' }}>
                    <span style={{ color:'#f0f0f0' }}>Body</span><span style={{ color:'#f0f0f0' }}>Fit</span><span style={{ color:'#e8ff47' }}>AI</span>
                </a>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:12, color:'#666' }}>{user?.email}</span>
                    <button onClick={handleSignOut} style={{ background:'none', border:'0.5px solid #2a2a2a', borderRadius:8, padding:'5px 12px', color:'#888', fontSize:12, cursor:'pointer' }}>Sign out</button>
                </div>
            </nav>

            <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 20px' }}>

                {/* Header */}
                <div style={{ marginBottom:28 }}>
                    <div style={{ fontSize:11, color:'#e8ff47', fontWeight:500, letterSpacing:'0.06em', marginBottom:6 }}>MY PROGRESS</div>
                    <h1 style={{ fontSize:28, fontWeight:500, marginBottom:4 }}>Body tracking history</h1>
                    <p style={{ fontSize:13, color:'#888' }}>
                        {analyses.length === 0 ? 'No saved analyses yet. Complete an analysis and save your progress.' :
                            analyses.length === 1 ? '1 entry saved. Do another analysis to start tracking progress.' :
                                `${analyses.length} entries saved. Tracking your journey from the start.`}
                    </p>
                </div>

                {analyses.length === 0 && (
                    <div style={{ background:'#111', border:'0.5px solid #1e1e1e', borderRadius:16, padding:'48px 24px', textAlign:'center' }}>
                        <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
                        <h2 style={{ fontSize:20, fontWeight:500, marginBottom:8, color:'#f0f0f0' }}>No progress saved yet</h2>
                        <p style={{ fontSize:14, color:'#888', marginBottom:8, lineHeight:1.6, maxWidth:360, margin:'0 auto 16px' }}>
                            Complete a body analysis and click <strong style={{ color:'#ccc' }}>"Save my progress"</strong> on the results page to start tracking your fitness journey.
                        </p>
                        <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'center', marginTop:24 }}>
                            <a href="/" style={{ background:'#e8ff47', borderRadius:10, padding:'12px 32px', fontSize:14, fontWeight:500, color:'#0a0a0a', textDecoration:'none', display:'inline-block' }}>
                                Start my first analysis →
                            </a>
                            <p style={{ fontSize:12, color:'#555', marginTop:4 }}>Takes about 2 minutes · Free to try</p>
                        </div>
                    </div>
                )}

                {analyses.length >= 1 && (
                    <>
                        {/* Key metrics overview */}
                        {latest && (
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:10, marginBottom:24 }}>
                                {[
                                    { label:'Current weight',  value:`${latest.weight}kg`,          color:'#e8ff47' },
                                    { label:'Body fat',         value:`${latest.body_fat}%`,         color:'#e24b4a' },
                                    { label:'Lean mass',        value:`${latest.lean_mass}kg`,       color:'#5DCAA5' },
                                    { label:'FFMI',             value:`${latest.ffmi}`,              color:'#80a0ff' },
                                ].map((m,i) => (
                                    <div key={i} style={{ background:'#111', border:'0.5px solid #1e1e1e', borderRadius:12, padding:'14px 16px' }}>
                                        <div style={{ fontSize:10, color:'#666', marginBottom:6 }}>{m.label.toUpperCase()}</div>
                                        <div style={{ fontSize:22, fontWeight:500, color:m.color }}>{m.value}</div>
                                        {s1 && latest !== s1 && (
                                            <div style={{ fontSize:11, color:'#555', marginTop:4 }}>
                                                from {m.label === 'Body fat' || m.label === 'Current weight'
                                                ? diffStr(s1[m.label === 'Current weight' ? 'weight' : 'body_fat'] as number, latest[m.label === 'Current weight' ? 'weight' : 'body_fat'] as number, true)
                                                : diffStr(s1[m.label === 'Lean mass' ? 'lean_mass' : 'ffmi'] as number, latest[m.label === 'Lean mass' ? 'lean_mass' : 'ffmi'] as number, false)
                                            } since start
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Comparison Table */}
                        <div style={{ background:'#111', border:'0.5px solid #1e1e1e', borderRadius:16, overflow:'hidden', marginBottom:24 }}>
                            <div style={{ padding:'16px 20px', borderBottom:'0.5px solid #1e1e1e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <div style={{ fontSize:13, fontWeight:500 }}>Progress comparison</div>
                                <div style={{ fontSize:11, color:'#666' }}>🟢 improvement &nbsp; 🔴 needs attention</div>
                            </div>
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
                                    <thead>
                                    <tr style={{ background:'#0d0d0d' }}>
                                        <th style={{ padding:'10px 16px', fontSize:11, color:'#666', textAlign:'left', fontWeight:500 }}>Metric</th>
                                        {analyses.map(a => (
                                            <th key={a.slot} style={{ padding:'10px 16px', fontSize:11, color: a.slot===3?'#e8ff47':'#666', textAlign:'center', fontWeight:500 }}>
                                                {SLOT_LABELS[a.slot]}
                                                <div style={{ fontSize:10, color:'#444', fontWeight:400 }}>
                                                    {new Date(a.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                                                </div>
                                            </th>
                                        ))}
                                        {analyses.length >= 2 && <th style={{ padding:'10px 16px', fontSize:11, color:'#666', textAlign:'center', fontWeight:500 }}>Total change</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {[
                                        { label:'Weight',        key:'weight',        unit:'kg',  lower:true  },
                                        { label:'Body fat %',    key:'body_fat',      unit:'%',   lower:true  },
                                        { label:'Lean mass',     key:'lean_mass',     unit:'kg',  lower:false },
                                        { label:'FFMI',          key:'ffmi',          unit:'',    lower:false },
                                        { label:'Chest',         key:'chest',         unit:'cm',  lower:false },
                                        { label:'Stomach/Waist', key:'stomach',       unit:'cm',  lower:true  },
                                        { label:'Hip',           key:'hip',           unit:'cm',  lower:true  },
                                        { label:'Daily calories',key:'daily_calories',unit:'kcal',lower:false },
                                        { label:'Protein',       key:'protein',       unit:'g',   lower:false },
                                        { label:'Carbs',         key:'carbs',         unit:'g',   lower:false },
                                        { label:'Fat',           key:'fat',           unit:'g',   lower:false },
                                    ].map((row, i) => (
                                        <tr key={row.key} style={{ borderTop:'0.5px solid #1a1a1a', background: i%2===0?'transparent':'#0d0d0d' }}>
                                            <td style={{ padding:'10px 16px', fontSize:13, color:'#ccc' }}>{row.label}</td>
                                            {analyses.map(a => (
                                                <td key={a.slot} style={{ padding:'10px 16px', fontSize:13, textAlign:'center', fontWeight: a.slot===3?500:400, color: a.slot===3?'#f0f0f0':'#888' }}>
                                                    {(a as any)[row.key]}{row.unit}
                                                </td>
                                            ))}
                                            {analyses.length >= 2 && (
                                                <td style={{ padding:'10px 16px', textAlign:'center' }}>
                                                    {diffStr(
                                                        (analyses[0] as any)[row.key],
                                                        (analyses[analyses.length-1] as any)[row.key],
                                                        row.lower,
                                                        row.unit
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* CTA */}
                        <div style={{ textAlign:'center' }}>
                            <a href="/" style={{ background:'#e8ff47', borderRadius:10, padding:'12px 32px', fontSize:14, fontWeight:500, color:'#0a0a0a', textDecoration:'none', display:'inline-block' }}>
                                Do a new analysis →
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
