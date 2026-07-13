'use client'
import { useState, useEffect } from 'react'
import type { TheaterMode } from '@/lib/theater/types'
import styles from './TheaterSelector.module.css'

interface Props {
  onSelect: (mode: TheaterMode) => void
  onCancel: () => void
}

const OPTIONS: { mode: TheaterMode; icon: string; title: string; desc: string; color: string }[] = [
  {
    mode: 'cinema',
    icon: '🎭',
    title: 'Dolby Cinema',
    desc: 'Immersive ambient lighting synced to the film.',
    color: '#ff6b35',
  },
  {
    mode: 'disco',
    icon: '🪩',
    title: 'Disco Theater',
    desc: 'Beat-synced color bursts. High energy.',
    color: '#b400ff',
  },
  {
    mode: 'off',
    icon: '🎬',
    title: 'Standard',
    desc: 'Clean playback, no effects.',
    color: 'rgba(255,255,255,0.5)',
  },
]

export default function TheaterSelector({ onSelect, onCancel }: Props) {
  const [visible,  setVisible]  = useState(false)
  const [titleIn,  setTitleIn]  = useState(false)
  const [cardsIn,  setCardsIn]  = useState(false)
  const [selected, setSelected] = useState<TheaterMode | null>(null)
  const [exiting,  setExiting]  = useState(false)

  useEffect(() => {
    // Staggered entrance like splash screen
    const t1 = setTimeout(() => setVisible(true),  30)
    const t2 = setTimeout(() => setTitleIn(true),  150)
    const t3 = setTimeout(() => setCardsIn(true),  400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const handleSelect = (mode: TheaterMode) => {
    setSelected(mode)
    setExiting(true)
    setTimeout(() => onSelect(mode), 500)
  }

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => onCancel(), 400)
  }

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayIn : ''} ${exiting ? styles.overlayOut : ''}`}
      onClick={handleCancel}
    >
      <div className={styles.inner} onClick={e => e.stopPropagation()}>

        {/* Brand logo mark — like the T/P in splash */}
        <div className={`${styles.logoMark} ${titleIn ? styles.logoIn : ''}`}>
          🎦
        </div>

        {/* Title */}
        <div className={`${styles.titleBlock} ${titleIn ? styles.titleIn : ''}`}>
          <h2 className={styles.headline}>Choose Theater Mode</h2>
          <p className={styles.sub}>Select your experience before the film begins</p>
        </div>

        {/* Option cards — staggered in */}
        <div className={styles.cards}>
          {OPTIONS.map((o, i) => (
            <button
              key={o.mode}
              className={`
                ${styles.card}
                ${cardsIn ? styles.cardIn : ''}
                ${selected === o.mode ? styles.cardPicked : ''}
              `}
              style={{
                '--card-color': o.color,
                '--card-delay': `${i * 90}ms`,
              } as React.CSSProperties}
              onClick={() => handleSelect(o.mode)}
            >
              <span className={styles.cardIcon}>{o.icon}</span>
              <div className={styles.cardBody}>
                <span className={styles.cardTitle}>{o.title}</span>
                <span className={styles.cardDesc}>{o.desc}</span>
              </div>
              <span className={styles.cardArrow}>▶</span>
            </button>
          ))}
        </div>

        <button className={styles.skip} onClick={handleCancel}>
          Skip — play without effects
        </button>
      </div>
    </div>
  )
}
