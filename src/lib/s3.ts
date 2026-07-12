import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.S3_BUCKET_NAME!

export interface MovieItem {
  id: string
  title: string
  language: string
  genre: string
  key: string
  thumbnail: string
  videoUrl: string
  size: number
}

export const LANGUAGES = ['telugu', 'tamil', 'malayalam', 'kannada', 'hindi', 'english']
export const GENRES = [
  'action', 'drama', 'comedy', 'romance', 'thriller', 'horror',
  'family', 'crime', 'fantasy', 'adventure', 'sci-fi', 'historical',
  'mythology', 'biography', 'animation', 'sports', 'musical', 'documentary',
]

const VIDEO_EXTS = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v']
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp']

const isVideo = (key: string) => VIDEO_EXTS.some((e) => key.toLowerCase().endsWith(e))
const isImage = (key: string) => IMAGE_EXTS.some((e) => key.toLowerCase().endsWith(e))

async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn })
}

// Scan ALL objects in the bucket (no prefix filter) so we never miss anything
async function scanAllObjects(): Promise<{ key: string; size: number }[]> {
  const all: { key: string; size: number }[] = []
  let token: string | undefined

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: token,
      })
    )
    for (const obj of res.Contents ?? []) {
      if (obj.Key) all.push({ key: obj.Key, size: obj.Size ?? 0 })
    }
    token = res.NextContinuationToken
  } while (token)

  return all
}

// Try to extract language and genre from anywhere in the path
function parseMeta(key: string): { language: string; genre: string } {
  const lower = key.toLowerCase()
  const parts = lower.split('/')

  const language = LANGUAGES.find((l) => parts.includes(l)) ?? 'unknown'
  const genre = GENRES.find((g) => parts.includes(g)) ?? 'unknown'

  return { language, genre }
}

// Group images and videos by their parent folder
function parentFolder(key: string): string {
  const parts = key.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

export async function listMovies(language?: string, genre?: string): Promise<MovieItem[]> {
  const all = await scanAllObjects()

  // Separate videos and images
  const videos = all.filter((o) => isVideo(o.key))
  const images = all.filter((o) => isImage(o.key))

  // Build a map: folder -> thumbnail key
  const thumbMap = new Map<string, string>()
  for (const img of images) {
    const folder = parentFolder(img.key)
    if (!thumbMap.has(folder)) thumbMap.set(folder, img.key)
  }

  // Filter by language/genre if requested
  const filtered = videos.filter((v) => {
    const { language: lang, genre: gen } = parseMeta(v.key)
    if (language && lang !== language) return false
    if (genre && gen !== genre) return false
    return true
  })

  // Generate presigned URLs in parallel
  const movies: MovieItem[] = await Promise.all(
    filtered.map(async (v) => {
      const { language: lang, genre: gen } = parseMeta(v.key)
      const folder = parentFolder(v.key)
      const thumbKey = thumbMap.get(folder)
      const fileName = v.key.split('/').pop() ?? v.key
      const title = fileName.replace(/\.[^.]+$/, '').replace(/[-_.]/g, ' ').trim()

      const [videoUrl, thumbnail] = await Promise.all([
        getPresignedUrl(v.key),
        thumbKey ? getPresignedUrl(thumbKey) : Promise.resolve(''),
      ])

      return {
        id: Buffer.from(v.key).toString('base64url'),
        title,
        language: lang,
        genre: gen,
        key: v.key,
        thumbnail,
        videoUrl,
        size: v.size,
      }
    })
  )

  return movies
}

export async function getMovieById(id: string): Promise<MovieItem | null> {
  try {
    const key = Buffer.from(id, 'base64url').toString('utf-8')
    const { language, genre } = parseMeta(key)
    const folder = parentFolder(key)
    const fileName = key.split('/').pop() ?? key
    const title = fileName.replace(/\.[^.]+$/, '').replace(/[-_.]/g, ' ').trim()

    // Find thumbnail in same folder
    const listRes = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: folder ? folder + '/' : '' })
    )
    const thumbKey = listRes.Contents?.find((o) => o.Key && isImage(o.Key))?.Key

    const [videoUrl, thumbnail] = await Promise.all([
      getPresignedUrl(key),
      thumbKey ? getPresignedUrl(thumbKey) : Promise.resolve(''),
    ])

    return { id, title, language, genre, key, thumbnail, videoUrl, size: 0 }
  } catch {
    return null
  }
}
