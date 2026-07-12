import Link from 'next/link'
import { getMovieById, listMovies } from '@/lib/s3'
import VideoPlayer from '@/components/VideoPlayer'
import Navbar from '@/components/Navbar'
import AiChat from '@/components/AiChat'
import { notFound } from 'next/navigation'
import styles from './watch.module.css'

export default async function WatchPage({ params }: { params: { id: string } }) {
  const movie = await getMovieById(params.id)
  if (!movie) notFound()

  const related = await listMovies(movie.language, movie.genre)
  const others = related.filter((m) => m.id !== movie.id).slice(0, 10)

  return (
    <div className={styles.page}>
      {/* Cinematic blurred backdrop from poster */}
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

        {/* Sidebar — related */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarAccent} />
            <h3 className={styles.sidebarTitle}>More like this</h3>
          </div>

          <div className={styles.sidebarList}>
            {others.length === 0 && (
              <p className={styles.noRelated}>No related movies yet.</p>
            )}
            {others.map((m) => (
              <Link key={m.id} href={`/watch/${m.id}`} className={styles.sideCard}>
                <div className={styles.sideThumb}>
                  {m.thumbnail
                    ? <img src={m.thumbnail} alt={m.title} loading="lazy" />
                    : <div className={styles.sideNoThumb}>🎬</div>
                  }
                </div>
                <div className={styles.sideInfo}>
                  <p className={styles.sideTitle}>{m.title}</p>
                  <p className={styles.sideMeta}>
                    {[m.language !== 'unknown' ? m.language : '', m.genre !== 'unknown' ? m.genre : '']
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </main>

      <AiChat />
    </div>
  )
}
