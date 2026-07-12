// In-memory rate limiter (per IP, resets every minute)
// For production, replace with Redis via Upstash

const store = new Map<string, { count: number; reset: number }>()

const MAX = parseInt(process.env.RATE_LIMIT_MAX ?? '60', 10)
const WINDOW_MS = 60 * 1000 // 1 minute

export function rateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.reset) {
    store.set(ip, { count: 1, reset: now + WINDOW_MS })
    return { allowed: true, remaining: MAX - 1 }
  }

  if (entry.count >= MAX) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: MAX - entry.count }
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of store.entries()) {
    if (now > val.reset) store.delete(key)
  }
}, 5 * 60 * 1000)
