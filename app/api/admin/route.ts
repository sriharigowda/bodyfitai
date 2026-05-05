export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin credentials — add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(req: NextRequest) {
  try {
    const admin  = getAdminClient()
    const action = new URL(req.url).searchParams.get('action') || 'all'

    if (action === 'all') {
      const [authResult, profilesResult, analysesResult, txnsResult, adminUsersResult] = await Promise.all([
        admin.auth.admin.listUsers({ perPage: 500 }),
        admin.from('profiles').select('*'),
        admin.from('user_analyses').select('*').order('created_at', { ascending: false }),
        admin.from('ai_transactions').select('*').order('updated_at', { ascending: false }),
        admin.from('admin_users').select('*'),
      ])

      if (authResult.error) throw new Error(`Auth error: ${authResult.error.message}`)

      return NextResponse.json({
        users:      authResult.data.users || [],
        profiles:   profilesResult.data   || [],
        analyses:   analysesResult.data   || [],
        txns:       txnsResult.data       || [],
        adminUsers: adminUsersResult.data || [],
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Admin GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin      = getAdminClient()
    const body       = await req.json()
    const { action } = body

    if (action === 'add_admin') {
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 500 })
      const user = users.find((u: any) => u.email === body.email)
      if (!user) return NextResponse.json({ error: 'User not found with that email' }, { status: 404 })
      await admin.from('admin_users').upsert({ user_id: user.id, role: body.role })
      return NextResponse.json({ success: true })
    }

    if (action === 'remove_admin') {
      await admin.from('admin_users').delete().eq('user_id', body.userId)
      return NextResponse.json({ success: true })
    }

    if (action === 'save_plan') {
      const { data, error } = await admin
        .from('ai_transactions')
        .update({
          plan_data:   body.planData,
          admin_notes: body.adminNotes,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', body.id)
        .select()

      if (error) {
        console.error('save_plan DB error:', error.message, error.code, error.details)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const rowsUpdated = data?.length ?? 0
      console.log('save_plan success — rows updated:', rowsUpdated, '| id:', body.id)

      if (rowsUpdated === 0) {
        console.warn('save_plan: 0 rows updated — id may not exist:', body.id)
        return NextResponse.json({ error: 'No rows updated — transaction ID not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, updated: rowsUpdated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Admin POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}