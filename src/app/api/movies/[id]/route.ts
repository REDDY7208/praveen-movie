import { NextRequest, NextResponse } from 'next/server'
import { getMovieById } from '@/lib/s3'
import { trackVisitor } from '@/lib/analytics'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  trackVisitor(req, `/watch/${params.id}`)

  // Validate ID — must be base64url only
  if (!/^[A-Za-z0-9_-]+$/.test(params.id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const movie = await getMovieById(params.id)
    if (!movie) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ movie })
  } catch (err) {
    console.error('S3 get error:', err)
    return NextResponse.json({ error: 'Failed to fetch movie' }, { status: 500 })
  }
}
