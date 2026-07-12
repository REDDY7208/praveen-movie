'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import VideoCard from '@/components/VideoCard'
import ComingSoonCard from '@/components/ComingSoonCard'
import AiChat from '@/components/AiChat'
import { LANGUAGES, GENRES } from '@/lib/s3'
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

  return (
    <>
      <Navbar
        onSearch={handleSearch}
        activeLang={lang}
        onLang={(l) => { setLang(l); setSearch(''); setAiResults(null) }}
      />

      {/* Hero */}
      {!loading && !search && featured && (
        <div className={styles.hero}>
          <div
            className={styles.heroBg}
            style={{ backgroundImage: featured.thumbnail ? `url(${featured.thumbnail})` : undefined }}
          />
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
            <Link href={`/watch/${featured.id}`} className={styles.heroBtn}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <polygon points="6,3 20,12 6,21"/>
              </svg>
              Watch Now
            </Link>
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
