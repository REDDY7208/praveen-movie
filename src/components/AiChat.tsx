'use client'
import { useState, useRef, useEffect } from 'react'
import styles from './AiChat.module.css'

interface Msg { role: 'user' | 'ai'; text: string }

export default function AiChat() {
  const [open,    setOpen]    = useState(false)
  const [input,   setInput]   = useState('')
  const [msgs,    setMsgs]    = useState<Msg[]>([
    { role: 'ai', text: 'Hi! I\'m your movie assistant 🎬 Ask me anything — "suggest a funny Tamil movie" or "what should I watch tonight?"' }
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMsgs((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const history = msgs.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }))
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
      const data = await res.json()
      setMsgs((prev) => [...prev, { role: 'ai', text: data.reply || 'Sorry, try again!' }])
    } catch {
      setMsgs((prev) => [...prev, { role: 'ai', text: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button className={styles.fab} onClick={() => setOpen((v) => !v)} aria-label="AI Chat">
        {open ? '✕' : '🤖'}
        {!open && <span className={styles.fabLabel}>Ask AI</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerIcon}>🎬</span>
            <div>
              <p className={styles.headerTitle}>Movie Assistant</p>
              <p className={styles.headerSub}>Powered by Gemini AI</p>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={styles.messages}>
            {msgs.map((m, i) => (
              <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.userMsg : styles.aiMsg}`}>
                {m.role === 'ai' && <span className={styles.aiAvatar}>🤖</span>}
                <div className={styles.bubble}
                  dangerouslySetInnerHTML={{
                    __html: m.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.aiMsg}`}>
                <span className={styles.aiAvatar}>🤖</span>
                <div className={styles.bubble}>
                  <span className={styles.typing}><span/><span/><span/></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={styles.inputRow}>
            <input
              className={styles.input}
              placeholder="Ask me anything about movies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button className={styles.sendBtn} onClick={send} disabled={loading || !input.trim()}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
