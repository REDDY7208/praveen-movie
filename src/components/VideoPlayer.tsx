'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import styles from './VideoPlayer.module.css'
import TheaterSelector from './TheaterSelector'
import { AudioAnalyzer }  from '@/lib/theater/AudioAnalyzer'
import { CinemaEffects }  from '@/lib/theater/CinemaEffects'
import { EffectManager }  from '@/lib/theater/EffectManager'
import { LightController } from '@/lib/theater/LightController'
import type { TheaterMode } from '@/lib/theater/types'

// 8 disco bulb positions (% relative to player — overflow:visible lets them appear outside)
const BULB_POS = [
  { x:8,  y:-16 }, { x:28, y:-16 }, { x:52, y:-16 }, { x:74, y:-16 },
  { x:8,  y:110 }, { x:28, y:110 }, { x:52, y:110 }, { x:74, y:110 },
]

const DISCO_COLORS = [
  ['#ff1e64','#ff80b0','#ffb0d0'],
  ['#00c8ff','#40e8ff','#b0f8ff'],
  ['#b400ff','#d060ff','#e8b0ff'],
  ['#ffa000','#ffd040','#fff0a0'],
  ['#00ff78','#40ffb0','#a0ffe0'],
]

export default function VideoPlayer({ src, poster, title }: { src: string; poster?: string; title?: string }) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const hideTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef        = useRef<number>(0)

  // Theater system (all three modes share one AudioAnalyzer)
  const analyzerRef   = useRef(new AudioAnalyzer({ fftSize: 2048, smoothing: 0.82, expSmooth: 0.12 }))
  const lcRef         = useRef(new LightController({ slowEase: 0.07, fastEase: 0.38 }))
  const cinemaRef     = useRef(new CinemaEffects())
  const discoRef      = useRef(new EffectManager(lcRef.current))

  // DOM refs for light elements
  const glowRef       = useRef<HTMLDivElement>(null)
  const topRef        = useRef<HTMLDivElement>(null)
  const bottomRef     = useRef<HTMLDivElement>(null)
  const leftRef       = useRef<HTMLDivElement>(null)
  const rightRef      = useRef<HTMLDivElement>(null)
  const flashRef      = useRef<HTMLDivElement>(null)
  const sparkleRef    = useRef<HTMLDivElement>(null)
  const bulbRefs      = useRef<(HTMLDivElement | null)[]>([])

  // Player state
  const [playing,      setPlaying]      = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [buffered,     setBuffered]     = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [muted,        setMuted]        = useState(false)
  const [currentTime,  setCurrentTime]  = useState('0:00')
  const [duration,     setDuration]     = useState('0:00')
  const [speed,        setSpeed]        = useState(1)
  const [fullscreen,   setFullscreen]   = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showSpeed,    setShowSpeed]    = useState(false)
  const [seeking,      setSeeking]      = useState(false)
  const [nudge,        setNudge]        = useState<'+10'|'-10'|null>(null)
  const [hoverTime,    setHoverTime]    = useState<string|null>(null)
  const [hoverPct,     setHoverPct]     = useState(0)
  const [ended,        setEnded]        = useState(false)

  // Theater mode — 'off' until user picks
  const [theaterMode,     setTheaterMode]     = useState<TheaterMode>('off')
  const theaterModeRef    = useRef<TheaterMode>('off') // ref for rAF loop (avoids stale closure)
  const [showSelector,    setShowSelector]    = useState(false)
  const [theaterChosen,   setTheaterChosen]   = useState(false)
  const playingRef        = useRef(false) // ref version for visibility handler

  const fmt = (s: number) => {
    if (isNaN(s)) return '0:00'
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec}` : `${m}:${sec}`
  }

  // ── Theater loop ─────────────────────────────────────────
  // Uses theaterModeRef (not state) so it always reads the current mode
  // without needing to cancel/restart the rAF when mode changes.
  const theaterLoop = useCallback(() => {
    const v   = videoRef.current
    const now = performance.now()
    const bands = analyzerRef.current.read()
    const vt    = v ? v.currentTime : 0
    const mode  = theaterModeRef.current  // always fresh

    if (mode === 'cinema') {
      cinemaRef.current.update(bands, vt, now)
      const s = cinemaRef.current.target

      const gEl = glowRef.current
      if (gEl) {
        const op = s.borderOpacity + s.bassPulse
        const c  = `rgba(${Math.round(s.borderR)},${Math.round(s.borderG)},${Math.round(s.borderB)},${op.toFixed(3)})`
        gEl.style.boxShadow = op > 0.01
          ? `inset 0 0 ${s.borderBlur}px ${s.borderSpread}px ${c}, 0 0 ${s.borderBlur}px ${s.borderSpread}px ${c.replace(/[\d.]+\)$/, (op*0.35).toFixed(3)+')')}`
          : 'none'
      }
      applyBeam(topRef.current,    s.borderR, s.borderG, s.borderB, s.wallTop * 0.7)
      applyBeam(bottomRef.current, s.borderR, s.borderG, s.borderB, (s.wallBottom + s.bassPulse) * 0.9)
      applyBeam(leftRef.current,   s.borderR, s.borderG, s.borderB, s.wallLeft  * 0.8)
      applyBeam(rightRef.current,  s.borderR, s.borderG, s.borderB, s.wallRight * 0.8)
      if (flashRef.current)   flashRef.current.style.opacity   = s.flash.toFixed(3)
      if (sparkleRef.current) sparkleRef.current.style.opacity = s.sparkle.toFixed(3)

      bulbRefs.current.forEach((el, i) => {
        if (!el) return
        const br = s.bulbs[i] ?? 0
        el.style.opacity    = br.toFixed(3)
        el.style.transform  = `translate(-50%,-50%) scale(${0.5 + br * 0.8})`
        el.style.background = `rgba(${Math.round(s.bulbR)},${Math.round(s.bulbG)},${Math.round(s.bulbB)},0.9)`
        el.style.boxShadow  = br > 0.05
          ? `0 0 ${(6+br*20).toFixed(0)}px ${(4+br*14).toFixed(0)}px rgba(${Math.round(s.bulbR)},${Math.round(s.bulbG)},${Math.round(s.bulbB)},${(br*0.5).toFixed(2)})`
          : 'none'
      })

    } else if (mode === 'disco') {
      discoRef.current.update(bands, vt, now)
      const isFast = bands.bassEnergy > 0.5 || bands.peak
      const state  = lcRef.current.step(isFast)
      const themeIdx = Math.floor(vt / 600) % 5
      const colors   = DISCO_COLORS[themeIdx]

      bulbRefs.current.forEach((el, i) => {
        if (!el) return
        const br = state.bulbs[i] ?? 0
        const c  = colors[i % 3]
        el.style.opacity    = br.toFixed(3)
        el.style.transform  = `translate(-50%,-50%) scale(${0.4 + br * 1.4})`
        el.style.background = c
        el.style.boxShadow  = br > 0.08
          ? `0 0 ${(8+br*28).toFixed(0)}px ${(6+br*18).toFixed(0)}px ${c}88`
          : 'none'
      })

      lcRef.current.apply(
        glowRef.current, topRef.current, bottomRef.current,
        leftRef.current, rightRef.current,
        [], // bulbs handled above with disco colors
        flashRef.current, sparkleRef.current,
      )

    } else {
      // 'off' mode — clear all lights
      clearLights()
    }

    rafRef.current = requestAnimationFrame(theaterLoop)
  }, []) // no deps — reads everything via refs

  function applyBeam(el: HTMLElement|null, r: number, g: number, b: number, op: number) {
    if (!el) return
    el.style.opacity = Math.min(op, 0.60).toFixed(3)
    el.style.background = `radial-gradient(ellipse at center, rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.85) 0%, transparent 70%)`
  }

  function clearLights() {
    const els = [glowRef, topRef, bottomRef, leftRef, rightRef, flashRef, sparkleRef]
    els.forEach(r => {
      if (!r.current) return
      r.current.style.opacity    = '0'
      r.current.style.boxShadow  = 'none'
      r.current.style.background = 'none'
    })
    bulbRefs.current.forEach(el => {
      if (!el) return
      el.style.opacity   = '0'
      el.style.boxShadow = 'none'
    })
  }

  const startTheater = useCallback(() => {
    const v = videoRef.current; if (!v) return
    analyzerRef.current.attach(v)
    analyzerRef.current.resume()
    cancelAnimationFrame(rafRef.current)
    // Always start the loop — it reads theaterModeRef internally
    rafRef.current = requestAnimationFrame(theaterLoop)
  }, [theaterLoop])

  const stopTheater = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    cinemaRef.current.reset()
    discoRef.current.reset()
    lcRef.current.reset()
    clearLights()
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      analyzerRef.current.destroy()
    }
  }, [])

  // Pause rAF when tab hidden, resume on visible
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current)
      } else if (playingRef.current) {
        rafRef.current = requestAnimationFrame(theaterLoop)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [theaterLoop])

  // ── Controls ──────────────────────────────────────────────
  const resetHide = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  const startPlay = useCallback(() => {
    const v = videoRef.current; if (!v) return
    v.play(); setPlaying(true); playingRef.current = true; setEnded(false)
    startTheater()
    resetHide()
  }, [startTheater, resetHide])

  // When play is first pressed, show theater selector if not chosen yet
  const handlePlayPress = useCallback(() => {
    const v = videoRef.current; if (!v) return
    if (!theaterChosen && v.paused) {
      setShowSelector(true)
      return
    }
    if (v.paused) { startPlay() }
    else { v.pause(); setPlaying(false); playingRef.current = false; stopTheater() }
    resetHide()
  }, [theaterChosen, startPlay, stopTheater, resetHide])

  const handleTheaterSelect = useCallback((mode: TheaterMode) => {
    // Update ref first so the running loop picks it up immediately
    theaterModeRef.current = mode
    setTheaterMode(mode)
    setTheaterChosen(true)
    setShowSelector(false)

    // Reset whichever engine was previously active
    cinemaRef.current.reset()
    discoRef.current.reset()
    lcRef.current.reset()
    clearLights()

    const v = videoRef.current
    if (v && v.paused) {
      // Not yet playing — start now
      startPlay()
    } else if (v && !v.paused) {
      // Already playing — keep playing, loop is already running with new mode
      analyzerRef.current.resume()
    }
  }, [startPlay])

  const skip = useCallback((s: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.min(Math.max(0, v.currentTime + s), v.duration)
    setNudge(s > 0 ? '+10' : '-10')
    setTimeout(() => setNudge(null), 700)
    resetHide()
  }, [resetHide])

  const onTimeUpdate = () => {
    const v = videoRef.current; if (!v || seeking) return
    setProgress((v.currentTime / v.duration) * 100 || 0)
    setCurrentTime(fmt(v.currentTime))
    if (v.buffered.length > 0)
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
  }

  const onLoaded = () => { const v = videoRef.current; if (v) setDuration(fmt(v.duration)) }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current; if (!v) return
    const val = Number(e.target.value)
    v.currentTime = (val / 100) * v.duration
    setProgress(val); setCurrentTime(fmt(v.currentTime))
  }

  const onProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current; if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    setHoverPct(pct * 100); setHoverTime(fmt(pct * v.duration))
  }

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setVolume(val); if (videoRef.current) videoRef.current.volume = val
    setMuted(val === 0)
  }

  const toggleMute = () => {
    const v = videoRef.current; if (!v) return
    v.muted = !v.muted; setMuted(v.muted)
  }

  const changeSpeed = (s: number) => {
    setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s
    setShowSpeed(false)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  const togglePip = async () => {
    const v = videoRef.current; if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {}
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = src; a.download = title ?? 'video'; a.target = '_blank'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT') return
      switch (e.code) {
        case 'Space':      e.preventDefault(); handlePlayPress(); break
        case 'ArrowRight': e.preventDefault(); skip(10); break
        case 'ArrowLeft':  e.preventDefault(); skip(-10); break
        case 'KeyF': toggleFullscreen(); break
        case 'KeyM': toggleMute(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handlePlayPress, skip])

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  useEffect(() => {
    if (!playing) { setShowControls(true); return }
    resetHide()
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [playing, resetHide])

  const volIcon = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'
  const speeds  = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  return (
    <>
      {/* Theater selector modal — shown before first play */}
      {showSelector && (
        <TheaterSelector
          onSelect={handleTheaterSelect}
          onCancel={() => { setShowSelector(false); setTheaterChosen(true); startPlay() }}
        />
      )}

      <div
        ref={containerRef}
        className={`${styles.wrap} ${fullscreen ? styles.fs : ''}`}
        onMouseMove={resetHide}
        onMouseLeave={() => playing && setShowControls(false)}
      >
        {/* ── Theater light elements ─────────────────────── */}
        <div ref={glowRef}     className={styles.glowBorder}    />
        <div ref={topRef}      className={styles.beamTop}       />
        <div ref={bottomRef}   className={styles.beamBottom}    />
        <div ref={leftRef}     className={styles.beamLeft}      />
        <div ref={rightRef}    className={styles.beamRight}     />
        <div ref={flashRef}    className={styles.flashOverlay}  />
        <div ref={sparkleRef}  className={styles.sparkleOverlay}/>

        {/* 8 Disco / Cinema bulbs */}
        {BULB_POS.map((pos, i) => (
          <div
            key={i}
            ref={el => { bulbRefs.current[i] = el }}
            className={styles.discoBulb}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          />
        ))}

        {/* ── Video ─────────────────────────────────────── */}
        <video
          ref={videoRef}
          src={src} poster={poster}
          crossOrigin="anonymous"
          className={styles.video}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoaded}
          onEnded={() => {
            setPlaying(false); playingRef.current = false; setEnded(true); setShowControls(true)
            cinemaRef.current.onEnded()
            discoRef.current.onEnded()
            setTimeout(stopTheater, 4000)
          }}
          onClick={handlePlayPress}
        />

        {/* Skip nudge */}
        {nudge && (
          <div className={`${styles.nudge} ${nudge === '+10' ? styles.nudgeR : styles.nudgeL}`}>
            <div className={styles.nudgeRipple} />
            <span>{nudge === '+10' ? '▶▶' : '◀◀'}</span>
            <small>10s</small>
          </div>
        )}

        {/* Center play/replay */}
        {(!playing || ended) && !showSelector && (
          <button className={styles.centerBtn} onClick={handlePlayPress} aria-label={ended ? 'Replay' : 'Play'}>
            <span>{ended ? '↺' : '▶'}</span>
          </button>
        )}

        {/* Controls overlay */}
        <div className={`${styles.controls} ${showControls ? styles.show : ''}`}>
          {title && <div className={styles.titleBar}>{title}</div>}

          {/* Theater mode badge */}
          {theaterMode !== 'off' && (
            <button
              className={styles.theaterBadge}
              onClick={() => setShowSelector(true)}
              title="Change theater mode"
            >
              {theaterMode === 'cinema' ? '🎭' : '🪩'} {theaterMode === 'cinema' ? 'Dolby Cinema' : 'Disco'}
            </button>
          )}
          {theaterMode === 'off' && theaterChosen && (
            <button className={styles.theaterBadge} onClick={() => setShowSelector(true)} title="Enable theater mode">
              🎬 Standard
            </button>
          )}

          <div className={styles.progressArea} onMouseMove={onProgressHover} onMouseLeave={() => setHoverTime(null)}>
            {hoverTime && <div className={styles.tooltip} style={{ left: `${hoverPct}%` }}>{hoverTime}</div>}
            <div className={styles.progressTrack}>
              <div className={styles.progressBuf}   style={{ width: `${buffered}%` }} />
              <div className={styles.progressFill}  style={{ width: `${progress}%` }} />
              <div className={styles.progressThumb} style={{ left:  `${progress}%` }} />
            </div>
            <input type="range" min={0} max={100} step={0.1} value={progress}
              className={styles.progressInput}
              onMouseDown={() => setSeeking(true)} onMouseUp={() => setSeeking(false)}
              onChange={seek} aria-label="Seek" />
          </div>

          <div className={styles.bar}>
            <div className={styles.barLeft}>
              <button className={styles.btn} onClick={handlePlayPress} title="Play/Pause (Space)">
                {playing
                  ? <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5,3 19,12 5,21"/></svg>}
              </button>
              <button className={styles.btn} onClick={() => skip(-10)} title="Rewind (←)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/>
                </svg>
                <span className={styles.skipLabel}>10</span>
              </button>
              <button className={styles.btn} onClick={() => skip(10)} title="Forward (→)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/>
                </svg>
                <span className={styles.skipLabel}>10</span>
              </button>
              <div className={styles.volGroup}>
                <button className={styles.btn} onClick={toggleMute} title="Mute (M)">
                  <span style={{ fontSize:'1.1rem', lineHeight:1 }}>{volIcon}</span>
                </button>
                <div className={styles.volSliderWrap}>
                  <input type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
                    className={styles.volSlider} onChange={changeVolume} aria-label="Volume" />
                </div>
              </div>
              <span className={styles.timeLabel}>{currentTime} <span className={styles.timeSep}>/</span> {duration}</span>
            </div>

            <div className={styles.barRight}>
              <div className={styles.speedWrap}>
                <button className={`${styles.btn} ${styles.speedBtn}`} onClick={() => setShowSpeed(v => !v)}>{speed}×</button>
                {showSpeed && (
                  <div className={styles.speedMenu}>
                    <div className={styles.speedHeader}>Speed</div>
                    {speeds.map(s => (
                      <button key={s} className={`${styles.speedItem} ${speed === s ? styles.speedOn : ''}`} onClick={() => changeSpeed(s)}>
                        {speed === s && <span className={styles.speedCheck}>✓</span>}
                        {s === 1 ? 'Normal' : `${s}×`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {'pictureInPictureEnabled' in document && (
                <button className={styles.btn} onClick={togglePip} title="Picture in Picture">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <rect x="13" y="12" width="8" height="6" rx="1" fill="currentColor" stroke="none"/>
                  </svg>
                </button>
              )}
              <button className={styles.btn} onClick={handleDownload} title="Download">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M12 3v13m0 0l-4-4m4 4l4-4"/><path d="M4 20h16"/>
                </svg>
              </button>
              <button className={styles.btn} onClick={toggleFullscreen} title="Fullscreen (F)">
                {fullscreen
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
