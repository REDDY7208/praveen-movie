/**
 * EffectManager — Disco Theater Mode
 * Full club-style lighting: beat-synced bulbs, color strobes,
 * rotating beam sweeps, wall floods, floor bounce.
 */

import type { FrequencyBands } from './types'
import type { LightController } from './LightController'

// 8 vivid disco palettes — each has [primary, secondary, accent]
const PALETTES: Array<[[number,number,number],[number,number,number],[number,number,number]]> = [
  [[255,0,80],   [0,220,255],  [255,220,0]],   // red / cyan / yellow
  [[180,0,255],  [0,255,120],  [255,100,0]],   // purple / green / orange
  [[0,180,255],  [255,0,160],  [0,255,80]],    // blue / pink / lime
  [[255,160,0],  [0,80,255],   [255,0,120]],   // amber / blue / hot-pink
  [[0,255,200],  [255,50,50],  [200,0,255]],   // teal / red / violet
]

// 16 bulb flash patterns — indexed by beat counter
const PATTERNS: number[][] = [
  [0,2,4,6], [1,3,5,7], [0,1,2,3], [4,5,6,7],
  [0,3,5,6], [1,2,4,7], [0,4],     [1,5],
  [2,6],     [3,7],     [0,1,6,7], [2,3,4,5],
  [0,2,5,7], [1,3,4,6], [0,7],     [1,2,3,4,5,6],
]

type Scene = 'silence' | 'quiet' | 'groove' | 'buildup' | 'drop' | 'impact'

export class EffectManager {
  private lc: LightController
  private scene: Scene = 'silence'
  private sceneCandidate: Scene = 'silence'
  private sceneFrames = 0
  private readonly HYSTERESIS = 6

  // Beat tracking
  private beatCount = 0
  private lastBeatTime = 0
  private patternIdx = 0
  private activePattern: number[] = []

  // Strobe / flash
  private strobeUntil = 0
  private flashUntil  = 0

  // Buildup ramp
  private buildLevel = 0

  // Beam rotation angle (degrees, advances each beat)
  private beamAngle = 0

  // Per-beat color index (cycles through palette entries)
  private colorPhase = 0

  constructor(lc: LightController) { this.lc = lc }

  update(b: FrequencyBands, videoTime: number, now: number) {
    const scene = this.detectScene(b)
    this.handleBeat(b, now)
    this.applyScene(scene, b, videoTime, now)
  }

  // ── Scene detection ───────────────────────────────────────
  private detectScene(b: FrequencyBands): Scene {
    let cand: Scene
    if      (b.loudness < 0.015)                           cand = 'silence'
    else if (b.peak && b.bassEnergy > 0.55)                cand = 'impact'
    else if (b.bassEnergy > 0.45 && b.loudness > 0.40)    cand = 'drop'
    else if (b.loudness > 0.28)                            cand = 'buildup'
    else if (b.loudness > 0.10)                            cand = 'groove'
    else                                                   cand = 'quiet'

    if (cand !== this.sceneCandidate) { this.sceneCandidate = cand; this.sceneFrames = 0 }
    else this.sceneFrames++
    if (this.sceneFrames >= this.HYSTERESIS) this.scene = cand
    return this.scene
  }

  // ── Beat handling — advances patterns, rotates beams ──────
  private handleBeat(b: FrequencyBands, now: number) {
    const minGap = this.scene === 'drop' ? 60 : this.scene === 'buildup' ? 90 : 140
    if (b.beat && now - this.lastBeatTime > minGap) {
      this.lastBeatTime = now
      this.beatCount++
      this.patternIdx  = (this.patternIdx + 1) % PATTERNS.length
      this.activePattern = PATTERNS[this.patternIdx]
      this.beamAngle   = (this.beamAngle + 45) % 360
      this.colorPhase  = (this.colorPhase + 1) % 3   // cycle primary/secondary/accent
    }
    // Impact strobe
    if (b.peak && now - this.strobeUntil > 200) {
      this.strobeUntil = now + 120
      this.flashUntil  = now + 80
    }
  }

  // ── Main scene → light state ──────────────────────────────
  private applyScene(scene: Scene, b: FrequencyBands, videoTime: number, now: number) {
    const palIdx  = Math.floor(videoTime / 480) % PALETTES.length
    const palette = PALETTES[palIdx]
    const [pr, pg, pb] = palette[this.colorPhase % 3]
    const [sr, sg, sb] = palette[(this.colorPhase + 1) % 3]
    const [ar, ag, ab] = palette[(this.colorPhase + 2) % 3]

    const strobe = now < this.strobeUntil
    const flash  = now < this.flashUntil

    switch (scene) {

      case 'silence':
        this.buildLevel = 0
        this.lc.setTarget({
          glowOpacity:0, glowSpread:0, glowBlur:0,
          topOp:0, bottomOp:0, leftOp:0, rightOp:0,
          sparkle:0, flash:0,
        })
        this.lc.setTargetBulbs(Array(8).fill(0))
        break

      case 'quiet': {
        // Slow breathing glow — all bulbs dim, gentle pulse
        const breath = 0.06 + b.midEnergy * 0.18
        this.lc.setTarget({
          glowR:pr, glowG:pg, glowB:pb,
          glowOpacity: breath * 0.6,
          glowSpread:  6 + b.bassEnergy * 8,
          glowBlur:    20 + b.bassEnergy * 20,
          topR:pr,    topG:pg,    topB:pb,    topOp: breath * 0.4,
          bottomR:sr, bottomG:sg, bottomB:sb, bottomOp: breath * 0.35,
          leftR:ar,   leftG:ag,   leftB:ab,   leftOp: breath * 0.2,
          rightR:pr,  rightG:pg,  rightB:pb,  rightOp: breath * 0.2,
          sparkle: b.air1 * 0.3, flash: 0,
        })
        this.lc.setTargetBulbs(Array(8).fill(breath * 0.5))
        break
      }

      case 'groove': {
        // Mid-energy — beat-synced bulb patterns, colored walls
        const bass  = b.bassEnergy
        const bulbs = Array(8).fill(0).map((_, i) =>
          this.activePattern.includes(i) ? 0.55 + bass * 0.45 : bass * 0.15
        )
        this.lc.setTarget({
          glowR:pr, glowG:pg, glowB:pb,
          glowOpacity: 0.25 + bass * 0.35,
          glowSpread:  8 + bass * 18,
          glowBlur:    22 + bass * 28,
          topR:pr,    topG:pg,    topB:pb,    topOp: 0.30 + bass * 0.35,
          bottomR:sr, bottomG:sg, bottomB:sb, bottomOp: 0.35 + b.sub1 * 0.45,
          leftR:ar,   leftG:ag,   leftB:ab,   leftOp: 0.20 + bass * 0.28,
          rightR:sr,  rightG:sg,  rightB:sb,  rightOp: 0.20 + bass * 0.28,
          sparkle: b.high1 * 0.45, flash: 0,
        })
        this.lc.setTargetBulbs(bulbs)
        break
      }

      case 'buildup': {
        this.buildLevel = Math.min(this.buildLevel + 0.008, Math.max(b.loudness, this.buildLevel))
        const lvl   = this.buildLevel
        const bass  = b.bassEnergy
        // All 8 bulbs ramp up progressively
        const bulbs = Array(8).fill(0).map((_, i) =>
          Math.max(0, lvl * 1.2 - i * (1 / 10))
        )
        this.lc.setTarget({
          glowR:pr, glowG:pg, glowB:pb,
          glowOpacity: 0.30 + lvl * 0.65,
          glowSpread:  10 + lvl * 35,
          glowBlur:    24 + lvl * 55,
          topR:pr,    topG:pg,    topB:pb,    topOp: 0.25 + lvl * 0.65,
          bottomR:sr, bottomG:sg, bottomB:sb, bottomOp: 0.28 + lvl * 0.70,
          leftR:ar,   leftG:ag,   leftB:ab,   leftOp: 0.20 + lvl * 0.55,
          rightR:sr,  rightG:sg,  rightB:sb,  rightOp: 0.20 + lvl * 0.55,
          sparkle: b.high1 * lvl * 0.55, flash: 0,
        })
        this.lc.setTargetBulbs(bulbs)
        break
      }

      case 'drop': {
        this.buildLevel = 1
        const bass  = b.bassEnergy
        const mid   = b.midEnergy
        // Alternating bulb colors between primary and secondary
        const bulbs = Array(8).fill(0).map((_, i) =>
          this.activePattern.includes(i)
            ? 0.85 + bass * 0.15
            : 0.20 + bass * 0.25
        )
        this.lc.setTarget({
          glowR: strobe ? 255 : pr, glowG: strobe ? 255 : pg, glowB: strobe ? 255 : pb,
          glowOpacity: strobe ? 0.95 : 0.55 + bass * 0.40,
          glowSpread:  strobe ? 50  : 14 + bass * 38,
          glowBlur:    strobe ? 80  : 28 + bass * 55,
          topR:pr,    topG:pg,    topB:pb,    topOp: 0.55 + bass * 0.40,
          bottomR:sr, bottomG:sg, bottomB:sb, bottomOp: 0.60 + b.sub1 * 0.40,
          leftR:ar,   leftG:ag,   leftB:ab,   leftOp: 0.45 + bass * 0.40,
          rightR:sr,  rightG:sg,  rightB:sb,  rightOp: 0.45 + bass * 0.40,
          sparkle: b.trebleEnergy * 0.65,
          flash: flash ? 0.35 : strobe ? 0.15 : 0,
        })
        this.lc.setTargetBulbs(bulbs)
        break
      }

      case 'impact': {
        const on    = strobe || flash
        const bulbs = Array(8).fill(on ? 1.0 : 0.5)
        this.lc.setTarget({
          glowR:255, glowG:255, glowB:255,
          glowOpacity: on ? 1.0 : 0.55,
          glowSpread:  on ? 60  : 28,
          glowBlur:    on ? 90  : 45,
          topOp: on ? 0.90 : 0.50,     topR:255, topG:255, topB:255,
          bottomOp: on ? 1.0 : 0.60,   bottomR:255, bottomG:255, bottomB:255,
          leftOp:  on ? 0.80 : 0.45,   leftR:255, leftG:255, leftB:255,
          rightOp: on ? 0.80 : 0.45,   rightR:255, rightG:255, rightB:255,
          sparkle: 0,
          flash: flash ? 0.55 : strobe ? 0.25 : 0,
        })
        this.lc.setTargetBulbs(bulbs)
        break
      }
    }
  }

  onEnded() {
    this.scene = 'silence'; this.sceneCandidate = 'silence'; this.sceneFrames = 10
  }

  reset() {
    this.scene = 'silence'; this.sceneCandidate = 'silence'
    this.sceneFrames = 0; this.buildLevel = 0
    this.beatCount = 0; this.patternIdx = 0
    this.activePattern = []; this.colorPhase = 0; this.beamAngle = 0
  }
}
