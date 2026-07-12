import styles from './ComingSoonCard.module.css'

export default function ComingSoonCard({ genre }: { genre: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.thumb}>
        <span className={styles.icon}>🎬</span>
      </div>
      <div className={styles.info}>
        <p className={styles.title}>Coming Soon</p>
        <p className={styles.genre}>{genre}</p>
      </div>
    </div>
  )
}
