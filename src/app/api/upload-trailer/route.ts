import { NextRequest, NextResponse } from 'next/server'
import { s3 } from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = process.env.S3_BUCKET_NAME!

export async function POST(req: NextRequest) {
  try {
    const { videoKey, youtubeId } = await req.json()

    if (!videoKey || !youtubeId) {
      return NextResponse.json({ error: 'Missing videoKey or youtubeId' }, { status: 400 })
    }

    // Validate YouTube ID format (11 alphanumeric chars + _ -)
    if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
      return NextResponse.json({ error: 'Invalid YouTube video ID' }, { status: 400 })
    }

    // Save trailer.txt in the same folder as the video
    const folder = videoKey.includes('/')
      ? videoKey.substring(0, videoKey.lastIndexOf('/'))
      : ''
    const trailerKey = folder ? `${folder}/trailer.txt` : 'trailer.txt'

    console.log(`[upload-trailer] saving YouTube ID "${youtubeId}" → ${trailerKey}`)

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: trailerKey,
      Body: youtubeId,
      ContentType: 'text/plain',
    }))

    console.log(`[upload-trailer] ✓ saved`)
    return NextResponse.json({ success: true, trailerKey, youtubeId })
  } catch (err) {
    console.error('[upload-trailer] error:', err)
    return NextResponse.json({ error: 'Failed to save trailer' }, { status: 500 })
  }
}
