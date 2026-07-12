/**
 * LightController
 * Manages a set of named CSS custom properties on a target DOM element.
 * Applies eased transitions so values never jump abruptly.
 */

export interface LightState {
  // Border glow
  glowR:      number  // 0–255
  glowG:      number  // 0–255
  glowB:      number  // 0–255
  glowOpacity: number // 0–1
  glowSpread:  number // px
  glowBlur:    number // px

  // Ambient room haze (top/bottom beams)
  topR:    number; topG:    number; topB:    number; topOp:    number
  bottomR: number; bottomG: number; bottomB: number; bottomOp: number

  // Side wall lighting
  leftR:  number; leftG:  number; leftB:  number; leftOp:  number
  rightR: number; rightG: number; rightB: number; rightOp: number

  // Disco bulbs (up to 8) — brightness multiplier 0–1
  bulbs: number[]

  // Sparkle / shimmer overlay opacity
  sparkle: number

  // White flash overlay (for impacts)
  flash: number
}

export interface LightControllerConfig {
  /** Easing speed for slow transitions (lower = slower). Default 0.06 */
  slowEase?: number
  /** Easing speed for fast transitions (impacts). Default 0.35 */
  fastEase?: number
}

export class LightController {
  private current: LightState
  private target:  LightState
  private cfg: Required<LightControllerConfig>

  constructor(cfg: LightControllerConfig = {}) {
    this.cfg = {
      slowEase: cfg.slowEase ?? 0.06,
      fastEase: cfg.fastEase ?? 0.35,
    }
    this.current = this.defaultState()
    this.target  = this.defaultState()
  }

  /** Set target light state — values ease toward this over time. */
  setTarget(patch: Partial<LightState>) {
    Object.assign(this.target, patch)
  }

  setTargetBulbs(bulbs: number[]) {
    this.target.bulbs = bulbs
  }

  /**
   * Step the controller one frame.
   * Call this every requestAnimationFrame tick.
   * @param fast  Use fast easing (for impacts/flashes)
   */
  step(fast = false): LightState {
    const a = fast ? this.cfg.fastEase : this.cfg.slowEase

    // Ease all scalar values
    const scalars: (keyof Omit<LightState, 'bulbs'>)[] = [
      'glowR','glowG','glowB','glowOpacity','glowSpread','glowBlur',
      'topR','topG','topB','topOp',
      'bottomR','bottomG','bottomB','bottomOp',
      'leftR','leftG','leftB','leftOp',
      'rightR','rightG','rightB','rightOp',
      'sparkle','flash',
    ]

    for (const k of scalars) {
      const c = this.current[k] as number
      const t = this.target[k]  as number
      ;(this.current as any)[k] = c + (t - c) * a
    }

    // Ease bulbs
    const maxBulbs = Math.max(this.current.bulbs.length, this.target.bulbs.length)
    for (let i = 0; i < maxBulbs; i++) {
      const c = this.current.bulbs[i] ?? 0
      const t = this.target.bulbs[i]  ?? 0
      if (this.current.bulbs.length <= i) this.current.bulbs.push(c)
      this.current.bulbs[i] = c + (t - c) * a
    }

    return { ...this.current, bulbs: [...this.current.bulbs] }
  }

  /**
   * Apply the current state to DOM elements via inline styles / CSS vars.
   * @param glowEl     The glow border element (inset box-shadow)
   * @param topEl      Top ambient beam element
   * @param bottomEl   Bottom ambient beam element
   * @param leftEl     Left wall beam element
   * @param rightEl    Right wall beam element
   * @param bulbEls    Array of disco bulb elements
   * @param flashEl    Full-screen white flash overlay
   * @param sparkleEl  Sparkle shimmer overlay
   */
  apply(
    glowEl:    HTMLElement | null,
    topEl:     HTMLElement | null,
    bottomEl:  HTMLElement | null,
    leftEl:    HTMLElement | null,
    rightEl:   HTMLElement | null,
    bulbEls:   (HTMLElement | null)[],
    flashEl:   HTMLElement | null,
    sparkleEl: HTMLElement | null,
    s = this.current,
  ) {
    // ── Border glow ──────────────────────────────────────
    if (glowEl) {
      const c = `rgba(${Math.round(s.glowR)},${Math.round(s.glowG)},${Math.round(s.glowB)},${s.glowOpacity.toFixed(3)})`
      const sp = s.glowSpread.toFixed(1)
      const bl = s.glowBlur.toFixed(1)
      glowEl.style.boxShadow = s.glowOpacity > 0.01
        ? `inset 0 0 ${bl}px ${sp}px ${c}, 0 0 ${bl}px ${sp}px ${c.replace(/[\d.]+\)$/, (s.glowOpacity * 0.4).toFixed(3) + ')')}`
        : 'none'
    }

    // ── Ambient beams ────────────────────────────────────
    this.applyBeam(topEl,    s.topR,    s.topG,    s.topB,    s.topOp)
    this.applyBeam(bottomEl, s.bottomR, s.bottomG, s.bottomB, s.bottomOp)
    this.applyBeam(leftEl,   s.leftR,   s.leftG,   s.leftB,   s.leftOp)
    this.applyBeam(rightEl,  s.rightR,  s.rightG,  s.rightB,  s.rightOp)

    // ── Disco bulbs — apply() only sets opacity/scale, VideoPlayer handles color ──
    bulbEls.forEach((el, i) => {
      if (!el) return
      const brightness = s.bulbs[i] ?? 0
      el.style.opacity = brightness.toFixed(3)
      // Preserve the translate(-50%,-50%) centering set in CSS/VideoPlayer
      el.style.transform = `translate(-50%, -50%) scale(${0.5 + brightness * 1.2})`
    })

    // ── Flash ────────────────────────────────────────────
    if (flashEl) {
      flashEl.style.opacity = s.flash.toFixed(3)
      flashEl.style.pointerEvents = s.flash > 0.01 ? 'none' : 'none'
    }

    // ── Sparkle ──────────────────────────────────────────
    if (sparkleEl) {
      sparkleEl.style.opacity = s.sparkle.toFixed(3)
    }
  }

  private applyBeam(el: HTMLElement | null, r: number, g: number, b: number, op: number) {
    if (!el) return
    el.style.opacity = op.toFixed(3)
    el.style.background = `radial-gradient(ellipse at center, rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.9) 0%, transparent 70%)`
  }

  reset() {
    this.current = this.defaultState()
    this.target  = this.defaultState()
  }

  private defaultState(): LightState {
    return {
      glowR:0, glowG:0, glowB:0, glowOpacity:0, glowSpread:0, glowBlur:0,
      topR:255, topG:200, topB:100, topOp:0,
      bottomR:255, bottomG:120, bottomB:40, bottomOp:0,
      leftR:100, leftG:80, leftB:255, leftOp:0,
      rightR:255, rightG:80, rightB:100, rightOp:0,
      sparkle:0, flash:0,
      bulbs: Array(8).fill(0),
    }
  }
}
