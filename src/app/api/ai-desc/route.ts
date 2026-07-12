import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ description: '' })
  }
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  try {
    const { title, language, genre } = await req.json()
    if (!title) return NextResponse.json({ description: '' })

    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
Write a short 2-sentence movie description for a streaming site.
Movie: "${title}", Language: ${language}, Genre: ${genre}
Be factual if you know this movie. If not, write a generic description based on genre.
Keep it under 60 words. No spoilers. No markdown.
`
    const result = await model.generateContent(prompt)
    const description = result.response.text().trim()

    return NextResponse.json({ description })
  } catch (err) {
    console.error('[ai-desc]', err)
    return NextResponse.json({ description: '' })
  }
}
