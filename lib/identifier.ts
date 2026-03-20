import { NextRequest } from 'next/server'

// Normalize IP — handles localhost variants and proxies consistently
export function getIdentifier(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const realIp    = req.headers.get('x-real-ip')
    const ip        = forwarded || realIp || 'anonymous'

    // Normalize all localhost variants to same key
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) {
        return 'localhost'
    }

    return ip
}