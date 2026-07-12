import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const existing = req.cookies.get('sid')?.value
  if (existing) {
    return NextResponse.json({ ok: true })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('sid', randomUUID(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
