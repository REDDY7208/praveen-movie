import Link from 'next/link'
import { getMovieById, listMovies } from '@/lib/s3'
import VideoPlayer from '@/components/VideoPlayer'
import Navbar from '@/components/Navbar'
import AiChat from '@/components/AiChat'
import { notFound } from 'next/navigation'
import styles from './watch.module.css'

export const dynamic = 'force-dynamic'

export default async function WatchPage({ params }: { params: { id: string } }) {
  const movie = await getMovieById(params.id)
  if (!movie) notFound()

  // Fetch all movies of the same language (no genre filter — show everything)
  const related = await listMovies(movie.language)
  const others = related.filter((m) => m.id !== movie.id).slice(0, 5)

  return (
    <div className={styles.page}>
      {movie.thumbnail && (
        <div
          className={styles.backdrop}
          style={{ backgroundImage: `url(${movie.thumbnail})` }}
        />
      )}

      <Navbar />

      <main className={styles.main}>
        {/* Left — player + info */}
        <div className={styles.left}>
          <div className={styles.playerShell}>
            <VideoPlayer src={movie.videoUrl} poster={movie.thumbnail} title={movie.title} />
          </div>

          <div className={styles.info}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{movie.title}</h1>
            </div>
            <div className={styles.metaRow}>
              {movie.language !== 'unknown' && (
                <span className={styles.langTag}>{movie.language}</span>
              )}
              {movie.genre !== 'unknown' && (
                <span className={styles.genreTag}>{movie.genre}</span>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — Next Up */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>
              Next Up
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style={{marginLeft:'4px', color:'#ff6b35'}}>
                <polygon points="6,3 20,12 6,21"/>
              </svg>
            </h3>
          </div>

          <div className={styles.sidebarList}>
            {others.length === 0 && (
              <p className={styles.noRelated}>No other movies yet.</p>
            )}
            {others.map((m) => (
              <Link
                key={m.id}
                href={`/watch/${m.id}`}
                className={styles.sideCard}
                style={m.thumbnail ? { backgroundImage: `url(${m.thumbnail})` } : undefined}
              >
                {/* Dark overlay */}
                <div className={styles.sideCardOverlay} />

                {/* Info */}
                <div className={styles.sideInfo}>
                  <p className={styles.sideTitle}>{m.title}</p>
                  <p className={styles.sideSub}>
                    {[m.genre !== 'unknown' ? m.genre : '', m.language !== 'unknown' ? m.language : '']
                      .filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' • ')}
                  </p>
                </div>

                {/* Play button */}
                <button className={styles.sidePlay} tabIndex={-1} aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                    <polygon points="6,3 20,12 6,21"/>
                  </svg>
                </button>
              </Link>
            ))}
          </div>
        </aside>
      </main>

      <AiChat />
    </div>
  )
}
