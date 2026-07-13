import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

// Paths that should be rate limited
const API_PATHS = ['/api/']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'

  // Rate limit API routes
  if (API_PATHS.some((p) => pathname.startsWith(p))) {
    const { allowed, remaining } = rateLimit(ip)
    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      })
    }
    const res = NextResponse.next()
    res.headers.set('X-RateLimit-Remaining', String(remaining))
    return res
  }

  // Block suspicious paths — path traversal, admin probes, etc.
  const blocked = [
    /\.\.\//,           // path traversal
    /\.env/,            // env file probing
    /wp-admin/,         // wordpress probing
    /phpmy/i,           // phpmyadmin
    /\.git/,            // git exposure
    /<script/i,         // XSS in URL
    /union.*select/i,   // SQL injection
    /etc\/passwd/,      // LFI
  ]

  if (blocked.some((pattern) => pattern.test(pathname))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const res = NextResponse.next()

  // Security headers on all responses
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js needs these
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "media-src 'self' https: blob:",                    // allow S3 presigned video URLs
      "connect-src 'self' https:",
      "frame-src 'self' https://www.youtube.com https://youtube.com",
      "frame-ancestors 'none'",
    ].join('; ')
  )
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
