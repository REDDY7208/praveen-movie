import { NextRequest, NextResponse } from 'next/server'
import { listMovies } from '@/lib/s3'
import { trackVisitor } from '@/lib/analytics'

export async function GET(req: NextRequest) {
  // Track visitor async — don't await so it never blocks the response
  trackVisitor(req, req.nextUrl.pathname + req.nextUrl.search)

  const { searchParams } = req.nextUrl
  const language = searchParams.get('language') ?? undefined
  const genre = searchParams.get('genre') ?? undefined
  const search = searchParams.get('search')?.toLowerCase()

  // Sanitize inputs
  const safeLang = language?.replace(/[^a-z]/gi, '')
  const safeGenre = genre?.replace(/[^a-z-]/gi, '')
  const safeSearch = search?.slice(0, 100)

  try {
    let movies = await listMovies(safeLang, safeGenre)

    if (safeSearch) {
      movies = movies.filter(
        (m) =>
          m.title.toLowerCase().includes(safeSearch) ||
          m.language.includes(safeSearch) ||
          m.genre.includes(safeSearch)
      )
    }

    return NextResponse.json({ movies })
  } catch (err) {
    console.error('S3 list error:', err)
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
  }
}
