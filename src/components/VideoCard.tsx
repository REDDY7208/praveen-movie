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
          <div className={styles.noThumb}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.5"/>
              <polygon points="10,8 16,12 10,16" fill="rgba(255,255,255,0.6)" stroke="none"/>
            </svg>
            <span className={styles.noThumbLabel}>No Poster</span>
          </div>
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
