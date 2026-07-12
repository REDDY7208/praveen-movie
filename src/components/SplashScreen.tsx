'use client'
import { useEffect, useState, useRef } from 'react'
import styles from './SplashScreen.module.css'

export default function SplashScreen() {
  const [tLanded,  setTLanded]  = useState(false)
  const [pLanded,  setPLanded]  = useState(false)
  const [nameShow, setNameShow] = useState(false)
  const [tExit,    setTExit]    = useState(false)
  const [pExit,    setPExit]    = useState(false)
  const [fadeOut,  setFadeOut]  = useState(false)
  const [done,     setDone]     = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    // Only play if user navigated from login (their click = user gesture)
    const canPlay = sessionStorage.getItem('tpSplash') === '1'
    sessionStorage.removeItem('tpSplash') // consume it

    const playTimer = setTimeout(() => {
      if (canPlay && audioRef.current) {
        audioRef.current.volume = 0.85
        audioRef.current.play().catch(() => {})
      }
    }, 100)

    const t1 = setTimeout(() => setTLanded(true),  0)
    const t2 = setTimeout(() => setPLanded(true),  1000)
    const t3 = setTimeout(() => setNameShow(true), 3000)

    const t4 = setTimeout(() => {
      // Fade audio out
      const a = audioRef.current
      if (a) {
        const fade = setInterval(() => {
          if (a.volume > 0.06) a.volume = Math.max(0, a.volume - 0.1)
          else { a.pause(); clearInterval(fade) }
        }, 80)
      }
      setNameShow(false)
      setPExit(true)
      setTExit(true)
    }, 6000)

    const t5 = setTimeout(() => setFadeOut(true), 7000)
    const t6 = setTimeout(() => setDone(true),    8000)

    return () => {
      clearTimeout(playTimer)
      ;[t1,t2,t3,t4,t5,t6].forEach(clearTimeout)
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

  if (done) return null

  return (
    <div className={`${styles.splash} ${fadeOut ? styles.fadeOut : ''}`}>
      {/* Audio element in DOM — more reliable than JS Audio() across navigation */}
      <audio ref={audioRef} src="/splash.mp3" preload="auto" />

      <div className={styles.logoWrap}>
        <span className={`
          ${styles.letter} ${styles.letterT}
          ${tLanded ? styles.tLanded : ''}
          ${tExit   ? styles.tExit   : ''}
        `}>T</span>

        <span className={`
          ${styles.letter} ${styles.letterP}
          ${pLanded ? styles.pLanded : ''}
          ${pExit   ? styles.pExit   : ''}
        `}>P</span>
      </div>

      <div className={`${styles.fullName} ${nameShow ? styles.nameVisible : ''}`}>
        <span className={styles.thilaga}>Thilaga</span>
        <span className={styles.friend}>🤝</span>
        <span className={styles.praveen}>Praveen</span>
      </div>

      <div className={`${styles.brandName} ${nameShow ? styles.nameVisible : ''}`}>
        Thilaveen
      </div>
    </div>
  )
}
