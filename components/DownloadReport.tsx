'use client'
import type { FitnessResults, Goal } from '@/lib/calculations'

interface Props {
  results: FitnessResults
  aiInsights: any
  goal: Goal
  name?: string
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function DownloadReport({ results, aiInsights, goal, name }: Props) {

  async function generatePDF() {
    // Show loading state on button
    const btn = document.getElementById('pdf-btn') as HTMLButtonElement
    if (btn) { btn.textContent = 'Generating...'; btn.disabled = true }

    try {
      // Load jsPDF from CDN
      if (!(window as any).jspdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load jsPDF'))
          document.head.appendChild(script)
        })
      }

      const { jsPDF } = (window as any).jspdf
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const W = 210
      const M = 16
      const CW = W - M * 2
      let y = 0

      // Colors
      const C = {
        black:  [15, 15, 15]   as const,
        white:  [255,255,255]  as const,
        accent: [170,190,25]   as const,
        g1:     [28, 28, 28]   as const,
        g2:     [45, 45, 45]   as const,
        g3:     [90, 90, 90]   as const,
        g4:     [210,210,210]  as const,
        green:  [50, 160,120]  as const,
        amber:  [200,140, 30]  as const,
        red:    [200, 90, 90]  as const,
        blue:   [80, 150,210]  as const,
      }

      const sf  = (c: readonly number[]) => doc.setFillColor(c[0], c[1], c[2])
      const ss  = (c: readonly number[]) => doc.setDrawColor(c[0], c[1], c[2])
      const st  = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2])
      const rr  = (x:number,yy:number,w:number,h:number,c:readonly number[],r=0) => { sf(c); doc.roundedRect(x,yy,w,h,r,r,'F') }
      const ln  = (label:string) => { st(C.g3); doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.text(label.toUpperCase(), M, y); ss(C.g2); doc.setLineWidth(0.3); doc.line(M, y+1.5, W-M, y+1.5); y += 8 }
      const addMiniHeader = () => {
        rr(0, 0, W, 12, C.g1)
        doc.setFontSize(8); doc.setFont('helvetica','bold')
        st(C.white); doc.text('BodyFit', M, 8)
        st(C.accent); doc.text('AI', M + doc.getTextWidth('BodyFit'), 8)
        st(C.g3); doc.setFontSize(7); doc.setFont('helvetica','normal')
        doc.text('Fitness & Nutrition Report', W-M, 8, { align:'right' })
      }

      const chk = (need:number) => { if(y+need > 275){ doc.addPage(); addMiniHeader(); y = 22 } }

      const safe = (val: any, fallback = '') => {
        if (val == null) return fallback
        return String(val).replace(/[\x00-\x1F\x7F]/g, ' ').trim()
      }




      // ══ PAGE 1 HEADER ══════════════════════════════════════════
      rr(0, 0, W, 40, C.black)
      doc.setFontSize(22); doc.setFont('helvetica','bold')
      st(C.white); doc.text('BodyFit', M, 18)
      st(C.accent); doc.text('AI', M + doc.getTextWidth('BodyFit'), 18)
      doc.setFontSize(8); doc.setFont('helvetica','normal')
      st([130,130,130]); doc.text('Personalized Fitness & Nutrition Report', M, 26)
      const dateStr = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
      st([120,120,120]); doc.setFontSize(7.5); doc.text(dateStr, W-M, 18, {align:'right'})
      // Name + goal pill
      if (name) { st(C.white); doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text(`${name}'s Report`, W-M, 26, {align:'right'}) }
      const pillW = doc.getTextWidth(goal) + 8
      rr(W-M-pillW, 28, pillW, 7, C.g2, 3)
      doc.setFontSize(7); st(C.accent); doc.text(goal, W-M-pillW/2, 33, {align:'center'})

      y = 50

      // ══ GREETING ═══════════════════════════════════════════════
      rr(M, y, CW, 22, [20,30,8], 4)
      sf(C.accent); doc.roundedRect(M, y, 3, 22, 1.5, 1.5, 'F')
      doc.setFontSize(7); doc.setFont('helvetica','bold'); st(C.accent)
      doc.text('AI ANALYSIS', M+6, y+6)
      st(C.white); doc.setFontSize(8.5); doc.setFont('helvetica','normal')
      const greetLines = doc.splitTextToSize(safe(aiInsights?.greeting || aiInsights?.summary, 'Your personalized fitness report is ready.'), CW-12)
      doc.text(greetLines, M+6, y+13)
      y += 28

      // ══ KEY METRICS ════════════════════════════════════════════
      ln('Key Metrics')
      const cW4 = (CW-9)/4
      const metrics = [
        { l:'Daily calories', v: results.dailyCalories.toLocaleString(), u:'kcal/day', c:C.accent },
        { l:'Body fat',        v: `${results.bodyFatPercent}%`,           u:results.bodyFatCategory, c:C.red },
        { l:'Lean mass',       v: `${results.leanMass}kg`,                u:'muscle+bone', c:C.green },
        { l:'FFMI',            v: `${results.ffmi}`,                      u:results.ffmiCategory, c:C.blue },
      ]
      metrics.forEach((m,i) => {
        const cx = M + i*(cW4+3)
        rr(cx, y, cW4, 22, C.g1, 3)
        st(C.g3); doc.setFontSize(6.5); doc.setFont('helvetica','normal'); doc.text(m.l, cx+cW4/2, y+5.5, {align:'center'})
        st(m.c); doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text(m.v, cx+cW4/2, y+14, {align:'center'})
        st(C.g3); doc.setFontSize(6); doc.setFont('helvetica','normal'); doc.text(m.u, cx+cW4/2, y+19.5, {align:'center'})
      })
      y += 28

      // ══ MACROS ═════════════════════════════════════════════════
      ln('Daily Macro Targets')
      const macros = [
        { l:'Protein', v:`${results.protein}g`, c:C.green },
        { l:'Carbs',   v:`${results.carbs}g`,   c:C.amber },
        { l:'Fat',     v:`${results.fat}g`,      c:C.red },
        { l:'Fiber',   v:`${results.fiber}g`,    c:C.blue },
      ]
      macros.forEach((m,i) => {
        const cx = M + i*(cW4+3)
        rr(cx, y, cW4, 20, C.g1, 3)
        sf(m.c); doc.roundedRect(cx, y, cW4, 3, 1.5, 1.5, 'F')
        st(m.c); doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.text(m.v, cx+cW4/2, y+13, {align:'center'})
        st(C.g3); doc.setFontSize(6.5); doc.setFont('helvetica','normal'); doc.text(m.l, cx+cW4/2, y+18.5, {align:'center'})
      })
      y += 26

      // ══ ENERGY TABLE ═══════════════════════════════════════════
      ln('Energy Breakdown')
      const eRows = [
        ['BMR (Basal Metabolic Rate)',  `${results.bmr.toLocaleString()} kcal`],
        ['Daily energy expenditure',    `${results.tdee.toLocaleString()} kcal`],
        ['Daily calorie target',        `${results.dailyCalories.toLocaleString()} kcal`],
        ['Deficit / surplus',           results.deficit >= 0 ? `+${results.deficit} kcal` : `${results.deficit} kcal`],
        ['Estimated weeks to goal',     results.weeksToGoal > 0 ? `~${results.weeksToGoal} weeks` : 'At goal!'],
      ]
      eRows.forEach((row,i) => {
        if (i%2===0) rr(M, y-2, CW, 9, C.g1)
        st(C.g3); doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.text(row[0], M+3, y+3.5)
        st(C.white); doc.setFont('helvetica','bold'); doc.text(row[1], W-M-3, y+3.5, {align:'right'})
        y += 9
      })
      y += 6

      // ══ CURRENT ANALYSIS ═══════════════════════════════════════
      chk(60)
      ln('Current Body Analysis')
      const renderItems = (items: {title:string;text:any;bar:number[]}[], fallback: string) => {
        items.forEach(item => {
          const txt = safe(item.text, fallback)
          const lines = doc.splitTextToSize(txt, CW-10)
          const h = Math.max(18, lines.length * 4.5 + 10)
          chk(h+4)
          rr(M, y, CW, h, C.g1, 3)
          sf(item.bar); doc.roundedRect(M, y, CW, 4, 2, 2, 'F')
          st(C.accent); doc.setFontSize(7); doc.setFont('helvetica','bold')
          doc.text(item.title, M+4, y+10)
          st(C.g4); doc.setFontSize(8); doc.setFont('helvetica','normal')
          doc.text(lines, M+4, y+16)
          y += h+4
        })
      }

      const ca = aiInsights?.currentAnalysis || {}
      const caItems = [
        { title:`Body fat — ${results.bodyFatPercent}% (${results.bodyFatCategory})`, text: ca.bodyFatExplanation, bar:[200,80,80] },
        { title:`Lean mass — ${results.leanMass}kg`,                                   text: ca.leanMassExplanation, bar:[50,160,120] },
        { title:`Muscle index (FFMI) — ${results.ffmi} (${results.ffmiCategory})`,                    text: ca.ffmiExplanation, bar:[80,150,210] },
      ]
      renderItems(caItems, 'Personalized analysis based on your measurements.')

      // ══ TARGET ANALYSIS ════════════════════════════════════════
      chk(60)
      ln('Target Body Analysis')
      const ta = aiInsights?.targetAnalysis || {}
      const taItems = [
        { title:`Target body fat — ${results.target.targetBodyFat}%`, text: ta.bodyFatExplanation, bar:[200,80,80] },
        { title:`Target lean mass — ${results.target.targetLeanMass}kg`, text: ta.leanMassExplanation, bar:[50,160,120] },
        { title:`Target muscle index — ${results.target.targetFFMI}`, text: ta.ffmiExplanation, bar:[80,150,210] },
      ]
      renderItems(taItems, 'Target analysis based on your goal weight.')

      // ══ NUTRITION TIPS ═════════════════════════════════════════
      chk(40)
      ln('Nutrition Tips')
      const tips: string[] = Array.isArray(aiInsights?.nutritionTips) ? aiInsights.nutritionTips : []
      tips.forEach((tip: string) => {
        const lines = doc.splitTextToSize(safe(tip,''), CW-12)
        const h = Math.max(12, lines.length*4.5+6)
        chk(h+3)
        rr(M, y, CW, h, C.g1, 3)
        sf(C.accent); doc.circle(M+5, y+h/2, 1.5, 'F')
        st(C.g4); doc.setFontSize(8); doc.setFont('helvetica','normal')
        doc.text(lines, M+9, y+5)
        y += h+3
      })

      // ══ WORKOUT ════════════════════════════════════════════════
      chk(30)
      y += 4; ln('Workout Recommendation')
      const wk = safe(aiInsights?.workoutRecommendation, 'Focus on consistency with your training.')
      const wkLines = doc.splitTextToSize(wk, CW-8)
      const wkH = Math.max(16, wkLines.length*4.5+8)
      rr(M, y, CW, wkH, C.g1, 3)
      sf(C.accent); doc.roundedRect(M, y, 3, wkH, 1.5, 1.5, 'F')
      st(C.g4); doc.setFontSize(8.5); doc.setFont('helvetica','normal')
      doc.text(wkLines, M+6, y+7)
      y += wkH+6

      // ══ TIMELINE ══════════════════════════════════════════════
      chk(40)
      ln('Timeline to Goal')
      const dur = aiInsights?.duration || {}
      rr(M, y, CW, 36, [18,28,8], 4)
      // Big time display
      st(C.accent); doc.setFontSize(20); doc.setFont('helvetica','bold')
      doc.text(safe(dur.months, `${results.weeksToGoal} wks`), M+6, y+14)
      st(C.g3); doc.setFontSize(7.5); doc.setFont('helvetica','normal')
      doc.text(`~${results.weeksToGoal} weeks`, M+6, y+20)
      // Milestones
      const ms = [
        { l:'4 weeks', t: safe(dur.milestone4weeks,'Early progress') },
        { l:'8 weeks', t: safe(dur.milestone8weeks,'Visible changes') },
        { l:'Goal',    t: safe(dur.milestoneGoal,'Target achieved') },
      ]
      ms.forEach((m,i) => {
        const mx = M + 60 + i*46
        st(C.accent); doc.setFontSize(6.5); doc.setFont('helvetica','bold'); doc.text(m.l, mx, y+8)
        st(C.g4); doc.setFontSize(7); doc.setFont('helvetica','normal')
        const tl = doc.splitTextToSize(m.t, 42)
        doc.text(tl.slice(0,3), mx, y+14)
      })
      y += 42

      // ══ WEEKLY DIET PLAN (new page) ════════════════════════════
      doc.addPage(); addMiniHeader(); y = 22
      ln('Weekly Diet Plan')

      const wdp = aiInsights?.weeklyDietPlan || {}
      DAYS.forEach(day => {
        const plan = wdp[day]
        if (!plan) return
        const isVeg = String(plan.type||'').toLowerCase().includes('veg') && !String(plan.type||'').toLowerCase().includes('non')
        const meals = [
          { l:'Breakfast', t: safe(plan.breakfast,'—') },
          { l:'Lunch',     t: safe(plan.lunch,'—') },
          { l:'Dinner',    t: safe(plan.dinner,'—') },
          { l:'Snack',     t: safe(plan.snack,'—') },
        ]
        // Estimate height needed
        let totalH = 14
        meals.forEach(m => { totalH += doc.splitTextToSize(m.t, (CW-12)/2-4).length * 4 + 7 })
        totalH = Math.max(40, totalH)
        chk(totalH+4)

        rr(M, y, CW, totalH, C.g1, 3)
        // Day header
        sf(isVeg ? [30,80,50] : [80,30,30])
        doc.roundedRect(M, y, CW, 9, 2, 2, 'F')
        st(C.white); doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text(day, M+5, y+6)
        const tag = isVeg ? 'Veg' : 'Non-veg'
        st(isVeg ? [150,230,150] : [230,150,150])
        doc.setFontSize(7); doc.text(tag, W-M-4, y+6, {align:'right'})

        // Meals in 2 columns
        let my = y+13
        const mColW = (CW-12)/2
        meals.forEach((m,i) => {
          const mx = M+4 + (i%2)*(mColW+4)
          if (i%2===0 && i>0) my += 0
          st(C.accent); doc.setFontSize(6.5); doc.setFont('helvetica','bold'); doc.text(m.l.toUpperCase(), mx, my)
          st(C.g4); doc.setFontSize(7.5); doc.setFont('helvetica','normal')
          const tl = doc.splitTextToSize(m.t, mColW-4)
          doc.text(tl, mx, my+5)
          if (i%2===1) my += tl.length*4+10
        })
        y += totalH+4
      })

      // ══ MOTIVATION BANNER ══════════════════════════════════════
      chk(20)
      y += 4
      rr(M, y, CW, 16, C.accent, 4)
      st(C.black); doc.setFontSize(9); doc.setFont('helvetica','bold')
      const motLines = doc.splitTextToSize(`"${safe(aiInsights?.motivation,'You have the strength to achieve your goals.')}"`, CW-10)
      doc.text(motLines, W/2, y+9, {align:'center'})
      y += 22

      // ══ FOOTER ════════════════════════════════════════════════
      const total = doc.getNumberOfPages()
      for (let p=1; p<=total; p++) {
        doc.setPage(p)
        ss(C.g2); doc.setLineWidth(0.3); doc.line(M, 287, W-M, 287)
        st(C.g3); doc.setFontSize(7); doc.setFont('helvetica','normal')
        doc.text('Generated by BodyFitAI · Not medical advice', M, 292)
        doc.text(`Page ${p} of ${total}`, W-M, 292, {align:'right'})
      }

      const filename = `BodyFitAI_${(name||'Report').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`
      doc.save(filename)

    } catch (err) {
      console.error('PDF error:', err)
      alert('PDF generation failed: ' + (err as Error).message)
    } finally {
      if (btn) { btn.textContent = 'Download PDF Report'; btn.disabled = false }
    }
  }

  return (
      <button
          id="pdf-btn"
          onClick={generatePDF}
          style={{
            width: '100%',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 10,
            padding: '13px 0',
            color: '#0a0a0a',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 10,
          }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download PDF Report
      </button>
  )
}