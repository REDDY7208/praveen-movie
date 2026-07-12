import Link from 'next/link'
import type { Video } from '@/data/videos'
import styles from './VideoCard.module.css'

export default function VideoCard({ video }: { video: Video }) {
  // Split "Language · Genre" into parts for badge
  const parts = video.channel?.split(' · ') ?? []
  const lang = parts[0] ?? ''
  const genre = parts[1] ?? ''

  return (
    <Link href={`/watch/${video.id}`} className={styles.card}>
      <div className={styles.thumb}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} loading="lazy" />
        ) : (
          <div className={styles.noThumb}>🎬</div>
        )}

        {genre && <span className={styles.genreBadge}>{genre}</span>}

        <div className={styles.thumbOverlay}>
          <div className={styles.playCircle}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <polygon points="6,3 20,12 6,21"/>
            </svg>
          </div>
        </div>

        {video.duration && <span className={styles.duration}>{video.duration}</span>}
      </div>

      <div className={styles.info}>
        <p className={styles.title}>{video.title}</p>
        {lang && (
          <p className={styles.meta}>
            <span className={styles.metaDot} />
            {lang}
          </p>
        )}
      </div>
    </Link>
  )
}
