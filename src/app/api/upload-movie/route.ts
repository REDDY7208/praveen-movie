import { NextRequest, NextResponse } from 'next/server'
import { s3 } from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { LANGUAGES, GENRES } from '@/lib/s3'

const BUCKET = process.env.S3_BUCKET_NAME!
const VIDEO_TYPES = ['video/mp4', 'video/x-matroska', 'video/quicktime', 'video/webm', 'video/x-msvideo']

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const video = form.get('video') as File | null
    const title = (form.get('title') as string | null)?.trim()
    const language = form.get('language') as string | null
    const genre = form.get('genre') as string | null

    if (!video || !title || !language || !genre) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!LANGUAGES.includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }
    if (!GENRES.includes(genre)) {
      return NextResponse.json({ error: 'Invalid genre' }, { status: 400 })
    }

    const ext = video.name.split('.').pop()?.toLowerCase() ?? 'mp4'
    const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')
    const videoKey = `${language}/${genre}/${safeTitle}/${safeTitle}.${ext}`

    const buffer = Buffer.from(await video.arrayBuffer())

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: videoKey,
      Body: buffer,
      ContentType: video.type || 'video/mp4',
    }))

    return NextResponse.json({ success: true, videoKey })
  } catch (err) {
    console.error('Movie upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
