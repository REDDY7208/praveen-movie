/**
 * EffectManager — Theater 1: Disco mode
 * High-energy, beat-synced, color-reactive lighting.
 * Used when user selects "Disco Theater" mode.
 */

import type { FrequencyBands } from './types'
import type { LightController } from './LightController'

const THEMES: Array<[number,number,number]> = [
  [255, 30,  100],  // hot pink
  [0,   200, 255],  // cyan
  [180, 0,   255],  // purple
  [255, 160, 0  ],  // amber
  [0,   255, 120],  // green
]

type SceneType = 'silence' | 'dialogue' | 'softBgm' | 'buildup' | 'action' | 'impact' | 'credits'

export class EffectManager {
  private lc: LightController
  private scene: SceneType = 'silence'
  private sceneCandidate: SceneType = 'silence'
  private sceneFrames = 0
  private readonly HYSTERESIS = 8
  private buildupLevel = 0
  private impactFlashUntil = 0
  private attackFlashUntil = 0
  private lastBeatTime = 0
  private beatColorIdx = 0

  constructor(lc: LightController) { this.lc = lc }

  update(b: FrequencyBands, videoTime: number, now: number) {
    const scene = this.detectScene(b, now)
    this.applyScene(scene, b, videoTime, now)
  }

  private detectScene(b: FrequencyBands, now: number): SceneType {
    const energy = b.bassEnergy
    let cand: SceneType

    if (b.loudness < 0.02)                                     cand = 'silence'
    else if (b.peak && b.bassEnergy > 0.60)                    cand = 'impact'
    else if (b.bassEnergy > 0.50 && b.loudness > 0.45)         cand = 'action'
    else if (b.mid1 > 0.18 && b.bassEnergy < b.midEnergy * 0.8) cand = 'dialogue'
    else if (b.loudness > 0.30)                                cand = 'buildup'
    else if (b.loudness > 0.08)                                cand = 'softBgm'
    else                                                       cand = 'silence'

    if (cand !== this.sceneCandidate) { this.sceneCandidate = cand; this.sceneFrames = 0 }
    else this.sceneFrames++
    if (this.sceneFrames >= this.HYSTERESIS) this.scene = cand
    return this.scene
  }

  private applyScene(scene: SceneType, b: FrequencyBands, videoTime: number, now: number) {
    const themeIdx = Math.floor(videoTime / 600) % THEMES.length
    const [tr, tg, tb] = THEMES[themeIdx]
    const impactFlash = now < this.impactFlashUntil
    const attackFlash = now < this.attackFlashUntil

    switch (scene) {
      case 'silence':
        this.lc.setTarget({ glowOpacity:0, glowSpread:0, glowBlur:0, topOp:0.03, bottomOp:0.03, leftOp:0.02, rightOp:0.02, sparkle:0, flash:0 })
        this.lc.setTargetBulbs(Array(8).fill(0))
        break

      case 'dialogue':
        this.lc.setTarget({ glowR:255, glowG:200, glowB:100, glowOpacity:0.12, glowSpread:5, glowBlur:18, topR:255, topG:220, topB:160, topOp:0.15, bottomOp:0.08, leftOp:0.05, rightOp:0.05, sparkle:0, flash:0 })
        this.lc.setTargetBulbs(Array(8).fill(0.05))
        break

      case 'softBgm': {
        const breath = 0.08 + b.midEnergy * 0.20
        this.lc.setTarget({ glowR:tr, glowG:tg, glowB:tb, glowOpacity:breath, glowSpread:4+b.bassEnergy*10, glowBlur:14+b.bassEnergy*18, topR:tr, topG:tg, topB:tb, topOp:breath*0.6, bottomR:tr, bottomG:tg, bottomB:tb, bottomOp:breath*0.4, leftR:tr, leftG:tg, leftB:tb, leftOp:breath*0.2, rightR:tr, rightG:tg, rightB:tb, rightOp:breath*0.2, sparkle:b.air1*0.25, flash:0 })
        this.lc.setTargetBulbs(Array(8).fill(b.midEnergy * 0.25))
        break
      }

      case 'buildup': {
        this.buildupLevel = Math.min(this.buildupLevel + 0.006, b.loudness)
        const lvl = this.buildupLevel
        this.lc.setTarget({ glowR:tr, glowG:tg, glowB:tb, glowOpacity:0.18+lvl*0.55, glowSpread:7+lvl*28, glowBlur:18+lvl*45, topR:tr, topG:tg, topB:tb, topOp:0.10+lvl*0.45, bottomR:tr, bottomG:tg, bottomB:tb, bottomOp:0.08+lvl*0.35, leftR:tr, leftG:tg, leftB:tb, leftOp:lvl*0.30, rightR:tr, rightG:tg, rightB:tb, rightOp:lvl*0.30, sparkle:b.high1*lvl*0.4, flash:0 })
        this.lc.setTargetBulbs(Array.from({length:8},(_,i) => Math.max(0, lvl - i*(1/8))))
        break
      }

      case 'action': {
        this.buildupLevel = 1
        if (b.beat && now - this.lastBeatTime > 80) { this.lastBeatTime = now; this.beatColorIdx = (this.beatColorIdx+1)%3 }
        const intensity = b.bassEnergy * 1.1
        this.lc.setTarget({ glowR:tr, glowG:tg, glowB:tb, glowOpacity:0.28+intensity*0.65, glowSpread:9+intensity*32, glowBlur:18+intensity*50, topR:tr, topG:tg, topB:tb, topOp:0.18+b.sub1*0.55, bottomR:tr, bottomG:tg, bottomB:tb, bottomOp:0.18+b.sub2*0.65, leftR:tr, leftG:tg, leftB:tb, leftOp:0.12+b.bass1*0.45, rightR:tr, rightG:tg, rightB:tb, rightOp:0.12+b.bass1*0.45, sparkle:b.high1*0.55, flash:attackFlash?0.10:0 })
        this.lc.setTargetBulbs(Array.from({length:8},(_,i) => Math.max(0, b.bassEnergy - (i%4)*0.06)*1.1))
        if (b.mid2 > 0.55 && now - this.attackFlashUntil > 200) this.attackFlashUntil = now + 80
        break
      }

      case 'impact': {
        if (b.peak && now - this.impactFlashUntil > 300) this.impactFlashUntil = now + 150
        const fa = impactFlash ? 0.65 + b.sub1*0.35 : 0
        this.lc.setTarget({ glowR:255, glowG:255, glowB:255, glowOpacity:impactFlash?0.85:0.4, glowSpread:impactFlash?38:18, glowBlur:impactFlash?75:35, topOp:fa*0.75, bottomOp:fa*0.85, leftOp:fa*0.55, rightOp:fa*0.55, flash:fa*0.28, sparkle:0 })
        this.lc.setTargetBulbs(Array(8).fill(fa))
        break
      }

      case 'credits':
        this.lc.setTarget({ glowR:200, glowG:200, glowB:255, glowOpacity:0.07, glowSpread:3, glowBlur:18, topOp:0.05, bottomOp:0.05, leftOp:0.03, rightOp:0.03, sparkle:0.04, flash:0 })
        this.lc.setTargetBulbs(Array(8).fill(0.03))
        break
    }

    // Sub-bass room pulse (additive)
    if (b.sub1 > 0.28 && scene !== 'dialogue' && scene !== 'silence') {
      const pulse = (b.sub1 - 0.28) / 0.72
      this.lc.setTarget({ bottomOp: Math.min(((this.lc as any)._target?.bottomOp ?? 0) + pulse*0.28, 1) })
    }
  }

  onEnded() { this.scene = 'credits'; this.sceneCandidate = 'credits'; this.sceneFrames = 10 }
  reset()   { this.scene = 'silence'; this.buildupLevel = 0; this.sceneFrames = 0; this.sceneCandidate = 'silence' }
}
