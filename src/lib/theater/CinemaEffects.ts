/**
 * CinemaEffects — Theater 2: Dolby Cinema / IMAX premium ambient lighting
 * Subtle, elegant, immersive. The movie is always the focus.
 * Max brightness caps are enforced. No random flicker.
 */

import type { FrequencyBands } from './types'

// ── Color themes (smooth 3s transition every 10 min) ─────────
const THEMES = [
  { r: 74,  g: 144, b: 226 }, // Blue    #4A90E2
  { r: 142, g: 68,  b: 173 }, // Purple  #8E44AD
  { r: 0,   g: 188, b: 212 }, // Cyan    #00BCD4
  { r: 255, g: 193, b: 7   }, // Amber   #FFC107
  { r: 255, g: 82,  b: 82  }, // Red     #FF5252
]

// ── Scene types ───────────────────────────────────────────────
type Scene =
  | 'silence' | 'dialogue' | 'softBgm' | 'romance'
  | 'suspense' | 'buildup' | 'action' | 'explosion'
  | 'celebration' | 'credits'

// ── Light state (all values 0–1 unless noted) ─────────────────
export interface CinemaState {
  // Border glow
  borderR: number; borderG: number; borderB: number
  borderOpacity: number  // max 0.45 for explosion
  borderSpread: number   // px
  borderBlur: number     // px

  // 4 wall zones (left/right walls, each 0–1 brightness)
  wallLeft:   number   // max 0.60 action, 0.12 dialogue
  wallRight:  number
  wallTop:    number
  wallBottom: number   // floor reflection, max 0.12

  // Corner LEDs (max 0.10, never flash)
  cornerTL: number; cornerTR: number
  cornerBL: number; cornerBR: number

  // Ceiling glow (max 0.15)
  ceiling: number

  // Ambient beams x6 (opacity 0.05–0.20)
  beams: number[]

  // Disco bulbs x8 — max 1–3 active, max brightness by scene
  bulbs: number[]
  bulbR: number; bulbG: number; bulbB: number

  // Explosion flash (max 0.30, never for dialogue)
  flash: number
  flashR: number; flashG: number; flashB: number

  // Air shimmer
  sparkle: number

  // Bass pulse overlay (gentle, max +0.08 on top of scene)
  bassPulse: number
}

export class CinemaEffects {
  private scene: Scene = 'silence'
  private candidate: Scene = 'silence'
  private candidateFrames = 0
  private readonly HYSTERESIS = 8

  // Theme interpolation
  private themeR = THEMES[0].r
  private themeG = THEMES[0].g
  private themeB = THEMES[0].b
  private lastThemeIdx = 0
  private themeTransitionStart = 0
  private readonly THEME_TRANSITION_MS = 3000

  // Explosion flash timer
  private flashUntil = 0

  // Buildup ramp
  private buildRamp = 0

  // Bulb pattern state
  private bulbPattern: number[] = Array(8).fill(0)
  private bulbPatternTimer = 0
  private bulbPatternIdx = 0
  private activeBulbs: number[] = []

  // Wall right delay buffer (80–150ms)
  private rightWallDelay: Array<{ v: number; t: number }> = []
  private readonly RIGHT_DELAY_MS = 100

  target: CinemaState = this.defaultState()

  /** Main update — call every rAF frame */
  update(b: FrequencyBands, videoTime: number, now: number) {
    this.updateTheme(videoTime, now)
    const scene = this.detectScene(b)
    this.applyScene(scene, b, now)
    this.applyBassPulse(b)
    this.applyRightDelay(now)
  }

  // ── Scene detection with hysteresis ──────────────────────

  private detectScene(b: FrequencyBands): Scene {
    let cand: Scene

    if (b.loudness < 0.025) {
      cand = 'silence'
    } else if (b.peak && b.bassEnergy > 0.60) {
      cand = 'explosion'
    } else if (b.bassEnergy > 0.50 && b.loudness > 0.45) {
      cand = 'action'
    } else if (b.loudness > 0.38 && b.trebleEnergy > 0.30) {
      cand = 'celebration'
    } else if (b.bassEnergy > 0.30 && b.loudness > 0.30) {
      cand = 'buildup'
    } else if (b.sub1 + b.sub2 < 0.08 && b.mid1 > 0.20 && b.midEnergy > b.bassEnergy) {
      cand = 'dialogue'
    } else if (b.loudness > 0.10 && b.bassEnergy < 0.20 && b.midEnergy < 0.18) {
      cand = 'romance'
    } else if (b.loudness > 0.08 && b.bassEnergy < 0.15) {
      cand = 'softBgm'
    } else if (b.sub1 > 0.10 && b.loudness < 0.20) {
      cand = 'suspense'
    } else {
      cand = 'silence'
    }

    if (cand !== this.candidate) { this.candidate = cand; this.candidateFrames = 0 }
    else this.candidateFrames++
    if (this.candidateFrames >= this.HYSTERESIS) this.scene = cand
    return this.scene
  }

  // ── Theme interpolation ───────────────────────────────────

  private updateTheme(videoTime: number, now: number) {
    const idx = Math.floor(videoTime / 600) % THEMES.length
    if (idx !== this.lastThemeIdx) {
      this.lastThemeIdx = idx
      this.themeTransitionStart = now
    }
    const t = Math.min((now - this.themeTransitionStart) / this.THEME_TRANSITION_MS, 1)
    const prev = THEMES[(idx === 0 ? THEMES.length : idx) - 1]
    const next = THEMES[idx]
    this.themeR = prev.r + (next.r - prev.r) * t
    this.themeG = prev.g + (next.g - prev.g) * t
    this.themeB = prev.b + (next.b - prev.b) * t
  }

  // ── Scene → target ────────────────────────────────────────

  private applyScene(scene: Scene, b: FrequencyBands, now: number) {
    const r = this.themeR, g = this.themeG, bl = this.themeB
    const s = this.target

    // Reset flash unless explosion
    if (scene !== 'explosion') s.flash = 0

    switch (scene) {

      case 'silence':
        s.borderOpacity = 0.03; s.borderSpread = 3; s.borderBlur = 12
        s.wallLeft = 0.05; s.wallRight = 0.05; s.wallTop = 0.04; s.wallBottom = 0.03
        s.cornerTL = s.cornerTR = s.cornerBL = s.cornerBR = 0.03
        s.ceiling = 0.04
        this.setBeams([0.05,0.04,0.04,0.04,0.04,0.05])
        this.setBulbs(0, 0); s.sparkle = 0; this.buildRamp = 0
        break

      case 'dialogue':
        // Stable warm lighting — NO flashing
        s.borderR = 255; s.borderG = 220; s.borderB = 160
        s.borderOpacity = 0.12; s.borderSpread = 5; s.borderBlur = 18
        s.wallLeft = 0.12; s.wallRight = 0.12; s.wallTop = 0.10; s.wallBottom = 0.06
        s.cornerTL = s.cornerTR = s.cornerBL = s.cornerBR = 0.06
        s.ceiling = 0.08
        this.setBeams([0.08,0.07,0.07,0.07,0.07,0.08])
        this.setBulbs(0.06, 0); s.sparkle = 0
        break

      case 'romance':
        s.borderR = 255; s.borderG = 160; s.borderB = 180
        s.borderOpacity = 0.14; s.borderSpread = 6; s.borderBlur = 22
        s.wallLeft = 0.14; s.wallRight = 0.14; s.wallTop = 0.10; s.wallBottom = 0.07
        s.cornerTL = s.cornerTR = s.cornerBL = s.cornerBR = 0.07
        s.ceiling = 0.09
        this.setBeams([0.10,0.09,0.08,0.08,0.09,0.10])
        this.setBulbs(0.06, 0); s.sparkle = 0
        break

      case 'softBgm': {
        const breath = 0.07 + b.midEnergy * 0.12
        s.borderR = r; s.borderG = g; s.borderB = bl
        s.borderOpacity = breath; s.borderSpread = 4 + b.bassEnergy * 8; s.borderBlur = 14 + b.bassEnergy * 14
        s.wallLeft = 0.10 + b.midEnergy * 0.08; s.wallRight = s.wallLeft
        s.wallTop = 0.08; s.wallBottom = 0.05
        s.ceiling = 0.08 + b.midEnergy * 0.05
        this.setBeams([0.08,0.07,0.07,0.07,0.07,0.08].map(v => v + b.midEnergy * 0.06))
        this.setBulbs(0.08 + b.midEnergy * 0.08, 1); s.sparkle = b.air1 * 0.2
        break
      }

      case 'suspense':
        s.borderR = 80; s.borderG = 20; s.borderB = 140
        s.borderOpacity = 0.10 + b.sub1 * 0.15; s.borderSpread = 5; s.borderBlur = 20
        s.wallLeft = 0.08 + b.sub1 * 0.10; s.wallRight = s.wallLeft
        s.wallTop = 0.06; s.wallBottom = 0.04; s.ceiling = 0.06
        this.setBeams([0.06,0.05,0.05,0.05,0.05,0.06])
        this.setBulbs(0.05, 0); s.sparkle = 0
        break

      case 'buildup': {
        this.buildRamp = Math.min(this.buildRamp + 0.005, b.loudness)
        const lvl = this.buildRamp
        s.borderR = r; s.borderG = g; s.borderB = bl
        s.borderOpacity = 0.15 + lvl * 0.20; s.borderSpread = 6 + lvl * 16; s.borderBlur = 18 + lvl * 28
        s.wallLeft = 0.15 + lvl * 0.20; s.wallRight = s.wallLeft
        s.wallTop = 0.12 + lvl * 0.15; s.wallBottom = 0.08
        s.ceiling = 0.10 + lvl * 0.05
        this.setBeams([0.10,0.10,0.10,0.10,0.10,0.10].map(v => v + lvl * 0.08))
        // Progressive bulb activation (max 3 at once)
        this.setBulbs(0.10 + lvl * 0.18, 3); s.sparkle = b.air1 * lvl * 0.4
        break
      }

      case 'action': {
        this.buildRamp = 1
        const bass = b.bassEnergy
        s.borderR = r; s.borderG = g; s.borderB = bl
        s.borderOpacity = Math.min(0.20 + bass * 0.20, 0.38)
        s.borderSpread = 8 + bass * 20; s.borderBlur = 20 + bass * 30
        s.wallLeft = Math.min(0.20 + bass * 0.15, 0.35)
        s.wallRight = s.wallLeft
        s.wallTop = 0.18; s.wallBottom = Math.min(0.10 + bass * 0.04, 0.12)
        s.ceiling = Math.min(0.12 + bass * 0.03, 0.15)
        this.setBeams([0.14,0.14,0.14,0.14,0.14,0.14].map(v => v + bass * 0.06))
        // Beat-synced bulbs — max 3 active
        if (b.beat) this.rotateBulbPattern(3)
        this.setBulbs(0.20 + bass * 0.15, 3); s.sparkle = b.trebleEnergy * 0.3
        break
      }

      case 'explosion': {
        const active = now < this.flashUntil
        if (b.peak && now - this.flashUntil > 300) {
          this.flashUntil = now + 140
        }
        s.borderR = 247; s.borderG = 250; s.borderB = 255
        s.borderOpacity = active ? 0.45 : 0.25; s.borderSpread = active ? 30 : 15; s.borderBlur = active ? 60 : 30
        s.wallLeft = active ? 0.60 : 0.30; s.wallRight = s.wallLeft
        s.wallTop = active ? 0.40 : 0.20; s.wallBottom = Math.min(active ? 0.12 : 0.08, 0.12)
        s.ceiling = Math.min(active ? 0.15 : 0.10, 0.15)
        s.flash = active ? 0.22 : 0
        s.flashR = 247; s.flashG = 250; s.flashB = 255
        this.setBeams(Array(6).fill(active ? 0.20 : 0.12))
        this.setBulbs(active ? 0.60 : 0.20, 3); s.sparkle = 0
        break
      }

      case 'celebration': {
        s.borderR = r; s.borderG = g; s.borderB = bl
        s.borderOpacity = 0.22; s.borderSpread = 10; s.borderBlur = 28
        s.wallLeft = 0.22; s.wallRight = s.wallLeft; s.wallTop = 0.18; s.wallBottom = 0.10
        s.ceiling = 0.13
        this.setBeams([0.15,0.14,0.14,0.14,0.14,0.15])
        this.setBulbs(0.30, 3); s.sparkle = b.trebleEnergy * 0.5
        break
      }

      case 'credits':
        s.borderR = 180; s.borderG = 190; s.borderB = 255
        s.borderOpacity = 0.06; s.borderSpread = 3; s.borderBlur = 14
        s.wallLeft = 0.05; s.wallRight = 0.05; s.wallTop = 0.04; s.wallBottom = 0.03
        s.ceiling = 0.05
        this.setBeams([0.06,0.05,0.05,0.05,0.05,0.06])
        this.setBulbs(0.04, 0); s.sparkle = 0.04; this.buildRamp = 0
        break
    }

    // Bulk-set theme color for wall beams
    s.borderR  = s.borderR  || r
    s.borderG  = s.borderG  || g
    s.borderB  = s.borderB  || bl
    s.bulbR    = r; s.bulbG = g; s.bulbB = bl
  }

  // ── Bass pulse (additive, gentle) ─────────────────────────

  private applyBassPulse(b: FrequencyBands) {
    if (b.bassEnergy > 0.25 && this.scene !== 'dialogue' && this.scene !== 'silence') {
      this.target.bassPulse = Math.min((b.bassEnergy - 0.25) * 0.32, 0.08)
    } else {
      this.target.bassPulse = 0
    }
  }

  // ── Right wall delay ──────────────────────────────────────

  private applyRightDelay(now: number) {
    this.rightWallDelay.push({ v: this.target.wallLeft, t: now })
    while (this.rightWallDelay.length > 0 && now - this.rightWallDelay[0].t > 100) {
      this.rightWallDelay.shift()
    }
    if (this.rightWallDelay.length > 0) {
      this.target.wallRight = this.rightWallDelay[0].v
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private setBeams(values: number[]) {
    this.target.beams = values.map(v => Math.min(v, 0.20))
  }

  private setBulbs(brightness: number, maxActive: number) {
    const b = Math.min(brightness, 0.60)
    if (maxActive === 0) {
      this.target.bulbs = Array(8).fill(0)
      return
    }
    // Only 1–3 bulbs active, staggered
    const active = this.activeBulbs
    this.target.bulbs = Array(8).fill(0).map((_, i) => active.includes(i) ? b : 0)
  }

  private rotateBulbPattern(maxActive: number) {
    const now = performance.now()
    if (now - this.bulbPatternTimer < 120) return
    this.bulbPatternTimer = now
    const patterns = [
      [0,1,2],[3,4,5],[6,7,0],[1,3,5],[0,4,7],[2,5,7],
      [0,3],[1,4],[2,5],[0,7],[3,6],[1,6],
      [0],[3],[6],[1],[4],[7],[2],[5],
    ]
    this.bulbPatternIdx = (this.bulbPatternIdx + 1) % patterns.length
    this.activeBulbs = patterns[this.bulbPatternIdx].slice(0, maxActive)
  }

  onEnded() { this.scene = 'credits'; this.candidate = 'credits'; this.candidateFrames = 10 }

  reset() {
    this.scene = 'silence'; this.candidate = 'silence'
    this.candidateFrames = 0; this.buildRamp = 0
    this.target = this.defaultState()
  }

  private defaultState(): CinemaState {
    return {
      borderR:255, borderG:255, borderB:255,
      borderOpacity:0, borderSpread:0, borderBlur:0,
      wallLeft:0, wallRight:0, wallTop:0, wallBottom:0,
      cornerTL:0, cornerTR:0, cornerBL:0, cornerBR:0,
      ceiling:0,
      beams: Array(6).fill(0),
      bulbs: Array(8).fill(0),
      bulbR:255, bulbG:255, bulbB:255,
      flash:0, flashR:247, flashG:250, flashB:255,
      sparkle:0, bassPulse:0,
    }
  }
}
