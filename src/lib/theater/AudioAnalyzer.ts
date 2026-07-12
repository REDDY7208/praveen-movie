/**
 * AudioAnalyzer — unified 12-band analyzer for both theater modes
 * FFT size: 2048 | Exponential smoothing | CORS-safe
 */

import type { FrequencyBands } from './types'

export interface AnalyzerConfig {
  fftSize?:    number   // default 2048
  smoothing?:  number   // Web Audio smoothing 0–1, default 0.82
  expSmooth?:  number   // exponential post-smooth alpha 0–1, default 0.12
  gain?:       number   // multiplier, default 1.0
}

const DEFAULTS: Required<AnalyzerConfig> = {
  fftSize: 2048, smoothing: 0.82, expSmooth: 0.12, gain: 1.0,
}

export class AudioAnalyzer {
  private ctx:       AudioContext | null = null
  private analyser:  AnalyserNode  | null = null
  private data:      Uint8Array<ArrayBuffer> = new Uint8Array(0)
  private cfg:       Required<AnalyzerConfig>
  private smoothed:  Record<string, number> = {}
  private sampleRate = 44100

  // Beat / peak detection
  private energyHistory: number[] = Array(43).fill(0) // ~0.7s at 60fps
  private histIdx = 0
  private lastPeakTime = 0
  private lastBeatTime = 0

  constructor(cfg: AnalyzerConfig = {}) {
    this.cfg = { ...DEFAULTS, ...cfg }
  }

  /** Attach to video element. Idempotent — safe to call multiple times. */
  attach(video: HTMLVideoElement): boolean {
    if (this.ctx) { this.resume(); return true }
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = this.cfg.fftSize
      analyser.smoothingTimeConstant = this.cfg.smoothing

      const src = ctx.createMediaElementSource(video)
      src.connect(analyser)
      analyser.connect(ctx.destination) // audio must reach speakers

      this.ctx      = ctx
      this.analyser = analyser
      this.data     = new Uint8Array(analyser.frequencyBinCount)
      this.sampleRate = ctx.sampleRate
      if (ctx.state === 'suspended') ctx.resume()
      return true
    } catch (e) {
      console.warn('[AudioAnalyzer] attach failed (CORS?):', e)
      return false
    }
  }

  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume() }

  get isReady() { return !!this.analyser }

  /** Read one frame. Call every rAF tick. */
  read(): FrequencyBands {
    if (!this.analyser) return this.zero()
    this.analyser.getByteFrequencyData(this.data)

    const g = this.cfg.gain
    const a = this.cfg.expSmooth

    const raw = {
      sub1:    this.band(20,   40)  * g,
      sub2:    this.band(40,   80)  * g,
      bass1:   this.band(80,  160)  * g,
      bass2:   this.band(160, 320)  * g,
      lowMid1: this.band(320, 640)  * g,
      lowMid2: this.band(640, 1200) * g,
      mid1:    this.band(1200,2500) * g,
      mid2:    this.band(2500,5000) * g,
      high1:   this.band(5000,8000) * g,
      high2:   this.band(8000,12000)* g,
      air1:    this.band(12000,16000)*g,
      air2:    this.band(16000,20000)*g,
    }

    // Exponential smooth every band
    for (const k of Object.keys(raw) as (keyof typeof raw)[]) {
      const v = Math.min(raw[k] / 255, 1)
      this.smoothed[k] = a * v + (1 - a) * (this.smoothed[k] ?? 0)
    }

    const s = this.smoothed
    const bassEnergy   = (s.sub1 + s.sub2 + s.bass1 + s.bass2) / 4
    const midEnergy    = (s.lowMid1 + s.lowMid2 + s.mid1 + s.mid2) / 4
    const trebleEnergy = (s.high1 + s.high2 + s.air1 + s.air2) / 4
    const loudness     = (bassEnergy + midEnergy + trebleEnergy) / 3

    // Beat: current bass > 1.4× average recent bass
    this.energyHistory[this.histIdx] = bassEnergy
    this.histIdx = (this.histIdx + 1) % this.energyHistory.length
    const avgBass = this.energyHistory.reduce((a,b) => a+b,0) / this.energyHistory.length
    const now = performance.now()
    const beat = bassEnergy > avgBass * 1.4 && bassEnergy > 0.12 && now - this.lastBeatTime > 150
    if (beat) this.lastBeatTime = now

    // Peak: sudden loudness spike
    const peak = loudness > 0.65 && now - this.lastPeakTime > 300
    if (peak) this.lastPeakTime = now

    return {
      sub1: s.sub1, sub2: s.sub2, bass1: s.bass1, bass2: s.bass2,
      lowMid1: s.lowMid1, lowMid2: s.lowMid2, mid1: s.mid1, mid2: s.mid2,
      high1: s.high1, high2: s.high2, air1: s.air1, air2: s.air2,
      bassEnergy, midEnergy, trebleEnergy, loudness, beat, peak,
    }
  }

  destroy() {
    this.ctx?.close()
    this.ctx = null; this.analyser = null
  }

  private hz2idx(hz: number) {
    return Math.round((hz / (this.sampleRate / 2)) * (this.data.length - 1))
  }

  private band(lo: number, hi: number): number {
    const a = this.hz2idx(lo), b = Math.min(this.hz2idx(hi), this.data.length - 1)
    if (b <= a) return 0
    let sum = 0; for (let i = a; i <= b; i++) sum += this.data[i]
    return sum / (b - a + 1)
  }

  private zero(): FrequencyBands {
    return {
      sub1:0,sub2:0,bass1:0,bass2:0,lowMid1:0,lowMid2:0,
      mid1:0,mid2:0,high1:0,high2:0,air1:0,air2:0,
      bassEnergy:0,midEnergy:0,trebleEnergy:0,loudness:0,beat:false,peak:false,
    }
  }
}
