import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { listMovies } from '@/lib/s3'

const FALLBACK_REPLIES = [
  "I'm having a little trouble connecting right now. Try asking me again in a moment!",
  "Hmm, something went wrong on my end. Feel free to browse the catalog while I sort it out.",
  "I can't reach my brain right now 🤔 — but the movies are still here for you!",
  "Looks like I'm taking a quick nap 😴 — check back in a bit!",
  "My AI side is offline at the moment. You can still explore all the movies directly!",
  "Oops, I seem to be having a connection issue. Try refreshing or asking again shortly.",
  "I'm temporarily unavailable, but the movie catalog is fully loaded — go explore!",
  "Something tripped me up on my end. Give it another shot in a few seconds!",
  "I'm a bit under the weather right now 🤒 — but great movies await you!",
  "Can't connect to my movie brain at the moment. Try again soon — I'll be back!",
]

function fallbackReply() {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)]
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ reply: fallbackReply() })
  }

  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

  try {
    const { message, history } = await req.json()
    if (!message?.trim()) return NextResponse.json({ reply: '' })

    const allMovies = await listMovies()
    const catalog = allMovies.map((m) => ({
      id: m.id,
      title: m.title,
      language: m.language,
      genre: m.genre,
    }))

    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemContext = `
You are a friendly movie assistant for "TP Thilaveen" — a private streaming site.
Available movies catalog: ${JSON.stringify(catalog)}

Rules:
- Only recommend movies from the catalog above
- Be conversational, warm, and helpful
- When recommending a movie, always mention the title, language, and genre
- Keep replies short (2-4 sentences max)
- If asked something unrelated to movies, gently redirect to movies
- Format movie titles in bold using **Title**
`
    // Build chat history for context
    const historyText = (history ?? [])
      .map((h: { role: string; text: string }) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
      .join('\n')

    const prompt = `${systemContext}\n\nConversation so far:\n${historyText}\n\nUser: ${message}\nAssistant:`

    const result = await model.generateContent(prompt)
    const reply = result.response.text().trim()

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[ai-chat]', err)
    return NextResponse.json({ reply: fallbackReply() })
  }
}
