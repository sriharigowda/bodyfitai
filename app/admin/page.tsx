'use client'
import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppUser {
  id: string; email: string; name?: string; age?: number; gender?: string
  created_at: string; goal?: string; diet_type?: string
  body_fat?: number; lean_mass?: number; ffmi?: number; bmr?: number; calories?: number
  measurements?: Record<string,number>; total_spent?: number; analyses_count?: number
  meal_plan?: any; workout_plan?: any
  meal_plan_id?: string; workout_plan_id?: string
}
interface Transaction { id: string; user_id: string; feature: string; amount_inr: number; created_at: string; user_name?: string }
interface AdminUser { id: string; user_id: string; role: string }

// ─── Styles ───────────────────────────────────────────────────────────────────
const G = {
  glass: { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(255,255,255,0.88)', borderRadius:14, boxShadow:'0 2px 16px rgba(59,130,246,0.06)' },
  card:  { background:'rgba(255,255,255,0.60)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'0.5px solid rgba(255,255,255,0.88)', borderRadius:14, overflow:'hidden' as const },
  hdr:   { padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'0.5px solid rgba(59,130,246,0.08)', background:'rgba(255,255,255,0.40)' },
  btn:   { background:'#3b82f6', border:'none', borderRadius:8, padding:'6px 14px', color:'white', fontSize:12, fontWeight:500, cursor:'pointer' } as const,
  btnGh: { background:'rgba(255,255,255,0.60)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:8, padding:'6px 14px', color:'#64748b', fontSize:12, cursor:'pointer' } as const,
  input: { background:'rgba(255,255,255,0.60)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:8, padding:'7px 10px', fontSize:12, color:'#1e293b', outline:'none', width:'100%' },
}

function Pill({ label, color }: { label: string; color: 'blue'|'green'|'amber'|'red'|'gray' }) {
  const s: Record<string,any> = {
    blue:  { background:'rgba(59,130,246,0.10)',  color:'#3b82f6',  border:'0.5px solid rgba(59,130,246,0.20)' },
    green: { background:'rgba(16,185,129,0.10)',  color:'#10b981',  border:'0.5px solid rgba(16,185,129,0.20)' },
    amber: { background:'rgba(245,158,11,0.10)',  color:'#d97706',  border:'0.5px solid rgba(245,158,11,0.20)' },
    red:   { background:'rgba(239,68,68,0.10)',   color:'#ef4444',  border:'0.5px solid rgba(239,68,68,0.20)' },
    gray:  { background:'rgba(148,163,184,0.10)', color:'#94a3b8',  border:'0.5px solid rgba(148,163,184,0.20)' },
  }
  return <span style={{ ...s[color], fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, display:'inline-block' }}>{label}</span>
}

function Avatar({ name, size=28 }: { name: string; size?: number }) {
  const initials = (name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
  return <div style={{ width:size, height:size, borderRadius:'50%', background:'rgba(59,130,246,0.12)', border:'0.5px solid rgba(59,130,246,0.22)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:500, color:'#3b82f6', flexShrink:0 }}>{initials}</div>
}

function BarRow({ label, value, max, color, prefix='' }: { label:string; value:number; max:number; color:string; prefix?:string }) {
  const pct = max > 0 ? Math.min(100, (value/max)*100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
      <div style={{ fontSize:11, color:'#64748b', minWidth:90, textTransform:'capitalize' as const }}>{label.replace(/_/g,' ')}</div>
      <div style={{ flex:1, height:5, background:'rgba(59,130,246,0.08)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.6s ease' }}/>
      </div>
      <div style={{ fontSize:11, color:'#475569', minWidth:44, textAlign:'right' as const }}>{prefix}{value}</div>
    </div>
  )
}

// ─── Meal Plan Editor ─────────────────────────────────────────────────────────
function MealPlanEditor({ plan, planId, onSave }: { plan: any; planId?: string; onSave: (id: string, data: any, notes: string) => Promise<void> }) {
  const [data,   setData]   = useState<any>(plan ? JSON.parse(JSON.stringify(plan)) : null)
  const [tab,    setTab]    = useState<'nonveg'|'veg'>('nonveg')
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  if (!data) return (
    <div style={{ textAlign:'center', padding:'32px 16px' }}>
      <div style={{ fontSize:36, marginBottom:10 }}>🍽️</div>
      <div style={{ fontSize:14, fontWeight:500, color:'#1e293b', marginBottom:4 }}>No meal plan generated yet</div>
      <div style={{ fontSize:12, color:'#94a3b8' }}>User has not purchased the meal plan feature (₹5)</div>
    </div>
  )

  const activePlan = tab === 'nonveg' ? data.nonvegPlan : data.vegPlan
  const hasBoth    = data.nonvegPlan && data.vegPlan

  function updateItem(mi: number, ii: number, val: string) {
    const key     = tab === 'nonveg' ? 'nonvegPlan' : 'vegPlan'
    const updated = JSON.parse(JSON.stringify(data))
    updated[key].meals[mi].items[ii].name = val
    setData(updated)
  }

  function deleteItem(mi: number, ii: number) {
    const key     = tab === 'nonveg' ? 'nonvegPlan' : 'vegPlan'
    const updated = JSON.parse(JSON.stringify(data))
    updated[key].meals[mi].items.splice(ii, 1)
    setData(updated)
  }

  function addItem(mi: number) {
    const key     = tab === 'nonveg' ? 'nonvegPlan' : 'vegPlan'
    const updated = JSON.parse(JSON.stringify(data))
    updated[key].meals[mi].items.push({ name: '', detail: '' })
    setData(updated)
  }

  async function handleSave() {
    if (!planId) return
    setSaving(true)
    await onSave(planId, data, notes)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const TAG_COLORS: Record<string,string> = {
    pre_workout: '#d97706', post_workout: '#059669', bed: '#7c3aed', default: '#3b82f6',
  }

  return (
    <div>
      {hasBoth && (
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {(['nonveg','veg'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'6px 14px', borderRadius:20, border:`0.5px solid ${tab===t?'rgba(59,130,246,0.35)':'rgba(255,255,255,0.9)'}`, background:tab===t?'rgba(59,130,246,0.08)':'rgba(255,255,255,0.60)', color:tab===t?'#3b82f6':'#64748b', fontSize:12, cursor:'pointer', fontWeight:tab===t?600:400 }}>
              {t === 'nonveg' ? '🍗 Non-Veg Day' : '🌿 Veg Day'}
            </button>
          ))}
        </div>
      )}

      {activePlan?.meals?.map((meal: any, mi: number) => (
        <div key={mi} style={{ border:'0.5px solid rgba(59,130,246,0.12)', borderLeft:`3px solid ${TAG_COLORS[meal.type]||TAG_COLORS.default}`, borderRadius:10, marginBottom:10, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'rgba(255,255,255,0.40)', borderBottom:'0.5px solid rgba(59,130,246,0.08)' }}>
            <div style={{ fontSize:12, fontWeight:500, color:'#1e293b' }}>{meal.emoji} {meal.time} — {meal.title}</div>
            <div style={{ fontSize:10, color:'#94a3b8' }}>{meal.protein}P · {meal.carbs}C · {meal.kcal}kcal</div>
          </div>
          <div style={{ padding:'8px 12px' }}>
            {meal.items?.map((item: any, ii: number) => (
              <div key={ii} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0', borderBottom:'0.5px solid rgba(59,130,246,0.06)' }}>
                <input value={item.name} onChange={e => updateItem(mi, ii, e.target.value)}
                  style={{ flex:1, fontSize:12, border:'none', background:'transparent', color:'#1e293b', outline:'none', padding:'2px 4px', borderRadius:4 }}
                  onFocus={e => (e.target.style.background='rgba(59,130,246,0.05)')}
                  onBlur={e  => (e.target.style.background='transparent')}
                />
                <button onClick={() => deleteItem(mi, ii)} style={{ width:18, height:18, borderRadius:4, border:'0.5px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.06)', color:'#ef4444', fontSize:10, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>
            ))}
            <button onClick={() => addItem(mi)} style={{ fontSize:11, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', padding:'4px 0', marginTop:2, fontWeight:500 }}>+ Add item</button>
          </div>
        </div>
      ))}

      <div style={{ marginTop:14, padding:'12px', background:'rgba(59,130,246,0.04)', border:'0.5px solid rgba(59,130,246,0.12)', borderRadius:10 }}>
        <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.05em', marginBottom:6 }}>COACHING NOTES FOR USER</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Add personalized coaching notes... e.g. 'Your post-workout protein looks great. Try adding a casein shake before bed.'"
          style={{ ...G.input, minHeight:70, resize:'vertical' as const, marginBottom:8 }}/>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, alignItems:'center' }}>
          {saved && <span style={{ fontSize:12, color:'#10b981' }}>✓ Saved & user notified!</span>}
          <button onClick={handleSave} disabled={saving||!planId} style={{ ...G.btn, opacity:(saving||!planId)?0.7:1 }}>
            {saving ? 'Saving...' : 'Save & notify user'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Workout Plan Editor ──────────────────────────────────────────────────────
function WorkoutPlanEditor({ plan, planId, onSave }: { plan: any; planId?: string; onSave: (id: string, data: any, notes: string) => Promise<void> }) {
  const [data,      setData]      = useState<any>(plan ? JSON.parse(JSON.stringify(plan)) : null)
  const [activeDay, setActiveDay] = useState(0)
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  if (!data?.days) return (
    <div style={{ textAlign:'center', padding:'32px 16px' }}>
      <div style={{ fontSize:36, marginBottom:10 }}>🏋️</div>
      <div style={{ fontSize:14, fontWeight:500, color:'#1e293b', marginBottom:4 }}>No workout plan generated yet</div>
      <div style={{ fontSize:12, color:'#94a3b8' }}>User has not purchased the workout plan feature (₹5)</div>
    </div>
  )

  function updateEx(di: number, ei: number, field: string, val: string) {
    const updated = JSON.parse(JSON.stringify(data))
    updated.days[di].exercises[ei][field] = val
    setData(updated)
  }

  function deleteEx(di: number, ei: number) {
    const updated = JSON.parse(JSON.stringify(data))
    updated.days[di].exercises.splice(ei, 1)
    setData(updated)
  }

  function addEx(di: number) {
    const updated = JSON.parse(JSON.stringify(data))
    updated.days[di].exercises.push({ name:'New exercise', sets:3, reps:'8-12', rest:'2 min', muscle:'', tip:'' })
    setData(updated)
  }

  async function handleSave() {
    if (!planId) return
    setSaving(true)
    await onSave(planId, data, notes)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const day = data.days[activeDay]
  const DAY_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#f97316','#94a3b8']

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto' as const, paddingBottom:4 }}>
        {data.days.map((d: any, i: number) => (
          <button key={i} onClick={() => setActiveDay(i)}
            style={{ flexShrink:0, padding:'5px 12px', borderRadius:20, border:`0.5px solid ${activeDay===i?DAY_COLORS[i]:'rgba(255,255,255,0.9)'}`, background:activeDay===i?`${DAY_COLORS[i]}18`:'rgba(255,255,255,0.60)', color:activeDay===i?DAY_COLORS[i]:'#64748b', fontSize:11, cursor:'pointer', fontWeight:activeDay===i?600:400 }}>
            {d.emoji} {d.day?.slice(0,3)}
          </button>
        ))}
      </div>

      <div style={{ fontSize:11, fontWeight:600, color:DAY_COLORS[activeDay], letterSpacing:'0.05em', marginBottom:10 }}>
        {day.name?.toUpperCase()} — {day.focus?.toUpperCase()}
      </div>

      {day.exercises?.length === 0
        ? <div style={{ textAlign:'center', padding:'20px', color:'#94a3b8', fontSize:12 }}>😴 Rest & Recovery Day</div>
        : day.exercises?.map((ex: any, ei: number) => (
          <div key={ei} style={{ border:'0.5px solid rgba(59,130,246,0.12)', borderRadius:10, marginBottom:8, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(255,255,255,0.40)', borderBottom:'0.5px solid rgba(59,130,246,0.08)' }}>
              <input value={ex.name} onChange={e => updateEx(activeDay, ei, 'name', e.target.value)}
                style={{ flex:1, fontSize:13, fontWeight:500, border:'none', background:'transparent', color:'#1e293b', outline:'none' }}
                onFocus={e => (e.target.style.background='rgba(59,130,246,0.04)')}
                onBlur={e  => (e.target.style.background='transparent')}
              />
              <button onClick={() => deleteEx(activeDay, ei)} style={{ width:20, height:20, borderRadius:4, border:'0.5px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.06)', color:'#ef4444', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <div style={{ padding:'8px 12px', display:'flex', gap:10, flexWrap:'wrap' as const }}>
              {(['sets','reps','rest','muscle'] as const).map(field => (
                <div key={field}>
                  <div style={{ fontSize:9, color:'#94a3b8', marginBottom:3, letterSpacing:'0.04em' }}>{field.toUpperCase()}</div>
                  <input value={String(ex[field]||'')} onChange={e => updateEx(activeDay, ei, field, e.target.value)}
                    style={{ width:field==='muscle'?90:64, fontSize:12, fontWeight:500, border:'0.5px solid rgba(59,130,246,0.15)', borderRadius:6, padding:'4px 6px', background:'rgba(255,255,255,0.60)', color:'#1e293b', outline:'none' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ padding:'6px 12px', borderTop:'0.5px solid rgba(59,130,246,0.06)' }}>
              <input value={ex.tip||''} onChange={e => updateEx(activeDay, ei, 'tip', e.target.value)}
                placeholder="💡 Tip for user..."
                style={{ width:'100%', fontSize:11, border:'none', background:'transparent', color:'#64748b', outline:'none' }}
              />
            </div>
          </div>
        ))
      }

      {day.exercises?.length > 0 && (
        <button onClick={() => addEx(activeDay)} style={{ width:'100%', border:'0.5px dashed rgba(59,130,246,0.30)', borderRadius:10, padding:'8px', fontSize:12, color:'#3b82f6', background:'rgba(59,130,246,0.03)', cursor:'pointer', marginBottom:10 }}>
          + Add exercise to {day.day}
        </button>
      )}

      <div style={{ marginTop:10, padding:'12px', background:'rgba(59,130,246,0.04)', border:'0.5px solid rgba(59,130,246,0.12)', borderRadius:10 }}>
        <div style={{ fontSize:11, color:'#3b82f6', fontWeight:600, letterSpacing:'0.05em', marginBottom:6 }}>COACHING NOTES FOR USER</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Add coaching notes... e.g. 'Focus on bench press form — keep shoulder blades retracted throughout the movement.'"
          style={{ ...G.input, minHeight:70, resize:'vertical' as const, marginBottom:8 }}/>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, alignItems:'center' }}>
          {saved && <span style={{ fontSize:12, color:'#10b981' }}>✓ Saved & user notified!</span>}
          <button onClick={handleSave} disabled={saving||!planId} style={{ ...G.btn, opacity:(saving||!planId)?0.7:1 }}>
            {saving ? 'Saving...' : 'Save & notify user'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── User Detail View ─────────────────────────────────────────────────────────
function UserDetailView({ user, onBack }: { user: AppUser; onBack: () => void }) {
  async function savePlan(id: string, planData: any, notes: string) {
    await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_plan', id, planData, adminNotes: notes }),
    })
  }

  const MEAS_FIELDS = [
    ['Neck','neck'],['Shoulders','aroundShoulder'],['Chest','chest'],
    ['Bicep','bicep'],['Forearm','forearm'],['Wrist','wrist'],
    ['Stomach','stomach'],['Hip','hip'],['Thigh','thigh'],
    ['Knee','knee'],['Calf','calf'],['Ankle','ankle'],
  ]

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={onBack} style={{ ...G.btnGh, padding:'5px 12px' }}>← Users</button>
        <Avatar name={user.name||user.email||'?'} size={34}/>
        <div>
          <div style={{ fontSize:15, fontWeight:500, color:'#1e293b' }}>{user.name||'Unknown'}</div>
          <div style={{ fontSize:11, color:'#94a3b8' }}>{user.email}</div>
        </div>
        <Pill label="Active" color="green"/>
      </div>

      {/* Profile + Body composition */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div style={G.card}>
          <div style={G.hdr}><div style={{ fontSize:12, fontWeight:500 }}>Profile</div></div>
          <div style={{ padding:'12px 14px' }}>
            {[['Email',user.email],['Age / Gender',`${user.age||'—'} · ${user.gender||'—'}`],['Goal',user.goal||'—'],['Diet',user.diet_type||'—'],['Joined',new Date(user.created_at).toLocaleDateString('en-IN')],['Total spent',`₹${user.total_spent||0}`]].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'0.5px solid rgba(59,130,246,0.06)', fontSize:12 }}>
                <span style={{ color:'#94a3b8' }}>{l}</span>
                <span style={{ fontWeight:500, color:l==='Total spent'?'#10b981':'#1e293b' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={G.card}>
          <div style={G.hdr}><div style={{ fontSize:12, fontWeight:500 }}>Body composition</div></div>
          <div style={{ padding:'12px 14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Body fat',`${user.body_fat||'—'}%`,'#ef4444'],['Lean mass',`${user.lean_mass||'—'} kg`,'#10b981'],['FFMI',`${user.ffmi||'—'}`,'#f59e0b'],['BMR',`${user.bmr||'—'} kcal`,'#3b82f6'],['Calories/day',`${user.calories||'—'}`,'#1e293b'],['Analyses',`${user.analyses_count||0}`,'#1e293b']].map(([l,v,c])=>(
                <div key={l} style={{ background:'rgba(255,255,255,0.40)', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:500, color:c||'#1e293b' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 12 Measurements */}
      <div style={{ ...G.card, marginBottom:12 }}>
        <div style={G.hdr}>
          <div style={{ fontSize:12, fontWeight:500 }}>Body measurements (cm)</div>
          <Pill label="Latest analysis" color="blue"/>
        </div>
        <div style={{ padding:'12px 14px' }}>
          {user.measurements ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {MEAS_FIELDS.map(([label, key]) => (
                <div key={key} style={{ background:'rgba(255,255,255,0.40)', borderRadius:8, padding:'7px 10px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:14, fontWeight:500, color:'#1e293b' }}>{(user.measurements as any)[key]||'—'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'16px', color:'#94a3b8', fontSize:12 }}>No measurements recorded yet</div>
          )}
        </div>
      </div>

      {/* Meal Plan */}
      <div style={{ ...G.card, marginBottom:12 }}>
        <div style={G.hdr}>
          <div style={{ fontSize:12, fontWeight:500 }}>Meal plan</div>
          <Pill label={user.meal_plan?'Generated':'Not purchased'} color={user.meal_plan?'green':'gray'}/>
        </div>
        <div style={{ padding:'12px 14px' }}>
          <MealPlanEditor plan={user.meal_plan} planId={user.meal_plan_id} onSave={savePlan}/>
        </div>
      </div>

      {/* Workout Plan */}
      <div style={{ ...G.card, marginBottom:12 }}>
        <div style={G.hdr}>
          <div style={{ fontSize:12, fontWeight:500 }}>Workout plan</div>
          <Pill label={user.workout_plan?'Generated':'Not purchased'} color={user.workout_plan?'green':'gray'}/>
        </div>
        <div style={{ padding:'12px 14px' }}>
          <WorkoutPlanEditor plan={user.workout_plan} planId={user.workout_plan_id} onSave={savePlan}/>
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed,       setAuthed]       = useState(false)
  const [password,     setPassword]     = useState('')
  const [pwError,      setPwError]      = useState('')
  const [activeTab,    setActiveTab]    = useState<'overview'|'users'|'tokens'|'settings'>('overview')
  const [selectedUser, setSelectedUser] = useState<AppUser|null>(null)
  const [users,        setUsers]        = useState<AppUser[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [adminUsers,   setAdminUsers]   = useState<AdminUser[]>([])
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [loading,      setLoading]      = useState(false)
  const [newEmail,     setNewEmail]     = useState('')
  const [newRole,      setNewRole]      = useState('admin')
  const [metrics,      setMetrics]      = useState({ users:0, revenue:0, cost:0, analyses:0 })

  function handleLogin() {
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'bodyfitai2024admin'
    if (password.trim() !== ADMIN_PASSWORD.trim()) { setPwError('Incorrect password'); return }
    setAuthed(true)
    loadData()
  }

  async function loadData() {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin?action=all')
      const data = await res.json()
      if (data.error) { console.error('Admin load error:', data.error); setLoading(false); return }

      const { users: authUsers=[], profiles=[], analyses=[], txns=[], adminUsers: admins=[] } = data

      const profileMap  = Object.fromEntries((profiles||[]).map((p:any) => [p.user_id, p]))
      // Group analyses by user_id — take latest (analyses are ordered by created_at desc)
      const analysisMap: Record<string,any> = {}
      ;(analyses||[]).forEach((a:any) => { if (!analysisMap[a.user_id]) analysisMap[a.user_id] = a })
      const txnMap: Record<string,any[]> = {}
      ;(txns||[]).forEach((t:any) => { if(!txnMap[t.user_id]) txnMap[t.user_id]=[]; txnMap[t.user_id].push(t) })

      const appUsers: AppUser[] = (authUsers||[]).map((u:any) => {
        const profile    = profileMap[u.id] || {}
        const analysis   = analysisMap[u.id] || {}
        const userTxns   = txnMap[u.id] || []
        const mealTxn    = userTxns.find((t:any) => ['meal_plan','bundle'].includes(t.feature))
        const workoutTxn = userTxns.find((t:any) => ['workout_plan','bundle'].includes(t.feature))
        const totalSpent = userTxns.reduce((s:number,t:any) => s+(t.amount_inr||0), 0)
        // user_analyses uses flat columns (no slot1_ prefix)
        // measurements are stored as individual columns
        const meas = analysis.user_id ? {
          neck: analysis.neck, aroundShoulder: analysis.around_shoulder,
          chest: analysis.chest, bicep: analysis.bicep, forearm: analysis.forearm,
          wrist: analysis.wrist, stomach: analysis.stomach, hip: analysis.hip,
          thigh: analysis.thigh, knee: analysis.knee, calf: analysis.calf, ankle: analysis.ankle,
        } : null
        return {
          id: u.id, email: u.email, name: profile.name, age: profile.age || analysis.age, gender: profile.gender || analysis.gender,
          created_at: u.created_at, goal: analysis.goal, diet_type: analysis.diet_type,
          body_fat:  analysis.body_fat_percent, lean_mass: analysis.lean_mass,
          ffmi:      analysis.ffmi,             bmr:       analysis.bmr,
          calories:  analysis.daily_calories,
          measurements: meas, total_spent: totalSpent,
          analyses_count: analyses.filter((a:any)=>a.user_id===u.id).length,
          meal_plan: mealTxn?.plan_data, meal_plan_id: mealTxn?.id,
          workout_plan: workoutTxn?.plan_data, workout_plan_id: workoutTxn?.id,
        }
      })

      setUsers(appUsers)
      setTransactions((txns||[]).map((t:any) => ({ ...t, user_name: profileMap[t.user_id]?.name||'Unknown' })))
      setAdminUsers(admins||[])
      const totalRevenue = (txns||[]).reduce((s:number,t:any) => s+(t.amount_inr||0), 0)
      setMetrics({ users: appUsers.length, revenue: totalRevenue, cost: Math.round((txns||[]).length*0.12*100)/100, analyses: analyses?.length||0 })
    } catch (e) {
      console.error('Load error:', e)
    }
    setLoading(false)
  }

  async function addAdmin() {
    if (!newEmail.trim()) return
    const res = await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'add_admin', email:newEmail.trim(), role:newRole }) })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    setNewEmail('')
    loadData()
  }

  async function removeAdmin(userId: string) {
    await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'remove_admin', userId }) })
    loadData()
  }

  const filtered = users.filter(u => {
    const ms = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const mf = filter==='all' || (filter==='paying'&&(u.total_spent||0)>0) || (filter==='recent'&&true)
    return ms && mf
  })

  const revenueByFeature = transactions.reduce((acc:Record<string,number>,t) => { acc[t.feature]=(acc[t.feature]||0)+(t.amount_inr||0); return acc }, {})
  const maxRevenue       = Math.max(...Object.values(revenueByFeature), 1)

  // ── Login screen ─────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ ...G.glass, padding:'32px 28px', maxWidth:380, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:24, fontWeight:500, color:'#1e293b', marginBottom:4 }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></div>
        <div style={{ fontSize:11, background:'rgba(59,130,246,0.08)', color:'#3b82f6', border:'0.5px solid rgba(59,130,246,0.22)', borderRadius:20, padding:'3px 12px', display:'inline-block', marginBottom:20, fontWeight:600, letterSpacing:'0.06em' }}>ADMIN ACCESS</div>
        <h1 style={{ fontSize:22, fontWeight:500, color:'#1e293b', marginBottom:6 }}>Sign in to admin</h1>
        <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>Enter your admin password to continue</p>
        <input type="password" placeholder="Admin password" value={password}
          onChange={e => { setPassword(e.target.value); setPwError('') }}
          onKeyDown={e => e.key==='Enter' && handleLogin()}
          style={{ ...G.input, marginBottom:8, textAlign:'center', letterSpacing:4, fontSize:16 }}/>
        {pwError && <div style={{ fontSize:12, color:'#ef4444', marginBottom:8 }}>{pwError}</div>}
        <button onClick={handleLogin} style={{ ...G.btn, width:'100%', padding:'11px 0', fontSize:14 }}>
          Enter admin panel →
        </button>
        <a href="/" style={{ display:'block', marginTop:12, fontSize:12, color:'#94a3b8', textDecoration:'none' }}>← Back to site</a>
      </div>
    </div>
  )

  // ── Admin panel ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e8f0fe 0%,#f0f7ff 50%,#e8f4ff 100%)' }}>
      {/* Nav */}
      <nav style={{ background:'rgba(255,255,255,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'0.5px solid rgba(255,255,255,0.9)', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky' as const, top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:17, fontWeight:500, color:'#1e293b' }}>BodyFit<span style={{ color:'#3b82f6' }}>AI</span></div>
          <span style={{ fontSize:10, background:'#3b82f6', color:'white', borderRadius:4, padding:'2px 7px', fontWeight:600, letterSpacing:'0.05em' }}>ADMIN</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {loading && <span style={{ fontSize:11, color:'#94a3b8' }}>Loading...</span>}
          <a href="/" style={{ fontSize:11, color:'#64748b', textDecoration:'none', background:'rgba(255,255,255,0.60)', border:'0.5px solid rgba(255,255,255,0.9)', borderRadius:20, padding:'4px 10px' }}>View site</a>
          <button onClick={() => { setAuthed(false); setPassword('') }} style={{ fontSize:11, color:'#94a3b8', background:'none', border:'none', cursor:'pointer' }}>Sign out</button>
        </div>
      </nav>

      {/* Tab bar */}
      <div style={{ background:'rgba(255,255,255,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'0.5px solid rgba(255,255,255,0.9)', padding:'0 20px', display:'flex', gap:2 }}>
        {(['overview','users','tokens','settings'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedUser(null) }}
            style={{ padding:'10px 16px', fontSize:12, fontWeight:500, border:'none', borderBottom:`2px solid ${activeTab===tab?'#3b82f6':'transparent'}`, background:'transparent', color:activeTab===tab?'#3b82f6':'#64748b', cursor:'pointer', transition:'all 0.15s' }}>
            {tab==='tokens'?'AI & Revenue':tab.charAt(0).toUpperCase()+tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 20px 48px' }}>

        {/* ── OVERVIEW ── */}
        {activeTab==='overview' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                { label:'Total users',   value:metrics.users.toString(),    sub:'registered',      color:'#3b82f6' },
                { label:'Total revenue', value:`₹${metrics.revenue}`,       sub:'all time',        color:'#10b981' },
                { label:'AI cost',       value:`₹${metrics.cost}`,          sub:'~2% of revenue',  color:'#f59e0b' },
                { label:'Analyses',      value:metrics.analyses.toString(), sub:'completed',        color:'#8b5cf6' },
              ].map(m => (
                <div key={m.label} style={{ ...G.glass, padding:'14px 16px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'0.05em', marginBottom:6 }}>{m.label.toUpperCase()}</div>
                  <div style={{ fontSize:22, fontWeight:500, color:m.color, marginBottom:3 }}>{m.value}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={G.card}>
                <div style={G.hdr}><div style={{ fontSize:12, fontWeight:500 }}>Revenue by feature</div><Pill label="all time" color="blue"/></div>
                <div style={{ padding:'14px 16px' }}>
                  {Object.keys(revenueByFeature).length === 0
                    ? <div style={{ color:'#94a3b8', fontSize:12, textAlign:'center', padding:20 }}>No transactions yet</div>
                    : Object.entries(revenueByFeature).map(([f,v]) => <BarRow key={f} label={f} value={v} max={maxRevenue} color='#3b82f6' prefix='₹'/>)
                  }
                </div>
              </div>
              <div style={G.card}>
                <div style={G.hdr}><div style={{ fontSize:12, fontWeight:500 }}>Recent transactions</div><Pill label="latest" color="green"/></div>
                <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                  <thead><tr style={{ background:'rgba(255,255,255,0.40)' }}>
                    {['User','Feature','Amount'].map(h=><th key={h} style={{ padding:'7px 12px', textAlign:'left' as const, fontWeight:500, color:'#94a3b8', fontSize:10, borderBottom:'0.5px solid rgba(59,130,246,0.10)' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {transactions.slice(0,6).map((t,i)=>(
                      <tr key={i} style={{ borderTop:'0.5px solid rgba(59,130,246,0.07)' }}>
                        <td style={{ padding:'7px 12px', color:'#1e293b' }}>{t.user_name}</td>
                        <td style={{ padding:'7px 12px', color:'#64748b' }}>{t.feature.replace(/_/g,' ')}</td>
                        <td style={{ padding:'7px 12px', color:'#10b981', fontWeight:500 }}>₹{t.amount_inr}</td>
                      </tr>
                    ))}
                    {transactions.length===0&&<tr><td colSpan={3} style={{ textAlign:'center', padding:20, color:'#94a3b8', fontSize:12 }}>No transactions yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab==='users' && (
          selectedUser ? (
            <UserDetailView user={selectedUser} onBack={() => setSelectedUser(null)}/>
          ) : (
            <>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..." style={{ ...G.input, flex:1 }}/>
                <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ ...G.input, width:'auto' }}>
                  <option value="all">All users</option>
                  <option value="paying">Paying only</option>
                  <option value="recent">Recent</option>
                </select>
                <button onClick={loadData} style={G.btnGh}>↻ Refresh</button>
              </div>
              <div style={G.card}>
                <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                  <thead><tr style={{ background:'rgba(255,255,255,0.40)' }}>
                    {['User','Joined','Analyses','Meal plan','Workout','Spent',''].map(h=>(
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left' as const, fontWeight:500, color:'#94a3b8', fontSize:10, borderBottom:'0.5px solid rgba(59,130,246,0.10)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filtered.map(u=>(
                      <tr key={u.id} style={{ borderBottom:'0.5px solid rgba(59,130,246,0.06)', cursor:'pointer' }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(59,130,246,0.03)'}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}>
                        <td style={{ padding:'9px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <Avatar name={u.name||u.email||'?'} size={26}/>
                            <div>
                              <div style={{ fontWeight:500, color:'#1e293b' }}>{u.name||'—'}</div>
                              <div style={{ fontSize:10, color:'#94a3b8' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'9px 12px', color:'#64748b' }}>{new Date(u.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                        <td style={{ padding:'9px 12px', color:'#64748b' }}>{u.analyses_count}</td>
                        <td style={{ padding:'9px 12px' }}><Pill label={u.meal_plan?'Generated':'No plan'} color={u.meal_plan?'green':'gray'}/></td>
                        <td style={{ padding:'9px 12px' }}><Pill label={u.workout_plan?'Generated':'No plan'} color={u.workout_plan?'green':'gray'}/></td>
                        <td style={{ padding:'9px 12px', color:'#10b981', fontWeight:500 }}>₹{u.total_spent||0}</td>
                        <td style={{ padding:'9px 12px' }}>
                          <button onClick={()=>setSelectedUser(u)} style={{ ...G.btn, padding:'4px 10px' }}>View →</button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length===0&&(
                      <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>
                        {loading?'Loading users...':'No users found'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}

        {/* ── AI & REVENUE ── */}
        {activeTab==='tokens' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                { label:'AI cost',      value:`₹${metrics.cost}`,     sub:'this month',   color:'#f59e0b' },
                { label:'AI revenue',   value:`₹${metrics.revenue}`,  sub:'all time',     color:'#10b981' },
                { label:'Margin',       value:metrics.revenue>0?`${Math.round(((metrics.revenue-metrics.cost)/metrics.revenue)*100)}%`:'98%', sub:'profit margin', color:'#3b82f6' },
                { label:'Avg/user',     value:metrics.users>0?`₹${Math.round(metrics.revenue/metrics.users*10)/10}`:'₹0', sub:'avg spent', color:'#8b5cf6' },
              ].map(m=>(
                <div key={m.label} style={{ ...G.glass, padding:'14px 16px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'0.05em', marginBottom:6 }}>{m.label.toUpperCase()}</div>
                  <div style={{ fontSize:22, fontWeight:500, color:m.color, marginBottom:3 }}>{m.value}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={G.card}>
                <div style={G.hdr}><div style={{ fontSize:12, fontWeight:500 }}>Revenue by feature</div></div>
                <div style={{ padding:'14px 16px' }}>
                  {Object.entries(revenueByFeature).map(([f,v])=><BarRow key={f} label={f} value={v} max={maxRevenue} color='#3b82f6' prefix='₹'/>)}
                  {Object.keys(revenueByFeature).length===0&&<div style={{ color:'#94a3b8', fontSize:12, textAlign:'center', padding:16 }}>No data yet</div>}
                </div>
              </div>
              <div style={G.card}>
                <div style={G.hdr}><div style={{ fontSize:12, fontWeight:500 }}>Cost vs revenue</div></div>
                <div style={{ padding:'14px 16px' }}>
                  <BarRow label="Revenue" value={metrics.revenue} max={metrics.revenue||1} color='#10b981' prefix='₹'/>
                  <BarRow label="AI cost"  value={metrics.cost}    max={metrics.revenue||1} color='#ef4444' prefix='₹'/>
                  <BarRow label="Profit"   value={Math.round((metrics.revenue-metrics.cost)*100)/100} max={metrics.revenue||1} color='#3b82f6' prefix='₹'/>
                  <div style={{ marginTop:10, padding:'8px 10px', background:'rgba(16,185,129,0.06)', border:'0.5px solid rgba(16,185,129,0.18)', borderRadius:8, fontSize:12, color:'#10b981', fontWeight:500 }}>
                    Margin: {metrics.revenue>0?Math.round(((metrics.revenue-metrics.cost)/metrics.revenue)*100):98}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab==='settings' && (
          <div>
            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:500, letterSpacing:'0.06em', marginBottom:10 }}>ADMIN ROLES</div>
            {adminUsers.map(admin=>(
              <div key={admin.id} style={{ ...G.glass, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Avatar name={admin.user_id} size={30}/>
                  <div style={{ fontSize:12, color:'#64748b' }}>{admin.user_id}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Pill label={admin.role} color={admin.role==='super_admin'?'blue':admin.role==='admin'?'green':'gray'}/>
                  {admin.role!=='super_admin'&&(
                    <button onClick={()=>removeAdmin(admin.user_id)} style={{ ...G.btnGh, padding:'3px 8px', color:'#ef4444', fontSize:11 }}>Remove</button>
                  )}
                </div>
              </div>
            ))}
            {adminUsers.length===0&&<div style={{ ...G.glass, padding:'20px', textAlign:'center', marginBottom:12, fontSize:12, color:'#94a3b8' }}>No admins added yet</div>}

            <div style={{ ...G.glass, padding:'14px 16px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#64748b', fontWeight:500, marginBottom:10 }}>Add new admin</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="User email address..." style={{ ...G.input, flex:1 }}/>
                <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{ ...G.input, width:'auto' }}>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button onClick={addAdmin} style={G.btn}>Add</button>
              </div>
            </div>

            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:500, letterSpacing:'0.06em', marginBottom:10 }}>SECURITY</div>
            <div style={G.card}>
              <div style={{ padding:'12px 14px' }}>
                {[
                  ['Password protection','Enabled','green'],
                  ['Admin URL','/admin','gray'],
                  ['Service role key', process.env.NEXT_PUBLIC_SUPABASE_URL?'Connected':'Not set', process.env.NEXT_PUBLIC_SUPABASE_URL?'green':'red'],
                ].map(([l,v,c])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid rgba(59,130,246,0.06)', fontSize:12 }}>
                    <span style={{ color:'#64748b' }}>{l}</span>
                    <Pill label={v as string} color={c as any}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}