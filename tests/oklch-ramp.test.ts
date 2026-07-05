import { describe, it, expect } from 'vitest'
import {
  buildRamp,
  reflectIndex,
  contrastRatio,
  relLuminance,
  RAMP_STOPS,
  THEME_PRESETS,
} from '../src/oklch-ramp'

const N = RAMP_STOPS - 1

// Semantic roles by ramp index for the DARK theme. Light = reflect i -> N-i.
const ROLES = {
  pageBg: 0,
  surface: 1,
  surfaceRaised: 2,
  border: 4,
  textTertiary: 6,
  textSecondary: 8,
  textPrimary: 10,
} as const

const TEXT_PAIRS: [keyof typeof ROLES, keyof typeof ROLES][] = [
  ['textPrimary', 'pageBg'],
  ['textPrimary', 'surface'],
  ['textSecondary', 'surface'],
]

const blue = () => buildRamp(THEME_PRESETS.jogi.chromeHue, THEME_PRESETS.jogi.chromeChroma)

describe('oklch ramp generator', () => {
  it('chroma 0 produces a neutral gray ramp (R=G=B at every stop)', () => {
    const gray = buildRamp(THEME_PRESETS.edictus.chromeHue, 0)
    for (const [r, g, b] of gray) {
      expect(r).toBe(g)
      expect(g).toBe(b)
    }
  })

  it('gray default shares structure with the blue preset (same stop count, monotonic lightness)', () => {
    const gray = buildRamp(THEME_PRESETS.edictus.chromeHue, 0)
    expect(gray).toHaveLength(blue().length)
    for (let i = 1; i < gray.length; i++) {
      expect(relLuminance(gray[i])).toBeGreaterThan(relLuminance(gray[i - 1]))
    }
  })
})

describe('dark <-> light = ramp index reflection', () => {
  it('preserves text contrast across the mirror (never reversed, within tolerance)', () => {
    const ramp = blue()
    for (const [fg, bg] of TEXT_PAIRS) {
      const dark = contrastRatio(ramp[ROLES[fg]], ramp[ROLES[bg]])
      const light = contrastRatio(ramp[reflectIndex(ROLES[fg], N)], ramp[reflectIndex(ROLES[bg], N)])
      // WCAG-luminance nonlinearity keeps these within ~1.6 ratio points.
      expect(Math.abs(dark - light)).toBeLessThan(2)
    }
  })

  it('a center-symmetric pair (textPrimary/pageBg) reflects exactly', () => {
    const ramp = blue()
    const dark = contrastRatio(ramp[ROLES.textPrimary], ramp[ROLES.pageBg])
    const light = contrastRatio(
      ramp[reflectIndex(ROLES.textPrimary, N)],
      ramp[reflectIndex(ROLES.pageBg, N)],
    )
    expect(light).toBeCloseTo(dark, 10)
  })

  it('primary text passes AA (>=4.5) in BOTH dark and reflected-light', () => {
    const ramp = blue()
    const darkPass = contrastRatio(ramp[ROLES.textPrimary], ramp[ROLES.pageBg])
    const lightPass = contrastRatio(
      ramp[reflectIndex(ROLES.textPrimary, N)],
      ramp[reflectIndex(ROLES.pageBg, N)],
    )
    expect(darkPass).toBeGreaterThanOrEqual(4.5)
    expect(lightPass).toBeGreaterThanOrEqual(4.5)
  })
})
