import { NextRequest } from 'next/server'

export function getIdentifier(req: NextRequest): string {
    // If frontend sends user ID in header (logged in users)
    const userId = req.headers.get('x-user-id')
    if (userId) return `user_${userId}`

    // Fall back to IP for guests
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const realIp    = req.headers.get('x-real-ip')
    const ip        = forwarded || realIp || 'anonymous'

    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) {
        return 'localhost'
    }
    return ip
}