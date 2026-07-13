'use client'
import { useEffect, useState } from 'react'
import { getBgm, stopBgm } from '@/lib/bgm'
import styles from './SplashScreen.module.css'

export default function SplashScreen() {
  const [tLanded,  setTLanded]  = useState(false)
  const [pLanded,  setPLanded]  = useState(false)
  const [nameShow, setNameShow] = useState(false)
  const [tExit,    setTExit]    = useState(false)
  const [pExit,    setPExit]    = useState(false)
  const [fadeOut,  setFadeOut]  = useState(false)
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    const audio = getBgm()
    console.log('[splash] mounted — audio:', audio ? `found ✓ paused=${audio.paused}` : 'NOT FOUND ✕')

    const t1 = setTimeout(() => setTLanded(true),  0)
    const t2 = setTimeout(() => setPLanded(true),  1000)
    const t3 = setTimeout(() => setNameShow(true), 3000)

    const t4 = setTimeout(() => {
      if (audio) {
        console.log('[splash] fading out audio...')
        const fade = setInterval(() => {
          if (audio.volume > 0.06) audio.volume = Math.max(0, audio.volume - 0.1)
          else { stopBgm(); clearInterval(fade) }
        }, 80)
      }
      setNameShow(false)
      setPExit(true)
      setTExit(true)
    }, 6000)

    const t5 = setTimeout(() => setFadeOut(true), 7000)
    const t6 = setTimeout(() => setDone(true),    8000)

    return () => {
      ;[t1,t2,t3,t4,t5,t6].forEach(clearTimeout)
    }
  }, [])

  if (done) return null

  return (
    <div className={`${styles.splash} ${fadeOut ? styles.fadeOut : ''}`}>
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
