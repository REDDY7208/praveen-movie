'use client'
import { useState, useRef } from 'react'
import { LANGUAGES, GENRES } from '@/lib/s3'
import styles from './admin.module.css'

type Tab = 'upload' | 'multi' | 'thumb' | 'trailer'

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
        <button className={`${styles.tab} ${tab === 'multi' ? styles.tabActive : ''}`} onClick={() => setTab('multi')}>
          Multi-Language
        </button>
        <button className={`${styles.tab} ${tab === 'thumb' ? styles.tabActive : ''}`} onClick={() => setTab('thumb')}>
          Thumbnail
        </button>
        <button className={`${styles.tab} ${tab === 'trailer' ? styles.tabActive : ''}`} onClick={() => setTab('trailer')}>
          🎬 Trailer
        </button>
      </div>

      {tab === 'upload'  && <UploadMovie />}
      {tab === 'multi'   && <MultiLangUpload />}
      {tab === 'thumb'   && <UploadThumb />}
      {tab === 'trailer' && <UploadTrailer />}
    </div>
  )
}

/* ─── Upload Trailer (YouTube URL) ────────────────────────────── */
function UploadTrailer() {
  const [movies,      setMovies]      = useState<any[]>([])
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [loaded,      setLoaded]      = useState(false)
  const [selected,    setSelected]    = useState<any | null>(null)
  const [youtubeUrl,  setYoutubeUrl]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [status,      setStatus]      = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [previewId,   setPreviewId]   = useState('')

  const loadMovies = () => {
    if (loaded) return
    setLoadingMovies(true)
    fetch('/api/movies')
      .then(r => r.json())
      .then(d => { setMovies(d.movies ?? []); setLoaded(true) })
      .finally(() => setLoadingMovies(false))
  }

  // Extract YouTube video ID from any YouTube URL format
  const extractYouTubeId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const p of patterns) {
      const m = url.match(p)
      if (m) return m[1]
    }
    return ''
  }

  const handleUrlChange = (val: string) => {
    setYoutubeUrl(val)
    setPreviewId(extractYouTubeId(val))
    setStatus(null)
  }

  const handleSave = async () => {
    const ytId = extractYouTubeId(youtubeUrl)
    if (!ytId || !selected) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/upload-trailer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoKey: selected.key, youtubeId: ytId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus({ type: 'success', msg: `Trailer saved! YouTube ID: ${ytId}` })
      console.log(`[trailer] saved ${ytId} for ${selected.key}`)
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message ?? 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const ytId = extractYouTubeId(youtubeUrl)
  const canSave = !!ytId && !!selected && !saving

  return (
    <div className={styles.card}>
      <p className={styles.muted} style={{ marginBottom: '0.5rem' }}>
        Paste any YouTube trailer URL — it will be saved and shown in the hero section when this movie is featured.
      </p>

      {/* Step 1 — Select movie */}
      <div className={styles.step}>
        <span className={styles.stepNum}>1</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Select movie</label>
          <select
            className={styles.select}
            value={selected?.id ?? ''}
            onFocus={loadMovies}
            onChange={e => {
              const m = movies.find(x => x.id === e.target.value) ?? null
              setSelected(m); setStatus(null)
            }}
          >
            <option value="">-- choose a movie --</option>
            {loadingMovies && <option disabled>Loading...</option>}
            {movies.map(m => (
              <option key={m.id} value={m.id}>
                {m.title} {m.language !== 'unknown' ? `(${m.language})` : ''}
              </option>
            ))}
          </select>
          {selected && <p className={styles.muted}>S3 folder: <code>{selected.key.split('/').slice(0,-1).join('/')}/</code></p>}
        </div>
      </div>

      {/* Step 2 — YouTube URL */}
      <div className={styles.step}>
        <span className={styles.stepNum}>2</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>YouTube trailer URL</label>
          <input
            className={styles.input}
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={e => handleUrlChange(e.target.value)}
          />
          {youtubeUrl && !ytId && (
            <p style={{ color: '#f87171', fontSize: '0.82rem' }}>⚠ Could not detect a YouTube video ID from this URL</p>
          )}
          {ytId && <p className={styles.muted}>✓ Detected YouTube ID: <code>{ytId}</code></p>}
        </div>
      </div>

      {/* Preview */}
      {previewId && (
        <div className={styles.step}>
          <span className={styles.stepNum}>3</span>
          <div className={styles.stepBody}>
            <label className={styles.label}>Preview</label>
            <div className={styles.ytPreview}>
              <iframe
                src={`https://www.youtube.com/embed/${previewId}?autoplay=0&controls=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Trailer preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className={styles.step}>
        <span className={styles.stepNum}>{previewId ? '4' : '3'}</span>
        <div className={styles.stepBody}>
          <button className={styles.uploadBtn} onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving...' : 'Save Trailer'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`${styles.status} ${status.type === 'success' ? styles.success : styles.error}`}>
          {status.type === 'success' ? '✓' : '✕'} {status.msg}
        </div>
      )}
    </div>
  )
}

/* ─── Multi-Language Upload ────────────────────────────────────── */
type LangStatus = 'idle' | 'presigning' | 'uploading' | 'thumb' | 'done' | 'error'

interface LangRow {
  lang: string
  status: LangStatus
  progress: number   // 0–100
  error: string
  videoKey: string
}

function MultiLangUpload() {
  const [title,        setTitle]        = useState('')
  const [genre,        setGenre]        = useState('')
  const [selectedLangs, setSelectedLangs] = useState<string[]>([])
  const [videoFile,    setVideoFile]    = useState<File | null>(null)
  const [thumbFile,    setThumbFile]    = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState('')
  const [rows,         setRows]         = useState<LangRow[]>([])
  const [running,      setRunning]      = useState(false)
  const [allDone,      setAllDone]      = useState(false)
  const videoRef = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const toggleLang = (l: string) =>
    setSelectedLangs(prev =>
      prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]
    )

  const selectAll   = () => setSelectedLangs([...LANGUAGES])
  const deselectAll = () => setSelectedLangs([])

  const canSubmit = title.trim() && genre && videoFile && selectedLangs.length > 0 && !running

  // Upload one language — returns videoKey or throws
  const uploadOneLang = (lang: string, updateRow: (patch: Partial<LangRow>) => void): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Step 1: get presigned URL
        updateRow({ status: 'presigning', progress: 0 })
        console.log(`[multi] [${lang}] requesting presigned URL...`)
        const params = new URLSearchParams({
          title: title.trim(),
          language: lang,
          genre,
          filename: videoFile!.name,
          contentType: videoFile!.type || 'video/mp4',
        })
        const res = await fetch(`/api/upload-movie?${params}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        console.log(`[multi] [${lang}] presigned URL → ${data.videoKey}`)

        // Step 2: XHR upload with progress
        updateRow({ status: 'uploading', progress: 0 })
        await new Promise<void>((res2, rej2) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', data.url)
          xhr.setRequestHeader('Content-Type', videoFile!.type || 'video/mp4')
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100)
              updateRow({ progress: pct })
              console.log(`[multi] [${lang}] ${pct}%`)
            }
          }
          xhr.onload = () => {
            if (xhr.status < 300) res2()
            else rej2(new Error(`S3 ${xhr.status}`))
          }
          xhr.onerror = () => rej2(new Error('Network error'))
          xhr.send(videoFile!)
        })

        // Step 3: thumbnail (optional)
        if (thumbFile) {
          updateRow({ status: 'thumb', progress: 100 })
          console.log(`[multi] [${lang}] uploading thumbnail...`)
          const tForm = new FormData()
          tForm.append('image', thumbFile)
          tForm.append('videoKey', data.videoKey)
          const tRes = await fetch('/api/upload-thumb', { method: 'POST', body: tForm })
          if (!tRes.ok) {
            const tData = await tRes.json()
            throw new Error(tData.error)
          }
          console.log(`[multi] [${lang}] thumbnail done`)
        }

        updateRow({ status: 'done', progress: 100, videoKey: data.videoKey })
        console.log(`[multi] [${lang}] ✓ complete`)
        resolve(data.videoKey)
      } catch (e: any) {
        console.error(`[multi] [${lang}] ✕`, e.message)
        updateRow({ status: 'error', error: e.message ?? 'Failed' })
        reject(e)
      }
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setRunning(true)
    setAllDone(false)

    // Init rows
    const initRows: LangRow[] = selectedLangs.map(l => ({
      lang: l, status: 'idle', progress: 0, error: '', videoKey: '',
    }))
    setRows(initRows)

    // Helper to patch a single row by lang
    const patchRow = (lang: string, patch: Partial<LangRow>) =>
      setRows(prev => prev.map(r => r.lang === lang ? { ...r, ...patch } : r))

    // Upload all languages in PARALLEL
    console.log(`[multi] starting upload for ${selectedLangs.length} languages in parallel`)
    await Promise.allSettled(
      selectedLangs.map(lang =>
        uploadOneLang(lang, patch => patchRow(lang, patch))
      )
    )

    setRunning(false)
    setAllDone(true)
    console.log('[multi] all languages done')
  }

  const reset = () => {
    setTitle(''); setGenre(''); setSelectedLangs([]); setVideoFile(null)
    setThumbFile(null); setThumbPreview(''); setRows([]); setAllDone(false)
    if (videoRef.current) videoRef.current.value = ''
    if (thumbRef.current) thumbRef.current.value = ''
  }

  const statusIcon = (s: LangStatus) => {
    if (s === 'done')      return '✓'
    if (s === 'error')     return '✕'
    if (s === 'presigning') return '⟳'
    if (s === 'uploading') return '↑'
    if (s === 'thumb')     return '🖼'
    return '·'
  }

  const statusLabel = (r: LangRow) => {
    if (r.status === 'idle')       return 'Waiting'
    if (r.status === 'presigning') return 'Preparing...'
    if (r.status === 'uploading')  return `Uploading ${r.progress}%`
    if (r.status === 'thumb')      return 'Uploading thumbnail...'
    if (r.status === 'done')       return 'Done ✓'
    if (r.status === 'error')      return `Error: ${r.error}`
    return ''
  }

  return (
    <div className={styles.card}>
      {/* Title */}
      <div className={styles.step}>
        <span className={styles.stepNum}>1</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Movie title</label>
          <input className={styles.input} type="text" placeholder="e.g. Inception"
            value={title} onChange={e => setTitle(e.target.value)} disabled={running} />
        </div>
      </div>

      {/* Genre */}
      <div className={styles.step}>
        <span className={styles.stepNum}>2</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Genre</label>
          <select className={styles.select} value={genre}
            onChange={e => setGenre(e.target.value)} disabled={running}>
            <option value="">-- select genre --</option>
            {GENRES.map(g => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Language checkboxes */}
      <div className={styles.step}>
        <span className={styles.stepNum}>3</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Select languages</label>
          <div className={styles.langActions}>
            <button className={styles.linkBtn} onClick={selectAll}   disabled={running}>Select all</button>
            <span className={styles.muted}>·</span>
            <button className={styles.linkBtn} onClick={deselectAll} disabled={running}>Clear</button>
          </div>
          <div className={styles.langGrid}>
            {LANGUAGES.map(l => (
              <label key={l} className={`${styles.langChip} ${selectedLangs.includes(l) ? styles.langChipOn : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedLangs.includes(l)}
                  onChange={() => !running && toggleLang(l)}
                  style={{ display: 'none' }}
                />
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </label>
            ))}
          </div>
          {selectedLangs.length > 0 && (
            <p className={styles.muted}>{selectedLangs.length} language{selectedLangs.length > 1 ? 's' : ''} selected — will upload in parallel</p>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      <div className={styles.step}>
        <span className={styles.stepNum}>4</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Thumbnail <span className={styles.optional}>(optional — same image for all languages)</span></label>
          <p className={styles.muted}>JPG, PNG or WEBP · max 5MB</p>
          <input ref={thumbRef} type="file" accept="image/jpeg,image/png,image/webp"
            className={styles.fileInput} disabled={running}
            onChange={e => {
              const f = e.target.files?.[0]; if (!f) return
              setThumbFile(f); setThumbPreview(URL.createObjectURL(f))
            }} />
          {thumbPreview && (
            <div className={styles.previewWrap}>
              <img src={thumbPreview} alt="preview" className={styles.preview} />
            </div>
          )}
        </div>
      </div>

      {/* Video file */}
      <div className={styles.step}>
        <span className={styles.stepNum}>5</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Movie file</label>
          <p className={styles.muted}>MP4, MKV, MOV, WEBM, AVI — uploaded once, saved under each language folder</p>
          <input ref={videoRef} type="file"
            accept="video/mp4,video/x-matroska,video/quicktime,video/webm,video/x-msvideo,.mkv"
            className={styles.fileInput} disabled={running}
            onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
          {videoFile && <p className={styles.muted}>{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
        </div>
      </div>

      {/* Upload button */}
      <div className={styles.step}>
        <span className={styles.stepNum}>6</span>
        <div className={styles.stepBody}>
          <button className={styles.uploadBtn} onClick={handleSubmit} disabled={!canSubmit}>
            {running
              ? `Uploading to ${selectedLangs.length} languages...`
              : `Upload to ${selectedLangs.length || '?'} language${selectedLangs.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Per-language progress rows */}
      {rows.length > 0 && (
        <div className={styles.multiProgress}>
          {rows.map(r => (
            <div key={r.lang} className={styles.multiRow}>
              <div className={styles.multiRowTop}>
                <span className={`${styles.multiLang} ${r.status === 'done' ? styles.multiDone : r.status === 'error' ? styles.multiError : ''}`}>
                  {statusIcon(r.status)} {r.lang.charAt(0).toUpperCase() + r.lang.slice(1)}
                </span>
                <span className={styles.multiRowLabel}>{statusLabel(r)}</span>
              </div>
              {r.status === 'uploading' && (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${r.progress}%` }} />
                </div>
              )}
              {r.status === 'done' && (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '100%' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {allDone && (
        <div>
          <div className={`${styles.status} ${styles.success}`}>
            ✓ Upload complete for {rows.filter(r => r.status === 'done').length}/{rows.length} languages
          </div>
          <button className={styles.linkBtn} style={{ marginTop: '0.75rem' }} onClick={reset}>
            Upload another movie
          </button>
        </div>
      )}
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
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [description, setDescription] = useState('')
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [copied, setCopied] = useState(false)
  const videoRef = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const extractYtId = (url: string) => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
    return m?.[1] ?? ''
  }

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
      // 1. Get presigned URL
      console.log('[admin] Step 1 — requesting presigned URL...')
      setProgress('Preparing upload...')
      const params = new URLSearchParams({
        title: title.trim(), language, genre,
        filename: videoFile.name, contentType: videoFile.type || 'video/mp4',
      })
      const presignRes = await fetch(`/api/upload-movie?${params}`)
      const presignData = await presignRes.json()
      if (!presignRes.ok) throw new Error(presignData.error)
      console.log(`[admin] Step 1 ✓ key: "${presignData.videoKey}"`)

      // 2. Upload to S3 with progress
      console.log(`[admin] Step 2 — uploading ${(videoFile.size / 1024 / 1024).toFixed(2)} MB...`)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', presignData.url)
        xhr.setRequestHeader('Content-Type', videoFile.type || 'video/mp4')
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            console.log(`[admin] ${pct}%`)
            setProgress(`Uploading movie... ${pct}%`)
          }
        }
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`S3 ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(videoFile)
      })
      console.log('[admin] Step 2 ✓ upload complete')

      const vData = { videoKey: presignData.videoKey }

      // 3. Thumbnail
      if (thumbFile) {
        console.log('[admin] Step 3 — uploading thumbnail...')
        setProgress('Uploading thumbnail...')
        const tForm = new FormData()
        tForm.append('image', thumbFile)
        tForm.append('videoKey', vData.videoKey)
        const tRes = await fetch('/api/upload-thumb', { method: 'POST', body: tForm })
        if (!tRes.ok) throw new Error((await tRes.json()).error)
        console.log('[admin] Step 3 ✓ thumbnail uploaded')
      }

      // 4. YouTube trailer URL (optional)
      const ytId = extractYtId(youtubeUrl)
      if (ytId) {
        console.log(`[admin] Step 4 — saving trailer YouTube ID: ${ytId}`)
        setProgress('Saving trailer...')
        const tRes = await fetch('/api/upload-trailer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoKey: vData.videoKey, youtubeId: ytId }),
        })
        if (!tRes.ok) console.warn('[admin] Step 4 ✕ trailer save failed (non-fatal)')
        else console.log('[admin] Step 4 ✓ trailer saved')
      }

      setStatus({ type: 'success', msg: `"${title}" uploaded successfully!${ytId ? ' Trailer saved.' : ''}` })
      setProgress('')

      // Reset
      setTitle(''); setLanguage(''); setGenre('')
      setVideoFile(null); setThumbFile(null)
      setThumbPreview(''); setYoutubeUrl('')
      if (videoRef.current) videoRef.current.value = ''
      if (thumbRef.current) thumbRef.current.value = ''

      // 5. AI description
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
      console.error('[admin] ✕', e.message ?? e)
      setStatus({ type: 'error', msg: e.message ?? 'Upload failed' })
      setProgress('')
    } finally {
      setUploading(false)
    }
  }

  const canSubmit = title.trim() && language && genre && videoFile && !uploading
  const ytId = extractYtId(youtubeUrl)

  return (
    <div className={styles.card}>
      {/* Step 1 — Title */}
      <div className={styles.step}>
        <span className={styles.stepNum}>1</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>Movie title</label>
          <input className={styles.input} type="text" placeholder="e.g. RRR"
            value={title} onChange={(e) => setTitle(e.target.value)} />
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
          <label className={styles.label}>Thumbnail <span className={styles.optional}>(optional)</span></label>
          <p className={styles.muted}>JPG, PNG or WEBP · max 5MB · recommended 600×900px</p>
          <input ref={thumbRef} type="file" accept="image/jpeg,image/png,image/webp"
            className={styles.fileInput} onChange={handleThumb} />
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
          <input ref={videoRef} type="file"
            accept="video/mp4,video/x-matroska,video/quicktime,video/webm,video/x-msvideo,.mkv"
            className={styles.fileInput}
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
          {videoFile && <p className={styles.muted}>{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
        </div>
      </div>

      {/* Step 6 — YouTube Trailer URL */}
      <div className={styles.step}>
        <span className={styles.stepNum}>6</span>
        <div className={styles.stepBody}>
          <label className={styles.label}>YouTube trailer URL <span className={styles.optional}>(optional)</span></label>
          <p className={styles.muted}>Paste the YouTube trailer link — shown in the hero section when this movie is featured</p>
          <input
            className={styles.input}
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
          {youtubeUrl && !ytId && (
            <p style={{ color: '#f87171', fontSize: '0.82rem' }}>⚠ Could not detect a YouTube video ID</p>
          )}
          {ytId && <p className={styles.muted}>✓ YouTube ID detected: <code>{ytId}</code></p>}
        </div>
      </div>

      {/* Step 7 — Upload */}
      <div className={styles.step}>
        <span className={styles.stepNum}>7</span>
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
