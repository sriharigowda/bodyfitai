export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const userId  = req.headers.get('x-user-id')
    const feature = req.nextUrl.searchParams.get('feature') || 'meal_plan'

    if (!userId) return NextResponse.json({ plan: null })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('ai_transactions')
      .select('plan_data, admin_notes, updated_at')
      .eq('user_id', userId)
      .in('feature', [feature, 'bundle'])
      .not('plan_data', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return NextResponse.json({ plan: null })

    return NextResponse.json({
      plan:       data.plan_data,
      adminNotes: data.admin_notes,
      updatedAt:  data.updated_at,
    })
  } catch (e) {
    console.error('User plan fetch error:', e)
    return NextResponse.json({ plan: null })
  }
}