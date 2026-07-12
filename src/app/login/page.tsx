'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleEnter = () => {
    setLoading(true)
    // Mark that user has interacted — unlocks audio autoplay for this session
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
