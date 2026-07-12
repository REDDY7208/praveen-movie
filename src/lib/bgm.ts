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
  audio.play().catch(() => {})
  window.__tpBgm = audio
}

export function getBgm(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  return window.__tpBgm ?? null
}

export function stopBgm() {
  if (typeof window === 'undefined') return
  if (window.__tpBgm) {
    window.__tpBgm.pause()
    window.__tpBgm = undefined
  }
}
