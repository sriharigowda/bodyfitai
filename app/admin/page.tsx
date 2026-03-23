'use client'
import { useState, useEffect } from 'react'

const PACK_LABELS: Record<string, string> = {
    pack10: '₹29 (10 credits)',
    pack25: '₹59 (25 credits)',
    pack50: '₹99 (50 credits)',
}

export default function AdminPage() {
    const [password,  setPassword]  = useState('')
    const [authed,    setAuthed]    = useState(false)
    const [loading,   setLoading]   = useState(false)
    const [data,      setData]      = useState<any>(null)
    const [error,     setError]     = useState('')
    const [tab,       setTab]       = useState<'overview'|'transactions'|'users'>('overview')

    async function login() {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'x-admin-token': password }
            })
            if (res.status === 401) { setError('Wrong password'); setLoading(false); return }
            const json = await res.json()
            setData(json)
            setAuthed(true)
        } catch {
            setError('Failed to connect')
        }
        setLoading(false)
    }

    async function refresh() {
        setLoading(true)
        const res  = await fetch('/api/admin/stats', { headers: { 'x-admin-token': password } })
        const json = await res.json()
        setData(json)
        setLoading(false)
    }

    useEffect(() => {
        if (authed) {
            const iv = setInterval(refresh, 30000) // auto-refresh every 30s
            return () => clearInterval(iv)
        }
    }, [authed])

    const S = {
        page:    { minHeight:'100vh', background:'#0a0a0a', color:'#f0f0f0', fontFamily:'system-ui,sans-serif' } as const,
        nav:     { background:'#111', borderBottom:'0.5px solid #1e1e1e', padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' } as const,
        content: { maxWidth:1100, margin:'0 auto', padding:'28px 20px' } as const,
        card:    { background:'#111', border:'0.5px solid #1e1e1e', borderRadius:12, padding:'20px' } as const,
        metric:  { background:'#111', border:'0.5px solid #1e1e1e', borderRadius:12, padding:'16px 18px' } as const,
        tab:     (active: boolean) => ({ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, background: active?'#e8ff47':'transparent', color: active?'#0a0a0a':'#888' }) as const,
        badge:   { fontSize:10, background:'rgba(232,255,71,0.15)', color:'#e8ff47', padding:'2px 8px', borderRadius:10, fontWeight:500 } as const,
    }

    // LOGIN SCREEN
    if (!authed) {
        return (
            <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ background:'#111', border:'0.5px solid #1e1e1e', borderRadius:16, padding:'32px 28px', width:340 }}>
                    <div style={{ fontSize:11, color:'#e8ff47', fontWeight:500, letterSpacing:'0.06em', marginBottom:8 }}>ADMIN</div>
                    <h1 style={{ fontSize:22, fontWeight:500, marginBottom:4 }}>BodyFitAI Dashboard</h1>
                    <p style={{ fontSize:13, color:'#888', marginBottom:24 }}>Enter your admin password to continue</p>
                    <input
                        type="password"
                        placeholder="Admin password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && login()}
                        style={{ width:'100%', background:'#1a1a1a', border:'0.5px solid #2a2a2a', borderRadius:8, padding:'10px 14px', color:'#f0f0f0', fontSize:14, marginBottom:12, boxSizing:'border-box' }}
                    />
                    {error && <div style={{ fontSize:12, color:'#e24b4a', marginBottom:10 }}>{error}</div>}
                    <button onClick={login} disabled={loading} style={{ width:'100%', background:'#e8ff47', border:'none', borderRadius:8, padding:'11px 0', fontSize:14, fontWeight:500, color:'#0a0a0a', cursor:'pointer' }}>
                        {loading ? 'Checking...' : 'Login'}
                    </button>
                </div>
            </div>
        )
    }

    const { overview, today, week, month, packBreakdown, recentTransactions, dailyChart, topUsers } = data

    // Max for chart
    const maxCount = Math.max(...(dailyChart?.map((d: any) => d.count) ?? [1]), 1)

    return (
        <div style={S.page}>
            {/* NAV */}
            <nav style={S.nav}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:16, fontWeight:500 }}>
            <span style={{ color:'#f0f0f0' }}>BodyFit</span><span style={{ color:'#e8ff47' }}>AI</span>
            <span style={{ fontSize:12, color:'#666', marginLeft:8 }}>Admin</span>
          </span>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#666' }}>{loading ? 'Refreshing...' : 'Auto-refreshes every 30s'}</span>
                    <button onClick={refresh} style={{ background:'#1a1a1a', border:'0.5px solid #2a2a2a', borderRadius:8, padding:'6px 14px', color:'#888', fontSize:12, cursor:'pointer' }}>
                        Refresh
                    </button>
                    <button onClick={() => setAuthed(false)} style={{ background:'none', border:'none', color:'#666', fontSize:12, cursor:'pointer' }}>
                        Logout
                    </button>
                </div>
            </nav>

            <div style={S.content}>

                {/* OVERVIEW METRICS */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:24 }}>
                    {[
                        { label:'Total users',     value: overview.uniqueUsers,                      sub:'unique IPs',           color:'#e8ff47' },
                        { label:'Total analyses',  value: overview.totalAnalyses,                    sub:'all time',             color:'#5DCAA5' },
                        { label:'Paying users',    value: overview.payingUsers,                      sub:'bought credits',       color:'#80a0ff' },
                        { label:'Total revenue',   value: `₹${overview.totalRevenue.toFixed(0)}`,   sub:'all time',             color:'#e8ff47' },
                    ].map((m, i) => (
                        <div key={i} style={S.metric}>
                            <div style={{ fontSize:11, color:'#666', marginBottom:8 }}>{m.label.toUpperCase()}</div>
                            <div style={{ fontSize:28, fontWeight:500, color:m.color, marginBottom:4 }}>{m.value}</div>
                            <div style={{ fontSize:11, color:'#555' }}>{m.sub}</div>
                        </div>
                    ))}
                </div>

                {/* TODAY / WEEK / MONTH */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:24 }}>
                    {[
                        { label:'Today',      data: today },
                        { label:'This week',  data: week },
                        { label:'This month', data: month },
                    ].map((p, i) => (
                        <div key={i} style={S.card}>
                            <div style={{ fontSize:12, color:'#666', fontWeight:500, marginBottom:14 }}>{p.label.toUpperCase()}</div>
                            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                    <span style={{ fontSize:13, color:'#888' }}>Analyses</span>
                                    <span style={{ fontSize:13, fontWeight:500 }}>{p.data.analyses}</span>
                                </div>
                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                    <span style={{ fontSize:13, color:'#888' }}>Payments</span>
                                    <span style={{ fontSize:13, fontWeight:500 }}>{p.data.payments}</span>
                                </div>
                                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'0.5px solid #1e1e1e' }}>
                                    <span style={{ fontSize:13, color:'#888' }}>Revenue</span>
                                    <span style={{ fontSize:15, fontWeight:500, color:'#e8ff47' }}>₹{p.data.revenue.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* DAILY CHART */}
                <div style={{ ...S.card, marginBottom:24 }}>
                    <div style={{ fontSize:12, color:'#666', fontWeight:500, marginBottom:20 }}>ANALYSES — LAST 14 DAYS</div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:120 }}>
                        {dailyChart?.map((d: any, i: number) => (
                            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                                <div style={{ fontSize:10, color:'#555' }}>{d.count > 0 ? d.count : ''}</div>
                                <div style={{
                                    width:'100%',
                                    height: Math.max(4, (d.count / maxCount) * 90),
                                    background: d.count > 0 ? '#e8ff47' : '#1e1e1e',
                                    borderRadius:3,
                                    transition:'height 0.3s',
                                }}/>
                                <div style={{ fontSize:9, color:'#555', transform:'rotate(-45deg)', whiteSpace:'nowrap' }}>
                                    {d.date.slice(5)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* TABS */}
                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                    {(['overview','transactions','users'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={S.tab(tab===t)}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                {/* OVERVIEW TAB */}
                {tab === 'overview' && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                        {/* Pack breakdown */}
                        <div style={S.card}>
                            <div style={{ fontSize:12, color:'#666', fontWeight:500, marginBottom:16 }}>PACK BREAKDOWN</div>
                            {Object.keys(packBreakdown ?? {}).length === 0
                                ? <div style={{ fontSize:13, color:'#555' }}>No purchases yet</div>
                                : Object.entries(packBreakdown ?? {}).map(([pack, count]: any) => (
                                    <div key={pack} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'0.5px solid #1a1a1a' }}>
                                        <span style={{ fontSize:13, color:'#ccc' }}>{PACK_LABELS[pack] ?? pack}</span>
                                        <span style={{ fontSize:13, fontWeight:500, color:'#e8ff47' }}>{count} sold</span>
                                    </div>
                                ))
                            }
                        </div>

                        {/* Conversion rate */}
                        <div style={S.card}>
                            <div style={{ fontSize:12, color:'#666', fontWeight:500, marginBottom:16 }}>CONVERSION METRICS</div>
                            {[
                                { label:'Free → Paid conversion', value: overview.uniqueUsers > 0 ? `${((overview.payingUsers / overview.uniqueUsers) * 100).toFixed(1)}%` : '0%' },
                                { label:'Avg revenue per user',   value: overview.uniqueUsers > 0 ? `₹${(overview.totalRevenue / overview.uniqueUsers).toFixed(1)}` : '₹0' },
                                { label:'Avg revenue per payer',  value: overview.payingUsers > 0 ? `₹${(overview.totalRevenue / overview.payingUsers).toFixed(1)}` : '₹0' },
                                { label:'Analyses per user',      value: overview.uniqueUsers > 0 ? (overview.totalAnalyses / overview.uniqueUsers).toFixed(1) : '0' },
                            ].map((m, i) => (
                                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'0.5px solid #1a1a1a' }}>
                                    <span style={{ fontSize:13, color:'#888' }}>{m.label}</span>
                                    <span style={{ fontSize:13, fontWeight:500, color:'#e8ff47' }}>{m.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TRANSACTIONS TAB */}
                {tab === 'transactions' && (
                    <div style={S.card}>
                        <div style={{ fontSize:12, color:'#666', fontWeight:500, marginBottom:16 }}>RECENT TRANSACTIONS (last 20)</div>
                        {recentTransactions?.length === 0
                            ? <div style={{ fontSize:13, color:'#555' }}>No transactions yet</div>
                            : (
                                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                    <thead>
                                    <tr>
                                        {['User', 'Pack', 'Credits', 'Amount', 'Date'].map(h => (
                                            <th key={h} style={{ fontSize:11, color:'#666', textAlign:'left', padding:'0 0 12px', fontWeight:500 }}>{h}</th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {recentTransactions.map((t: any, i: number) => (
                                        <tr key={i} style={{ borderTop:'0.5px solid #1a1a1a' }}>
                                            <td style={{ padding:'10px 0', fontSize:12, color:'#888' }}>{t.identifier}</td>
                                            <td style={{ padding:'10px 0', fontSize:12 }}>{PACK_LABELS[t.pack] ?? t.pack}</td>
                                            <td style={{ padding:'10px 0', fontSize:12, color:'#5DCAA5' }}>+{t.credits}</td>
                                            <td style={{ padding:'10px 0', fontSize:13, fontWeight:500, color:'#e8ff47' }}>₹{t.amount}</td>
                                            <td style={{ padding:'10px 0', fontSize:11, color:'#666' }}>{new Date(t.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )
                        }
                    </div>
                )}

                {/* USERS TAB */}
                {tab === 'users' && (
                    <div style={S.card}>
                        <div style={{ fontSize:12, color:'#666', fontWeight:500, marginBottom:16 }}>TOP USERS BY ANALYSES</div>
                        {topUsers?.length === 0
                            ? <div style={{ fontSize:13, color:'#555' }}>No users yet</div>
                            : (
                                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                    <thead>
                                    <tr>
                                        {['#', 'User (masked IP)', 'Analyses'].map(h => (
                                            <th key={h} style={{ fontSize:11, color:'#666', textAlign:'left', padding:'0 0 12px', fontWeight:500 }}>{h}</th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {topUsers.map((u: any, i: number) => (
                                        <tr key={i} style={{ borderTop:'0.5px solid #1a1a1a' }}>
                                            <td style={{ padding:'10px 0', fontSize:12, color:'#555', width:30 }}>#{i+1}</td>
                                            <td style={{ padding:'10px 0', fontSize:12, color:'#ccc' }}>{u.ip}</td>
                                            <td style={{ padding:'10px 0' }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                    <div style={{ height:6, width: Math.max(20, (u.count / (topUsers[0]?.count ?? 1)) * 200), background:'#e8ff47', borderRadius:3 }}/>
                                                    <span style={{ fontSize:13, fontWeight:500 }}>{u.count}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )
                        }
                    </div>
                )}

            </div>
        </div>
    )
}