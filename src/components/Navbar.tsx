'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Navbar.module.css'

const LANGUAGES = ['Telugu', 'Tamil', 'Malayalam', 'Kannada', 'Hindi', 'English']

interface NavbarProps {
  onSearch?: (q: string) => void
  activeLang?: string
  onLang?: (lang: string) => void
}

export default function Navbar({ onSearch, activeLang = '', onLang }: NavbarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  return (
    <nav className={styles.nav}>
      <div className={styles.top}>
        <a href="/" className={styles.logo}>TP</a>

        <div className={styles.langTabs}>
          <button
            className={`${styles.langBtn} ${activeLang === '' ? styles.langActive : ''}`}
            onClick={() => onLang?.('')}
          >
            All
          </button>
          {LANGUAGES.map((l) => (
            <button
              key={l}
              className={`${styles.langBtn} ${activeLang === l.toLowerCase() ? styles.langActive : ''}`}
              onClick={() => onLang?.(l.toLowerCase())}
            >
              {l}
            </button>
          ))}
        </div>

        <div className={styles.right}>
          <div className={styles.search}>
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch?.(query)}
            />
            <button onClick={() => onSearch?.(query)}>&#128269;</button>
          </div>
          <div className={styles.profileWrap} onClick={() => router.push('/login')} title="Thilaveen">
            <div className={styles.avatar}>T</div>
            <span className={styles.profileName}>Thilaveen</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
