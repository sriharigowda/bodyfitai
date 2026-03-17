'use client'
import type { FitnessResults, Goal } from '@/lib/calculations'

interface AiInsights {
    summary: string
    bodyComposition: string
    nutritionTips: string[]
    workoutRecommendation: string
    weeklyMealPlan: { breakfast: string; lunch: string; dinner: string; snack: string }
    motivation: string
    warnings: string[]
}

interface Props {
    results: FitnessResults
    aiInsights: AiInsights
    goal: Goal
}

export default function DownloadReport({ results, aiInsights, goal }: Props) {
    async function generatePDF() {
        // Dynamically import jsPDF — only loads when user clicks download
        const { jsPDF } = await import('jspdf')

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const W = 210  // A4 width mm
        const margin = 18
        const col = W - margin * 2
        let y = 0

        // ── Color palette ──────────────────────────────────────────
        const BLACK   = [15,  15,  15]  as const
        const WHITE   = [255, 255, 255] as const
        const ACCENT  = [180, 200, 30]  as const   // muted lime (prints well)
        const GRAY1   = [30,  30,  30]  as const   // dark bg panels
        const GRAY2   = [50,  50,  50]  as const   // slightly lighter panels
        const GRAY3   = [100, 100, 100] as const   // muted text
        const GRAY4   = [220, 220, 220] as const   // very light lines
        const GREEN   = [50,  160, 120] as const
        const AMBER   = [200, 140, 30]  as const
        const RED     = [200, 90,  90]  as const
        const BLUE    = [80,  150, 210] as const

        // ── Helpers ────────────────────────────────────────────────
        const rgb  = (c: readonly [number,number,number]) => ({ r: c[0], g: c[1], b: c[2] })
        const setFill   = (c: readonly [number,number,number]) => doc.setFillColor(c[0], c[1], c[2])
        const setStroke = (c: readonly [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2])
        const setTextC  = (c: readonly [number,number,number]) => doc.setTextColor(c[0], c[1], c[2])

        function rect(x: number, yy: number, w: number, h: number, fill: readonly [number,number,number], r = 0) {
            setFill(fill)
            doc.roundedRect(x, yy, w, h, r, r, 'F')
        }

        function text(str: string, x: number, yy: number, opts?: { size?: number; bold?: boolean; color?: readonly [number,number,number]; align?: 'left'|'center'|'right'; maxWidth?: number }) {
            const { size = 10, bold = false, color = BLACK, align = 'left', maxWidth } = opts || {}
            doc.setFontSize(size)
            doc.setFont('helvetica', bold ? 'bold' : 'normal')
            setTextC(color)
            if (maxWidth) {
                const lines = doc.splitTextToSize(str, maxWidth)
                doc.text(lines, x, yy, { align })
                return lines.length
            }
            doc.text(str, x, yy, { align })
            return 1
        }

        function sectionTitle(label: string, yy: number) {
            setTextC(ACCENT)
            doc.setFontSize(7.5)
            doc.setFont('helvetica', 'bold')
            doc.text(label.toUpperCase(), margin, yy)
            setStroke(ACCENT)
            doc.setLineWidth(0.3)
            doc.line(margin, yy + 1.5, W - margin, yy + 1.5)
            return yy + 7
        }

        function checkPage(needed: number) {
            if (y + needed > 270) {
                doc.addPage()
                y = 20
            }
        }

        // ══════════════════════════════════════════════════════════
        // PAGE 1 — HEADER
        // ══════════════════════════════════════════════════════════

        // Full-width dark header bar
        rect(0, 0, W, 42, BLACK)

        // BodyFitAI logo text
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('BodyFit', margin, 18)
        const bfWidth = doc.getTextWidth('BodyFit')
        doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2])
        doc.text('AI', margin + bfWidth, 18)

        // Tagline
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text('Personalized Fitness & Nutrition Report', margin, 26)

        // Date + goal badge
        const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        doc.setFontSize(7.5)
        doc.setTextColor(150, 150, 150)
        doc.text(dateStr, W - margin, 18, { align: 'right' })

        // Goal pill
        const goalLabel = goal
        const pillW = doc.getTextWidth(goalLabel) + 8
        rect(W - margin - pillW, 21, pillW, 7, GRAY2, 3)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2])
        doc.text(goalLabel, W - margin - pillW / 2, 26, { align: 'center' })

        y = 52

        // ── AI Summary block ──────────────────────────────────────
        rect(margin, y, col, 26, GRAY1, 4)
        setFill(ACCENT)
        doc.roundedRect(margin, y, 3, 26, 1.5, 1.5, 'F')

        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        setTextC(ACCENT)
        doc.text('AI ANALYSIS', margin + 7, y + 6)

        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        setTextC(WHITE)
        const summaryLines = doc.splitTextToSize(aiInsights.summary, col - 10)
        doc.text(summaryLines, margin + 7, y + 13)

        y += 33

        // ══════════════════════════════════════════════════════════
        // KEY METRICS — 4 cards in a row
        // ══════════════════════════════════════════════════════════
        y = sectionTitle('Key Metrics', y)

        const cardW = (col - 9) / 4
        const cards = [
            { label: 'Daily Calories', value: results.dailyCalories.toLocaleString(), unit: 'kcal/day', color: ACCENT },
            { label: 'Body Fat',       value: `${results.bodyFatPercent}%`,           unit: results.bodyFatCategory, color: GREEN },
            { label: 'Lean Mass',      value: `${results.leanMass} kg`,               unit: 'muscle & bone', color: BLUE },
            { label: 'Fat Mass',       value: `${results.fatMass} kg`,                unit: 'body fat mass', color: RED },
        ]

        cards.forEach((card, i) => {
            const cx = margin + i * (cardW + 3)
            rect(cx, y, cardW, 24, GRAY1, 3)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'normal')
            setTextC(GRAY3)
            doc.text(card.label, cx + cardW / 2, y + 6, { align: 'center' })
            doc.setFontSize(13)
            doc.setFont('helvetica', 'bold')
            setTextC(card.color)
            doc.text(card.value, cx + cardW / 2, y + 15, { align: 'center' })
            doc.setFontSize(6.5)
            doc.setFont('helvetica', 'normal')
            setTextC(GRAY3)
            doc.text(card.unit, cx + cardW / 2, y + 21, { align: 'center' })
        })

        y += 31

        // ══════════════════════════════════════════════════════════
        // MACROS — 4 cards
        // ══════════════════════════════════════════════════════════
        y = sectionTitle('Daily Macro Targets', y)

        const macros = [
            { label: 'Protein', value: results.protein, color: GREEN },
            { label: 'Carbs',   value: results.carbs,   color: AMBER },
            { label: 'Fat',     value: results.fat,      color: RED },
            { label: 'Fiber',   value: results.fiber,    color: BLUE },
        ]

        macros.forEach((m, i) => {
            const cx = margin + i * (cardW + 3)
            rect(cx, y, cardW, 22, GRAY1, 3)

            // Color accent bar at top
            setFill(m.color)
            doc.roundedRect(cx, y, cardW, 3, 1.5, 1.5, 'F')

            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            setTextC(m.color)
            doc.text(`${m.value}g`, cx + cardW / 2, y + 13, { align: 'center' })
            doc.setFontSize(7)
            doc.setFont('helvetica', 'normal')
            setTextC(GRAY3)
            doc.text(m.label, cx + cardW / 2, y + 20, { align: 'center' })
        })

        y += 30

        // ══════════════════════════════════════════════════════════
        // ENERGY BREAKDOWN — table
        // ══════════════════════════════════════════════════════════
        y = sectionTitle('Energy Breakdown', y)

        const energyRows = [
            ['Basal Metabolic Rate (BMR)',      `${results.bmr.toLocaleString()} kcal`],
            ['Total Daily Energy (TDEE)',        `${results.tdee.toLocaleString()} kcal`],
            ['Daily Deficit / Surplus',          results.deficit >= 0 ? `+${results.deficit} kcal` : `${results.deficit} kcal`],
            ['Calories to Burn Daily',           `${results.caloriesToBurn} kcal`],
            ['Estimated Weeks to Goal',          results.weeksToGoal > 0 ? `~${results.weeksToGoal} weeks` : 'Already at goal!'],
        ]

        energyRows.forEach((row, i) => {
            const rowY = y + i * 9
            if (i % 2 === 0) rect(margin, rowY - 3, col, 9, GRAY1, 0)
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'normal')
            setTextC(GRAY3)
            doc.text(row[0], margin + 4, rowY + 2.5)
            doc.setFont('helvetica', 'bold')
            setTextC(WHITE)
            doc.text(row[1], W - margin - 4, rowY + 2.5, { align: 'right' })
        })

        y += energyRows.length * 9 + 8

        // ══════════════════════════════════════════════════════════
        // BODY COMPOSITION
        // ══════════════════════════════════════════════════════════
        checkPage(40)
        y = sectionTitle('Body Composition', y)

        rect(margin, y, col, 20, GRAY1, 4)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        setTextC(GRAY4)
        const bcLines = doc.splitTextToSize(aiInsights.bodyComposition, col - 10)
        doc.text(bcLines, margin + 5, y + 7)
        y += 27

        // ══════════════════════════════════════════════════════════
        // PAGE 2 — NUTRITION + WORKOUT + MEAL PLAN
        // ══════════════════════════════════════════════════════════
        doc.addPage()
        y = 20

        // Mini header on page 2
        rect(0, 0, W, 14, BLACK)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        setTextC(WHITE)
        doc.text('BodyFit', margin, 9)
        const bfw2 = doc.getTextWidth('BodyFit')
        setTextC(ACCENT)
        doc.text('AI', margin + bfw2, 9)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        setTextC(GRAY3)
        doc.text('Nutrition & Workout Plan', W - margin, 9, { align: 'right' })

        y = 24

        // ── Nutrition Tips ────────────────────────────────────────
        y = sectionTitle('Nutrition Tips', y)

        aiInsights.nutritionTips.forEach((tip, i) => {
            checkPage(14)
            rect(margin, y, col, 12, GRAY1, 3)
            // Accent dot
            setFill(ACCENT)
            doc.circle(margin + 5, y + 6, 1.5, 'F')
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'normal')
            setTextC(GRAY4)
            const tipLines = doc.splitTextToSize(tip, col - 16)
            doc.text(tipLines, margin + 10, y + 5)
            const tipH = Math.max(12, tipLines.length * 5 + 6)
            rect(margin, y, col, tipH, GRAY1, 3)
            setFill(ACCENT)
            doc.circle(margin + 5, y + tipH / 2, 1.5, 'F')
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'normal')
            setTextC(GRAY4)
            doc.text(tipLines, margin + 10, y + 5)
            y += tipH + 3
        })

        y += 4

        // ── Workout Recommendation ────────────────────────────────
        checkPage(35)
        y = sectionTitle('Workout Recommendation', y)

        rect(margin, y, col, 28, GRAY1, 4)
        setFill(ACCENT)
        doc.roundedRect(margin, y, 3, 28, 1.5, 1.5, 'F')
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        setTextC(GRAY4)
        const wkLines = doc.splitTextToSize(aiInsights.workoutRecommendation, col - 12)
        doc.text(wkLines, margin + 8, y + 8)
        y += 35

        // ── Sample Meal Plan ──────────────────────────────────────
        checkPage(60)
        y = sectionTitle('Sample Meal Plan', y)

        const meals = [
            { meal: 'BREAKFAST', text: aiInsights.weeklyMealPlan.breakfast, color: AMBER },
            { meal: 'LUNCH',     text: aiInsights.weeklyMealPlan.lunch,     color: GREEN },
            { meal: 'DINNER',    text: aiInsights.weeklyMealPlan.dinner,    color: BLUE },
            { meal: 'SNACK',     text: aiInsights.weeklyMealPlan.snack,     color: RED },
        ]

        const mealColW = (col - 6) / 2

        meals.forEach((m, i) => {
            const col2 = i % 2
            const row2 = Math.floor(i / 2)
            if (col2 === 0 && i > 0) y += 0
            const mx = margin + col2 * (mealColW + 6)
            const my = y + row2 * 30

            rect(mx, my, mealColW, 27, GRAY1, 4)
            setFill(m.color)
            doc.roundedRect(mx, my, mealColW, 4, 2, 2, 'F')

            doc.setFontSize(6.5)
            doc.setFont('helvetica', 'bold')
            setTextC(BLACK)
            doc.text(m.meal, mx + mealColW / 2, my + 3, { align: 'center' })

            doc.setFontSize(7.5)
            doc.setFont('helvetica', 'normal')
            setTextC(GRAY4)
            const mLines = doc.splitTextToSize(m.text, mealColW - 8)
            doc.text(mLines, mx + 4, my + 10)
        })

        y += 68

        // ── Motivation banner ─────────────────────────────────────
        checkPage(20)
        rect(margin, y, col, 16, GRAY2, 4)
        setFill(ACCENT)
        doc.roundedRect(margin, y, col, 16, 4, 4, 'F')
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'bold')
        setTextC(BLACK)
        const motLines = doc.splitTextToSize(`"${aiInsights.motivation}"`, col - 10)
        doc.text(motLines, W / 2, y + 9, { align: 'center' })
        y += 23

        // ── Warnings ──────────────────────────────────────────────
        if (aiInsights.warnings && aiInsights.warnings.length > 0) {
            checkPage(20)
            y = sectionTitle('Important Notes', y)
            aiInsights.warnings.forEach(w => {
                rect(margin, y, col, 12, [40, 25, 10], 3)
                doc.setFontSize(8)
                doc.setFont('helvetica', 'normal')
                setTextC([220, 160, 60])
                const wLines = doc.splitTextToSize(`• ${w}`, col - 8)
                doc.text(wLines, margin + 4, y + 5)
                y += 15
            })
        }

        // ── Footer on all pages ───────────────────────────────────
        const totalPages = doc.getNumberOfPages()
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p)
            setStroke(GRAY2)
            doc.setLineWidth(0.3)
            doc.line(margin, 287, W - margin, 287)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'normal')
            setTextC(GRAY3)
            doc.text('Generated by BodyFitAI · Not a substitute for medical advice', margin, 292)
            doc.text(`Page ${p} of ${totalPages}`, W - margin, 292, { align: 'right' })
        }

        // ── Save ──────────────────────────────────────────────────
        const filename = `BodyFitAI_Report_${new Date().toISOString().slice(0,10)}.pdf`
        doc.save(filename)
    }

    return (
        <button
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