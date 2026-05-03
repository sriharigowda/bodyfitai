export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase admin credentials — add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function GET(req: NextRequest) {
  try {
    const admin  = getAdminClient()
    const action = new URL(req.url).searchParams.get('action') || 'all'

    if (action === 'all') {
      const [
        authResult,
        profilesResult,
        analysesResult,
        txnsResult,
        adminUsersResult,
      ] = await Promise.all([
        admin.auth.admin.listUsers({ perPage: 500 }),
        admin.from('profiles').select('*'),
        admin.from('user_analyses').select('user_id, slot1_measurements, slot1_body_fat, slot1_lean_mass, slot1_ffmi, slot1_bmr, slot1_calories'),
        admin.from('ai_transactions').select('*').order('created_at', { ascending: false }),
        admin.from('admin_users').select('*'),
      ])

      if (authResult.error) {
        console.error('Auth error:', authResult.error)
        return NextResponse.json({ error: `Auth error: ${authResult.error.message}` }, { status: 500 })
      }

      return NextResponse.json({
        users:      authResult.data.users || [],
        profiles:   profilesResult.data   || [],
        analyses:   analysesResult.data   || [],
        txns:       txnsResult.data       || [],
        adminUsers: adminUsersResult.data || [],
        debug: {
          userCount:    authResult.data.users?.length || 0,
          profileCount: profilesResult.data?.length   || 0,
          analysisCount:analysesResult.data?.length   || 0,
          txnCount:     txnsResult.data?.length       || 0,
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Admin API error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin  = getAdminClient()
    const body   = await req.json()
    const { action } = body

    if (action === 'add_admin') {
      const { email, role } = body
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 500 })
      const user = users.find((u: any) => u.email === email)
      if (!user) return NextResponse.json({ error: 'User not found with that email' }, { status: 404 })
      await admin.from('admin_users').upsert({ user_id: user.id, role })
      return NextResponse.json({ success: true })
    }

    if (action === 'remove_admin') {
      await admin.from('admin_users').delete().eq('user_id', body.userId)
      return NextResponse.json({ success: true })
    }

    if (action === 'save_plan') {
      const { id, planData, adminNotes } = body
      await admin.from('ai_transactions').update({ plan_data: planData, admin_notes: adminNotes }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}