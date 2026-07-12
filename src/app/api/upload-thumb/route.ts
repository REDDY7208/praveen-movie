import { NextRequest, NextResponse } from 'next/server'
import { s3 } from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = process.env.S3_BUCKET_NAME!
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('image') as File | null
    const videoKey = form.get('videoKey') as string | null

    if (!file || !videoKey) {
      return NextResponse.json({ error: 'Missing image or videoKey' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, WEBP allowed' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
    }

    // Place image in same folder as the video
    const folder = videoKey.includes('/')
      ? videoKey.substring(0, videoKey.lastIndexOf('/'))
      : ''
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const thumbKey = folder ? `${folder}/poster.${ext}` : `poster.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: thumbKey,
      Body: buffer,
      ContentType: file.type,
    }))

    return NextResponse.json({ success: true, thumbKey })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
