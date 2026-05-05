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

    // Order by created_at (always exists) instead of updated_at (may be null)
    const { data, error } = await supabase
      .from('ai_transactions')
      .select('plan_data, admin_notes, updated_at, created_at')
      .eq('user_id', userId)
      .in('feature', [feature, 'bundle'])
      .not('plan_data', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.log('user/plan: no plan found for user', userId, 'feature', feature, error?.message)
      return NextResponse.json({ plan: null })
    }

    console.log('user/plan: found plan for user', userId, 'updated_at', data.updated_at)

    return NextResponse.json({
      plan:       data.plan_data,
      adminNotes: data.admin_notes,
      updatedAt:  data.updated_at || data.created_at,
    })
  } catch (e) {
    console.error('User plan fetch error:', e)
    return NextResponse.json({ plan: null })
  }
}