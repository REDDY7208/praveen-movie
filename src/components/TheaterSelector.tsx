'use client'
import { useState } from 'react'
import type { TheaterMode } from '@/lib/theater/types'
import styles from './TheaterSelector.module.css'

interface Props {
  onSelect: (mode: TheaterMode) => void
  onCancel: () => void
}

const OPTIONS: { mode: TheaterMode; icon: string; title: string; desc: string }[] = [
  {
    mode: 'cinema',
    icon: '🎭',
    title: 'Dolby Cinema',
    desc: 'Subtle, immersive ambient lighting. Elegant wall glows, soft beams, and gentle pulses — the movie stays center stage.',
  },
  {
    mode: 'disco',
    icon: '🪩',
    title: 'Disco Theater',
    desc: 'High-energy color bursts synchronized to bass and beats. Color themes rotate every 10 minutes.',
  },
  {
    mode: 'off',
    icon: '🎬',
    title: 'Standard',
    desc: 'Normal playback with no ambient lighting effects.',
  },
]

export default function TheaterSelector({ onSelect, onCancel }: Props) {
  const [hovered, setHovered] = useState<TheaterMode | null>(null)

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>🎦</span>
          <div>
            <h2 className={styles.title}>Choose Theater Mode</h2>
            <p className={styles.subtitle}>Select your lighting experience before watching</p>
          </div>
        </div>

        <div className={styles.options}>
          {OPTIONS.map(o => (
            <button
              key={o.mode}
              className={`${styles.option} ${hovered === o.mode ? styles.optionHovered : ''}`}
              onMouseEnter={() => setHovered(o.mode)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(o.mode)}
            >
              <span className={styles.optIcon}>{o.icon}</span>
              <div className={styles.optBody}>
                <span className={styles.optTitle}>{o.title}</span>
                <span className={styles.optDesc}>{o.desc}</span>
              </div>
              <span className={styles.arrow}>→</span>
            </button>
          ))}
        </div>

        <button className={styles.cancel} onClick={onCancel}>✕ Cancel</button>
      </div>
    </div>
  )
}
