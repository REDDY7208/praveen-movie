'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startBgm } from '@/lib/bgm'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleEnter = () => {
    setLoading(true)
    // Start audio HERE on the user gesture — this is the only reliable way
    // to get autoplay permission across all browsers including mobile
    startBgm()
    sessionStorage.setItem('tpSplash', '1')
    setTimeout(() => router.push('/'), 300)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.overlay} />
      <div className={styles.logo}>TP</div>

      <div className={styles.center}>
        <h1 className={styles.heading}>Who&apos;s watching?</h1>
        <div className={styles.profiles}>
          <button className={styles.profile} onClick={handleEnter} disabled={loading}>
            <div className={styles.avatar}>
              <span className={styles.avatarInitial}>T</span>
            </div>
            <span className={styles.name}>Thilaveen</span>
          </button>
        </div>
        {loading && <div className={styles.spinner} />}
      </div>
    </div>
  )
}
