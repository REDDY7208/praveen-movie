// Global BGM audio shared across pages
// Started on login click (user gesture), picked up by SplashScreen

declare global {
  interface Window {
    __tpBgm?: HTMLAudioElement
  }
}

export function startBgm() {
  if (typeof window === 'undefined') return
  if (window.__tpBgm) {
    window.__tpBgm.pause()
    window.__tpBgm.currentTime = 0
  }
  const audio = new Audio('/splash.mp3')
  audio.volume = 0.85
  const playPromise = audio.play()
  playPromise
    .then(() => console.log('[bgm] ✓ audio playing'))
    .catch((e) => console.error('[bgm] ✕ play() blocked:', e.message))
  window.__tpBgm = audio
  console.log('[bgm] startBgm() called — audio created and stored on window.__tpBgm')
}

export function getBgm(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  const audio = window.__tpBgm ?? null
  console.log('[bgm] getBgm() —', audio ? `found, paused=${audio.paused}, currentTime=${audio.currentTime.toFixed(2)}` : 'NOT FOUND (null)')
  return audio
}

export function stopBgm() {
  if (typeof window === 'undefined') return
  if (window.__tpBgm) {
    window.__tpBgm.pause()
    window.__tpBgm = undefined
    console.log('[bgm] stopBgm() — audio stopped and cleared')
  }
}
