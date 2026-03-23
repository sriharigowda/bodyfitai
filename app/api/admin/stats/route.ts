import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(req: NextRequest): boolean {
    const auth = req.headers.get('x-admin-token')
    return auth === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now   = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const week  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const { data: allUsage }   = await supabaseAdmin.from('usage').select('*').order('created_at', { ascending: false })
        const { data: allCredits } = await supabaseAdmin.from('credits').select('*')
        const { data: allTxns }    = await supabaseAdmin.from('credit_transactions').select('*').order('created_at', { ascending: false })

        const uniqueUsers   = new Set(allUsage?.map(u => u.identifier) ?? []).size
        const totalAnalyses = allUsage?.reduce((sum, u) => sum + (u.count ?? 0), 0) ?? 0
        const totalRevenue  = allTxns?.reduce((sum, t) => sum + (t.amount_paise ?? 0), 0) ?? 0
        const payingUsers   = new Set(allTxns?.map(t => t.identifier) ?? []).size

        const todayTxns = allTxns?.filter(t => t.created_at >= today) ?? []
        const weekTxns  = allTxns?.filter(t => t.created_at >= week) ?? []
        const monthTxns = allTxns?.filter(t => t.created_at >= month) ?? []

        const todayUsage    = allUsage?.filter(u => u.created_at >= today) ?? []
        const weekUsage     = allUsage?.filter(u => u.created_at >= week) ?? []
        const todayAnalyses = todayUsage.reduce((sum, u) => sum + (u.count ?? 0), 0)
        const weekAnalyses  = weekUsage.reduce((sum, u) => sum + (u.count ?? 0), 0)

        const packCounts: Record<string, number> = {}
        allTxns?.forEach(t => { packCounts[t.pack] = (packCounts[t.pack] ?? 0) + 1 })

        // Daily chart — last 14 days
        const dailyMap: Record<string, number> = {}
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            dailyMap[d.toISOString().slice(0, 10)] = 0
        }
        allUsage?.forEach(u => {
            const day = u.created_at?.slice(0, 10)
            if (day && dailyMap[day] !== undefined) dailyMap[day] += u.count ?? 0
        })

        const recentTxns = allTxns?.slice(0, 20).map(t => ({
            id:         t.id,
            identifier: (t.identifier ?? '').slice(0, 10) + '...',
            pack:       t.pack,
            credits:    t.credits,
            amount:     (t.amount_paise ?? 0) / 100,
            date:       t.created_at,
        })) ?? []

        // Top users by usage
        const userMap: Record<string, number> = {}
        allUsage?.forEach(u => { userMap[u.identifier] = (userMap[u.identifier] ?? 0) + (u.count ?? 0) })
        const topUsers = Object.entries(userMap)
            .sort(([,a],[,b]) => b - a)
            .slice(0, 10)
            .map(([ip, count]) => ({ ip: ip.slice(0, 10) + '...', count }))

        return NextResponse.json({
            overview: { uniqueUsers, totalAnalyses, payingUsers, totalRevenue: totalRevenue / 100 },
            today:    { analyses: todayAnalyses, revenue: todayTxns.reduce((s,t) => s + t.amount_paise/100, 0), payments: todayTxns.length },
            week:     { analyses: weekAnalyses,  revenue: weekTxns.reduce((s,t)  => s + t.amount_paise/100, 0), payments: weekTxns.length },
            month:    { analyses: totalAnalyses, revenue: monthTxns.reduce((s,t) => s + t.amount_paise/100, 0), payments: monthTxns.length },
            packBreakdown:      packCounts,
            recentTransactions: recentTxns,
            dailyChart:         Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
            topUsers,
        })
    } catch (error) {
        console.error('Admin stats error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}