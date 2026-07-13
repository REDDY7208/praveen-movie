'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import VideoCard from '@/components/VideoCard'
import ComingSoonCard from '@/components/ComingSoonCard'
import AiChat from '@/components/AiChat'
import SplashScreen from '@/components/SplashScreen'
import { GENRES } from '@/lib/s3'
import type { MovieItem } from '@/lib/s3'
import styles from './page.module.css'

export default function Home() {
  const [allMovies, setAllMovies] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lang, setLang] = useState('')
  const [search, setSearch] = useState('')
  const [aiResults, setAiResults] = useState<MovieItem[] | null>(null)
  const [aiSearching, setAiSearching] = useState(false)
  const [trailerMuted, setTrailerMuted] = useState(true)
  const [trailerPlaying, setTrailerPlaying] = useState(false)
  const trailerRef = useRef<HTMLVideoElement>(null)

  useEffect(() => { fetch('/api/session').catch(() => {}) }, [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/movies')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setAllMovies(d.movies ?? [])
      })
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = async (q: string) => {
    setSearch(q)
    if (!q.trim()) { setAiResults(null); return }
    setAiSearching(true)
    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      setAiResults(data.movies ?? [])
    } catch {
      setAiResults(null)
    } finally {
      setAiSearching(false)
    }
  }

  const baseFiltered = allMovies.filter((m) => {
    if (lang && m.language !== lang) return false
    if (search) {
      const q = search.toLowerCase()
      return m.title.toLowerCase().includes(q) || m.genre.includes(q)
    }
    return true
  })

  const genreRows = GENRES.filter((g) => baseFiltered.some((m) => m.genre === g))
  const byGenre = (genre: string) => baseFiltered.filter((m) => m.genre === genre)

  const toCard = (m: MovieItem) => ({
    id: m.id,
    title: m.title,
    channel: [
      m.language !== 'unknown' ? m.language.charAt(0).toUpperCase() + m.language.slice(1) : '',
      m.genre !== 'unknown' ? m.genre : '',
    ].filter(Boolean).join(' · '),
    views: '', duration: '',
    thumbnail: m.thumbnail,
    videoUrl: m.videoUrl,
    description: m.title,
  })

  // Featured = first movie with a thumbnail
  const featured = allMovies.find((m) => m.thumbnail) ?? allMovies[0]

  const featuredYtId = featured?.trailerUrl?.startsWith('youtube:')
    ? featured.trailerUrl.slice(8)
    : null
  const featuredVideoTrailer = featured?.trailerUrl && !featured.trailerUrl.startsWith('youtube:')
    ? featured.trailerUrl
    : null

  // Start video trailer autoplay when featured loads (only for direct video, not YouTube)
  useEffect(() => {
    const v = trailerRef.current
    if (!v || !featuredVideoTrailer) return
    v.muted = true
    v.play().then(() => setTrailerPlaying(true)).catch(() => {})
  }, [featuredVideoTrailer])

  // YouTube iframe counts as "playing" immediately
  useEffect(() => {
    if (featuredYtId) setTrailerPlaying(true)
  }, [featuredYtId])

  const toggleMute = () => {
    const v = trailerRef.current
    if (!v) return
    v.muted = !v.muted
    setTrailerMuted(v.muted)
  }

  return (
    <>
      <SplashScreen />
      <Navbar
        onSearch={handleSearch}
        activeLang={lang}
        onLang={(l) => { setLang(l); setSearch(''); setAiResults(null) }}
      />

      {/* Hero */}
      {!loading && !search && featured && (
        <div className={styles.hero}>
          {/* Background — YouTube iframe / video trailer / poster image */}
          {featuredYtId ? (
            <iframe
              className={styles.heroBgVideo}
              src={`https://www.youtube.com/embed/${featuredYtId}?autoplay=1&mute=1&loop=1&playlist=${featuredYtId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Trailer"
            />
          ) : featuredVideoTrailer ? (
            <video
              ref={trailerRef}
              className={styles.heroBgVideo}
              src={featuredVideoTrailer}
              muted
              loop
              playsInline
              autoPlay
              onPlay={() => setTrailerPlaying(true)}
            />
          ) : (
            <div
              className={styles.heroBg}
              style={{ backgroundImage: featured.thumbnail ? `url(${featured.thumbnail})` : undefined }}
            />
          )}
          <div className={styles.heroGrad} />
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>✦ Featured Film</p>
            <h1 className={styles.heroTitle}>{featured.title}</h1>
            <div className={styles.heroMeta}>
              {featured.language !== 'unknown' && (
                <span style={{ textTransform: 'capitalize' }}>{featured.language}</span>
              )}
              {featured.language !== 'unknown' && featured.genre !== 'unknown' && (
                <span className={styles.heroDot} />
              )}
              {featured.genre !== 'unknown' && (
                <span style={{ textTransform: 'capitalize' }}>{featured.genre}</span>
              )}
            </div>
            <div className={styles.heroBtns}>
              <Link href={`/watch/${featured.id}`} className={styles.heroBtn}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <polygon points="6,3 20,12 6,21"/>
                </svg>
                Watch Now
              </Link>
              {/* Mute button only for direct video trailers — YouTube iframe handles its own audio */}
              {featuredVideoTrailer && trailerPlaying && (
                <button className={styles.muteBtn} onClick={toggleMute} title={trailerMuted ? 'Unmute trailer' : 'Mute trailer'}>
                  {trailerMuted ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0017.73 19L19 20.27 20.27 19 5.27 4 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className={styles.main}>
        {loading && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.muted}>Loading movies...</p>
          </div>
        )}

        {error && <p className={styles.error}>⚠ {error}</p>}

        {aiSearching && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.muted}>AI is finding the best matches...</p>
          </div>
        )}

        {!loading && !error && !aiSearching && (
          <>
            {/* AI Search Results */}
            {search && aiResults !== null && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionAccent} />
                  <h2 className={styles.sectionTitle}>
                    Results for &quot;{search}&quot;
                    <span className={styles.aiBadge}>AI</span>
                  </h2>
                </div>
                {aiResults.length > 0 ? (
                  <div className={styles.grid}>
                    {aiResults.map((m) => <VideoCard key={m.id} video={toCard(m)} />)}
                  </div>
                ) : (
                  <p className={styles.muted}>No matches found. Try different keywords.</p>
                )}
              </section>
            )}

            {!search && (
              <>
                {/* Latest uploads */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionAccent} />
                    <h2 className={styles.sectionTitle}>
                      Latest Uploads
                      {lang && <span className={styles.langBadge}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</span>}
                    </h2>
                  </div>
                  {baseFiltered.length > 0 ? (
                    <div className={styles.row}>
                      {baseFiltered.slice(0, 12).map((m) => (
                        <div key={m.id} className={styles.rowItem}>
                          <VideoCard video={toCard(m)} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.muted}>No movies uploaded yet.</p>
                  )}
                </section>

                {/* Genre rows */}
                {genreRows.map((g) => (
                  <section key={g} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionAccent} />
                      <h2 className={styles.sectionTitle}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </h2>
                    </div>
                    <div className={styles.row}>
                      {byGenre(g).map((m) => (
                        <div key={m.id} className={styles.rowItem}>
                          <VideoCard video={toCard(m)} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                {baseFiltered.length === 0 && (
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionAccent} />
                      <h2 className={styles.sectionTitle}>Coming Soon</h2>
                    </div>
                    <div className={styles.grid}>
                      {GENRES.map((g) => <ComingSoonCard key={g} genre={g} />)}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>

      <AiChat />
    </>
  )
}
