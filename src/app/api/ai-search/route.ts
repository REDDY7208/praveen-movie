import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { listMovies } from '@/lib/s3'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query?.trim()) return NextResponse.json({ movies: [] })

    // Get all movies from S3
    const allMovies = await listMovies()

    // Build a simple catalog for Gemini (no URLs, just metadata)
    const catalog = allMovies.map((m) => ({
      id: m.id,
      title: m.title,
      language: m.language,
      genre: m.genre,
    }))

    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
You are a movie recommendation assistant for a streaming site.
The user searched: "${query}"

Here is the available movie catalog (JSON):
${JSON.stringify(catalog, null, 2)}

Return a JSON array of movie IDs that best match the user's search intent.
Consider mood, genre, language, themes. Return at most 10 results.
Only return IDs that exist in the catalog above.
Respond with ONLY a raw JSON array of ID strings. No explanation, no markdown.
Example: ["id1", "id2", "id3"]
`
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Parse the returned IDs
    const ids: string[] = JSON.parse(text)
    const matched = allMovies.filter((m) => ids.includes(m.id))

    return NextResponse.json({ movies: matched })
  } catch (err) {
    console.error('[ai-search]', err)
    return NextResponse.json({ movies: [], error: 'AI search failed' }, { status: 500 })
  }
}
