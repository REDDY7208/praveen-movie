import { S3Client, ListObjectsV2Command, GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3'
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
  trailerUrl: string   // presigned URL for trailer.* video OR 'youtube:{id}' for YouTube trailers
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
const isTrailerTxt = (key: string) => /(?:^|\/)trailer\.txt$/i.test(key)

// Read a small text file from S3 and return its content
async function readTextFile(key: string): Promise<string> {
  try {
    const res: GetObjectCommandOutput = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const chunks: Uint8Array[] = []
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks).toString('utf-8').trim()
  } catch {
    return ''
  }
}

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

  // Build a map: exact_folder -> [image keys in that folder]
  // Each video can only use an image from its OWN folder — never a parent/sibling folder
  const thumbMap = new Map<string, string[]>()
  for (const img of images) {
    const folder = parentFolder(img.key)
    if (!thumbMap.has(folder)) thumbMap.set(folder, [])
    thumbMap.get(folder)!.push(img.key)
  }

  // Build trailer.txt map: folder -> key of trailer.txt
  const trailerTxtMap = new Map<string, string>()
  for (const obj of all) {
    if (isTrailerTxt(obj.key)) {
      trailerTxtMap.set(parentFolder(obj.key), obj.key)
    }
  }

  // Deduplicate videos by key — same S3 key should never appear twice
  const seenKeys = new Set<string>()
  const uniqueVideos = videos.filter((v) => {
    if (seenKeys.has(v.key)) return false
    seenKeys.add(v.key)
    return true
  })

  // Filter by language/genre if requested
  const filtered = uniqueVideos.filter((v) => {
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
      const videoBaseName = (v.key.split('/').pop() ?? '').replace(/\.[^.]+$/, '').toLowerCase()

      // Strict thumbnail matching — only images in the EXACT same folder as the video
      const folderImages = thumbMap.get(folder) ?? []
      const thumbKey =
        folderImages.find((k) => /\/poster\.(jpg|jpeg|png|webp)$/i.test(k)) ??
        folderImages.find((k) => {
          const imgBase = (k.split('/').pop() ?? '').replace(/\.[^.]+$/, '').toLowerCase()
          return imgBase === videoBaseName
        }) ??
        (folderImages.length === 1 ? folderImages[0] : undefined)

      // Trailer priority:
      // 1. trailer.txt in same folder → read YouTube ID → return 'youtube:{id}'
      // 2. trailer.* video file in same folder → return presigned URL
      const trailerTxtKey = trailerTxtMap.get(folder)
      const folderVideos = uniqueVideos.filter(
        (u) => parentFolder(u.key) === folder && u.key !== v.key
      )
      const trailerVideoKey = folderVideos.find((u) => {
        const name = (u.key.split('/').pop() ?? '').toLowerCase()
        return name.startsWith('trailer.')
      })?.key

      const fileName = v.key.split('/').pop() ?? v.key
      const title = fileName.replace(/\.[^.]+$/, '').replace(/[-_.]/g, ' ').trim()

      // Resolve trailerUrl
      let trailerUrlResolved = ''
      if (trailerTxtKey) {
        const ytId = await readTextFile(trailerTxtKey)
        if (ytId) trailerUrlResolved = `youtube:${ytId}`
      } else if (trailerVideoKey) {
        trailerUrlResolved = await getPresignedUrl(trailerVideoKey)
      }

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
        trailerUrl: trailerUrlResolved,
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

    // Find thumbnail and trailer in same folder
    const listRes = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: folder ? folder + '/' : '' })
    )
    const contents = listRes.Contents ?? []
    const thumbKey = contents.find((o) => o.Key && isImage(o.Key))?.Key

    // Trailer: prefer trailer.txt (YouTube) over trailer.* video
    const trailerTxtObj = contents.find((o) => o.Key && isTrailerTxt(o.Key))
    const trailerVideoObj = contents.find((o) => {
      if (!o.Key || !isVideo(o.Key) || o.Key === key) return false
      return (o.Key.split('/').pop() ?? '').toLowerCase().startsWith('trailer.')
    })

    let trailerUrl = ''
    if (trailerTxtObj?.Key) {
      const ytId = await readTextFile(trailerTxtObj.Key)
      if (ytId) trailerUrl = `youtube:${ytId}`
    } else if (trailerVideoObj?.Key) {
      trailerUrl = await getPresignedUrl(trailerVideoObj.Key)
    }

    const [videoUrl, thumbnail] = await Promise.all([
      getPresignedUrl(key),
      thumbKey ? getPresignedUrl(thumbKey) : Promise.resolve(''),
    ])

    return { id, title, language, genre, key, thumbnail, trailerUrl, videoUrl, size: 0 }
  } catch {
    return null
  }
}
