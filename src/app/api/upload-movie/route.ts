import { NextRequest, NextResponse } from 'next/server'
import { s3 } from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { LANGUAGES, GENRES } from '@/lib/s3'

const BUCKET = process.env.S3_BUCKET_NAME!

// GET: return a presigned URL so the client uploads directly to S3 (bypasses Vercel 4.5MB limit)
export async function GET(req: NextRequest) {
  console.log('[upload-movie] GET /api/upload-movie — presign request received')
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title')?.trim()
  const language = searchParams.get('language')
  const genre = searchParams.get('genre')
  const filename = searchParams.get('filename') ?? 'video.mp4'
  const contentType = searchParams.get('contentType') ?? 'video/mp4'

  console.log(`[upload-movie] params → title="${title}" language="${language}" genre="${genre}" filename="${filename}"`)

  if (!title || !language || !genre) {
    console.error('[upload-movie] ✕ Missing required fields')
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!LANGUAGES.includes(language)) {
    console.error(`[upload-movie] ✕ Invalid language: "${language}"`)
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }
  if (!GENRES.includes(genre)) {
    console.error(`[upload-movie] ✕ Invalid genre: "${genre}"`)
    return NextResponse.json({ error: 'Invalid genre' }, { status: 400 })
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp4'
  const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')
  const videoKey = `${language}/${genre}/${safeTitle}/${safeTitle}.${ext}`

  console.log(`[upload-movie] generating presigned PUT URL for key: "${videoKey}"`)

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: videoKey, ContentType: contentType }),
    { expiresIn: 3600 }
  )

  console.log(`[upload-movie] ✓ presigned URL generated — key: "${videoKey}"`)
  return NextResponse.json({ url, videoKey })
}

// POST: kept as fallback for small files (< 4MB)
export async function POST(req: NextRequest) {
  console.log('[upload-movie] POST /api/upload-movie — small file fallback')
  try {
    const form = await req.formData()
    const video = form.get('video') as File | null
    const title = (form.get('title') as string | null)?.trim()
    const language = form.get('language') as string | null
    const genre = form.get('genre') as string | null

    console.log(`[upload-movie] POST params → title="${title}" language="${language}" genre="${genre}" size=${video?.size ?? 0} bytes`)

    if (!video || !title || !language || !genre) {
      console.error('[upload-movie] ✕ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!LANGUAGES.includes(language)) {
      console.error(`[upload-movie] ✕ Invalid language: "${language}"`)
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }
    if (!GENRES.includes(genre)) {
      console.error(`[upload-movie] ✕ Invalid genre: "${genre}"`)
      return NextResponse.json({ error: 'Invalid genre' }, { status: 400 })
    }

    const ext = video.name.split('.').pop()?.toLowerCase() ?? 'mp4'
    const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')
    const videoKey = `${language}/${genre}/${safeTitle}/${safeTitle}.${ext}`

    console.log(`[upload-movie] reading buffer — ${(video.size / 1024 / 1024).toFixed(2)} MB`)
    const buffer = Buffer.from(await video.arrayBuffer())

    console.log(`[upload-movie] uploading to S3 — key: "${videoKey}"`)
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: videoKey,
      Body: buffer,
      ContentType: video.type || 'video/mp4',
    }))

    console.log(`[upload-movie] ✓ upload complete — key: "${videoKey}"`)
    return NextResponse.json({ success: true, videoKey })
  } catch (err) {
    console.error('[upload-movie] ✕ Upload failed:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
