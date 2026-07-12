'use client'
import { useState, useRef } from 'react'
import { LANGUAGES, GENRES } from '@/lib/s3'
import styles from './admin.module.css'

type Tab = 'upload' | 'thumb'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('upload')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/" className={styles.logo}>TP</a>
        <h1 className={styles.title}>Admin Panel</h1>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'upload' ? styles.tabActive : ''}`} onClick={() => setTab('upload')}>
          Upload Movie
        </button>
        <button className={`${styles.tab} ${tab === 'thumb' ? styles.tabActive : ''}`} onClick={() => setTab('thumb')}>
          Upload Thumbnail
        </button>
      </div>

      {tab === 'upload' ? <UploadMovie /> : <UploadThumb />}
    </div>
  )
}

/* ─── Upload Movie ─────────────────────────────────────────────── */
function UploadMovie() {
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('')
  const [genre, setGenre] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [description, setDescription] = useState('')
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [copied, setCopied] = useState(false)
  const videoRef = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const handleThumb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setThumbFile(f)
    setThumbPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async () => {
    if (!title.trim() || !language || !genre || !videoFile) return
    setUploading(true)
    setStatus(null)
    setDescription('')

    try {
      // 1. Upload video
      setProgress('Uploading movie...')
      const vForm = new FormData()
      vForm.append('video', videoFile)
      vForm.append('title', title.trim())
      vForm.append('language', language)
      vForm.append('genre', genre)

      const vRes = await fetch('/api/upload-movie', { method: 'POST', body: vForm })
      const vData = await vRes.json()
      if (!vRes.ok) throw new Error(vData.error)

      // 2. Upload thumbnail if provided
      if (thumbFile) {
        setProgress('Uploading thumbnail...')
        const tForm = new FormData()
        tForm.append('image', thumbFile)
        tForm.append('videoKey', vData.videoKey)
        const tRes = await fetch('/api/upload-thumb', { method: 'POST', body: tForm })
        if (!tRes.ok) {
          const tData = await tRes.json()
          throw new Error(tData.error)
        }
      }

      setStatus({ type: 'success', msg: `"${title}" uploaded successfully!` })
      setProgress('')

      // Reset form
      setTitle('')
      setLanguage('')
      setGenre('')
      setVideoFile(null)
      setThumbFile(null)
      setThumbPreview('')
      if (videoRef.current) videoRef.current.value = ''
      if (thumbRef.current) thumbRef.current.value = ''

      // 3. Auto-generate AI description
      setGeneratingDesc(true)
      try {
        const dRes = await fetch('/api/ai-desc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), language, genre }),
        })
        const dData = await dRes.json()
        setDescription(dData.description ?? '')
      } finally {
        setGeneratingDesc(false)
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message ?? 'Upload failed' })
      setProgress('')
    } finally {
      setUploading(false)
    }
  }

  const canSubmit = title.trim() && language && genre && videoFile && !uploading

  return (
    <div className={styles.card}>
      {/* Step 1 — Title */}
      <div className={styles.step}>
        <span className={styles.stepNum}>1</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Movie title</label>
          <input
            className={styles.input}
            type="text"
            placeholder="e.g. RRR"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      {/* Step 2 — Language */}
      <div className={styles.step}>
        <span className={styles.stepNum}>2</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Language</label>
          <select className={styles.select} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">-- select language --</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 3 — Genre */}
      <div className={styles.step}>
        <span className={styles.stepNum}>3</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Genre</label>
          <select className={styles.select} value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">-- select genre --</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 4 — Thumbnail */}
      <div className={styles.step}>
        <span className={styles.stepNum}>4</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Thumbnail image <span className={styles.optional}>(optional)</span></label>
          <p className={styles.muted}>JPG, PNG or WEBP · max 5MB</p>
          <input
            ref={thumbRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.fileInput}
            onChange={handleThumb}
          />
          {thumbPreview && (
            <div className={styles.previewWrap}>
              <img src={thumbPreview} alt="preview" className={styles.preview} />
            </div>
          )}
        </div>
      </div>

      {/* Step 5 — Video */}
      <div className={styles.step}>
        <span className={styles.stepNum}>5</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Movie file</label>
          <p className={styles.muted}>MP4, MKV, MOV, WEBM, AVI</p>
          <input
            ref={videoRef}
            type="file"
            accept="video/mp4,video/x-matroska,video/quicktime,video/webm,video/x-msvideo,.mkv"
            className={styles.fileInput}
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          />
          {videoFile && <p className={styles.muted}>{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
        </div>
      </div>

      {/* Upload button */}
      <div className={styles.step}>
        <span className={styles.stepNum}>6</span>
        <div className={styles.stepBody}>
          <button className={styles.uploadBtn} onClick={handleSubmit} disabled={!canSubmit}>
            {uploading ? (progress || 'Uploading...') : 'Upload Movie'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`${styles.status} ${status.type === 'success' ? styles.success : styles.error}`}>
          {status.type === 'success' ? '✓' : '✕'} {status.msg}
        </div>
      )}

      {/* AI Description */}
      {(generatingDesc || description) && (
        <div className={styles.descSection}>
          <div className={styles.descHeader}>
            <span className={styles.label}>AI Generated Description</span>
          </div>
          {generatingDesc && <p className={styles.descLoading}>✦ Generating description...</p>}
          {description && !generatingDesc && (
            <div className={styles.descBox}>
              <p className={styles.descText}>{description}</p>
              <button className={styles.copyBtn} onClick={() => {
                navigator.clipboard.writeText(description)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Upload Thumbnail (existing movies) ───────────────────────── */
function UploadThumb() {
  const [movies, setMovies] = useState<any[]>([])
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [preview, setPreview] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState('')
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadMovies = () => {
    if (loaded) return
    setLoadingMovies(true)
    fetch('/api/movies')
      .then((r) => r.json())
      .then((d) => { setMovies(d.movies ?? []); setLoaded(true) })
      .finally(() => setLoadingMovies(false))
  }

  const handleUpload = async () => {
    if (!file || !selected) return
    setUploading(true)
    setStatus(null)
    const form = new FormData()
    form.append('image', file)
    form.append('videoKey', selected.key)
    try {
      const res = await fetch('/api/upload-thumb', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus({ type: 'success', msg: `Uploaded! Saved as: ${data.thumbKey}` })
      setFile(null)
      setPreview('')
      if (inputRef.current) inputRef.current.value = ''

      setGeneratingDesc(true)
      const dRes = await fetch('/api/ai-desc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: selected.title, language: selected.language, genre: selected.genre }),
      })
      const dData = await dRes.json()
      setDescription(dData.description ?? '')
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message ?? 'Upload failed' })
    } finally {
      setUploading(false)
      setGeneratingDesc(false)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.step}>
        <span className={styles.stepNum}>1</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Select existing movie</label>
          <select
            className={styles.select}
            value={selected?.id ?? ''}
            onFocus={loadMovies}
            onChange={(e) => {
              const m = movies.find((x) => x.id === e.target.value) ?? null
              setSelected(m)
              setStatus(null)
              setDescription('')
            }}
          >
            <option value="">-- choose a movie --</option>
            {loadingMovies && <option disabled>Loading...</option>}
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} {m.language !== 'unknown' ? `(${m.language})` : ''}
              </option>
            ))}
          </select>
          {selected && <p className={styles.muted}>S3 path: <code>{selected.key}</code></p>}
        </div>
      </div>

      <div className={styles.step}>
        <span className={styles.stepNum}>2</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Choose thumbnail image</label>
          <p className={styles.muted}>JPG, PNG or WEBP · max 5MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.fileInput}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setFile(f)
              setPreview(URL.createObjectURL(f))
              setStatus(null)
              setDescription('')
            }}
          />
          {preview && (
            <div className={styles.previewWrap}>
              <img src={preview} alt="preview" className={styles.preview} />
            </div>
          )}
        </div>
      </div>

      <div className={styles.step}>
        <span className={styles.stepNum}>3</span>
        <div className={styles.stepBody}>
          <button className={styles.uploadBtn} onClick={handleUpload} disabled={!file || !selected || uploading}>
            {uploading ? 'Uploading...' : 'Upload Thumbnail'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`${styles.status} ${status.type === 'success' ? styles.success : styles.error}`}>
          {status.type === 'success' ? '✓' : '✕'} {status.msg}
        </div>
      )}

      {selected && (
        <div className={styles.descSection}>
          <div className={styles.descHeader}>
            <span className={styles.label}>AI Movie Description</span>
            <button
              className={styles.genBtn}
              disabled={generatingDesc}
              onClick={async () => {
                setGeneratingDesc(true)
                setDescription('')
                try {
                  const res = await fetch('/api/ai-desc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: selected.title, language: selected.language, genre: selected.genre }),
                  })
                  const d = await res.json()
                  setDescription(d.description ?? '')
                } finally {
                  setGeneratingDesc(false)
                }
              }}
            >
              {generatingDesc ? '✦ Generating...' : '✦ Generate'}
            </button>
          </div>
          {generatingDesc && <p className={styles.descLoading}>✦ Generating description...</p>}
          {description && !generatingDesc && (
            <div className={styles.descBox}>
              <p className={styles.descText}>{description}</p>
              <button className={styles.copyBtn} onClick={() => {
                navigator.clipboard.writeText(description)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
