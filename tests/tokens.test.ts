import { describe, it, expect } from 'vitest'
import { buildThemeTokens, THEME_SPECS, customSpec, resolveThemeSpec } from '../src/tokens'
import { hexToHue } from '../src/validate'
import { contrastRatio, relLuminance, type Rgb } from '../src/oklch-ramp'

const parse = (triplet: string): Rgb => triplet.split(' ').map(Number) as unknown as Rgb
const maxDelta = (a: Rgb, b: Rgb) => Math.max(...a.map((x, i) => Math.abs(x - b[i])))

// The canonical Jogi-blue ramp — the output of the named `jogi` preset. No longer
// the styles/tokens.css `:root` default (that is now neutral gray, see GRAY below);
// kept here so the jogi preset's generator output stays pinned.
const TODAY: Record<string, Rgb> = {
  '--surface-0': [22, 36, 61],
  '--surface-1': [39, 52, 76],
  '--surface-2': [61, 75, 101],
  '--surface-3': [81, 96, 120],
  '--surface-4': [112, 127, 152],
  '--region-sidebar': [32, 46, 69],
  '--region-canvas': [18, 29, 47],
  '--region-panel': [28, 40, 62],
  '--theme-50': [240, 249, 255],
  '--theme-100': [224, 242, 254],
  '--theme-200': [186, 230, 253],
  '--theme-300': [125, 211, 252],
  '--theme-400': [56, 189, 248],
  '--theme-500': [14, 165, 233],
  '--theme-600': [2, 132, 199],
  '--theme-700': [3, 105, 161],
  '--theme-800': [7, 89, 133],
  '--theme-900': [12, 74, 110],
  '--theme-950': [8, 47, 73],
  '--brand': [56, 189, 248],
  '--brand-hover': [14, 165, 233],
}

describe('jogi preset — canonical blue ramp (generator regression)', () => {
  const tokens = buildThemeTokens(THEME_SPECS.jogi)

  it('accent ramp + brand match exactly', () => {
    for (const key of Object.keys(TODAY)) {
      if (key.startsWith('--surface') || key.startsWith('--region')) continue
      expect(maxDelta(parse(tokens[key]), TODAY[key]), key).toBe(0)
    }
  })

  it('surface ladder matches within rounding tolerance (<=1)', () => {
    for (const key of Object.keys(TODAY)) {
      if (!key.startsWith('--surface') && !key.startsWith('--region')) continue
      expect(maxDelta(parse(tokens[key]), TODAY[key]), key).toBeLessThanOrEqual(1)
    }
  })
})

describe('edictus gray preset is fully neutral', () => {
  const tokens = buildThemeTokens(THEME_SPECS.edictus)

  it('every generated surface and accent stop is achromatic (R=G=B)', () => {
    for (const [key, val] of Object.entries(tokens)) {
      if (key === '--brand-contrast' || key === '--brand-on') continue // intentionally slate/white
      const [r, g, b] = parse(val)
      expect(r, key).toBe(g)
      expect(g, key).toBe(b)
    }
  })
})

// Verbatim from styles/tokens.css — the NEW neutral-gray default baseline (`:root`
// and `:root[data-theme="light"]`). Pins the hand-pasted CSS to the generator so
// they cannot silently drift from buildThemeTokens(edictus, ...).
const GRAY: Record<string, Rgb> = {
  '--theme-50': [247, 247, 247], '--theme-100': [239, 239, 239], '--theme-200': [222, 222, 222],
  '--theme-300': [198, 198, 198], '--theme-400': [175, 175, 175], '--theme-500': [154, 154, 154],
  '--theme-600': [124, 124, 124], '--theme-700': [99, 99, 99], '--theme-800': [83, 83, 83],
  '--theme-900': [69, 69, 69], '--theme-950': [44, 44, 44],
  '--surface-0': [36, 36, 36], '--surface-1': [52, 52, 52], '--surface-2': [75, 75, 75],
  '--surface-3': [95, 95, 95], '--surface-4': [126, 126, 126],
  '--region-sidebar': [46, 46, 46], '--region-canvas': [29, 29, 29], '--region-panel': [40, 40, 40],
  '--border-subtle': [162, 162, 162], '--border-strong': [162, 162, 162], '--border-focus': [175, 175, 175],
  '--text-primary': [244, 244, 244], '--text-secondary': [212, 212, 212], '--text-tertiary': [162, 162, 162],
  '--text-inverse': [24, 24, 24], '--text-disabled': [115, 115, 115],
  '--brand': [175, 175, 175], '--brand-hover': [154, 154, 154], '--brand-muted': [175, 175, 175],
  '--brand-contrast': [15, 23, 42], '--brand-on': [15, 23, 42], '--brand-glow': [175, 175, 175],
}
const GRAY_LIGHT: Record<string, Rgb> = {
  '--theme-50': [6, 6, 6], '--theme-100': [11, 11, 11], '--theme-200': [22, 22, 22],
  '--theme-300': [39, 39, 39], '--theme-400': [57, 57, 57], '--theme-500': [76, 76, 76],
  '--theme-600': [103, 103, 103], '--theme-700': [128, 128, 128], '--theme-800': [145, 145, 145],
  '--theme-900': [161, 161, 161], '--theme-950': [192, 192, 192],
  '--surface-0': [238, 238, 238], '--surface-1': [241, 241, 241], '--surface-2': [246, 246, 246],
  '--surface-3': [250, 250, 250], '--surface-4': [255, 255, 255],
  '--region-sidebar': [230, 230, 230], '--region-canvas': [222, 222, 222], '--region-panel': [227, 227, 227],
  '--border-subtle': [69, 69, 69], '--border-strong': [69, 69, 69], '--border-focus': [57, 57, 57],
  '--text-primary': [8, 8, 8], '--text-secondary': [29, 29, 29], '--text-tertiary': [69, 69, 69],
  '--text-inverse': [219, 219, 219], '--text-disabled': [112, 112, 112],
  '--brand': [57, 57, 57], '--brand-hover': [76, 76, 76], '--brand-muted': [57, 57, 57],
  '--brand-contrast': [255, 255, 255], '--brand-on': [255, 255, 255], '--brand-glow': [57, 57, 57],
}

describe('edictus gray reproduces the styles/tokens.css default baseline (parity)', () => {
  it('dark :root matches buildThemeTokens(edictus, dark) exactly', () => {
    const tokens = buildThemeTokens(THEME_SPECS.edictus, 'dark')
    for (const key of Object.keys(GRAY)) {
      expect(maxDelta(parse(tokens[key]), GRAY[key]), key).toBe(0)
    }
  })
  it('light :root[data-theme="light"] matches buildThemeTokens(edictus, light) exactly', () => {
    const tokens = buildThemeTokens(THEME_SPECS.edictus, 'light')
    for (const key of Object.keys(GRAY_LIGHT)) {
      expect(maxDelta(parse(tokens[key]), GRAY_LIGHT[key]), key).toBe(0)
    }
  })
})

describe('light two-band remap — chrome stays clearly grayer than the surfaces', () => {
  // The region backdrops (canvas/sidebar/panel) must occupy a band strictly BELOW
  // the surface ladder so the shell's mild bg-surface-2/x active fills read against
  // the gray chrome. A single near-white band (regions ≈ surfaces) was the rejected
  // "everything looks white" failure. See docs/ref/theme-contrast.md.
  const regionKeys = ['--region-canvas', '--region-sidebar', '--region-panel']
  const surfaceKeys = ['--surface-0', '--surface-1', '--surface-2', '--surface-3', '--surface-4']
  const specs = [
    ['edictus', THEME_SPECS.edictus],
    ['jogi', THEME_SPECS.jogi],
    ['myv-orange', resolveThemeSpec('#fd5d03', true)],
  ] as const

  it('every region sits below every surface in light (bands do not overlap)', () => {
    for (const [name, spec] of specs) {
      const t = buildThemeTokens(spec, 'light')
      const maxRegion = Math.max(...regionKeys.map(k => relLuminance(parse(t[k]))))
      const minSurface = Math.min(...surfaceKeys.map(k => relLuminance(parse(t[k]))))
      // strictly apart, with a margin so a mild surface fill stays visible on chrome
      expect(minSurface - maxRegion, name).toBeGreaterThan(0.02)
    }
  })

  it('surface ladder is monotonic in light (canvas-side grayest → most-raised whitest)', () => {
    for (const [name, spec] of specs) {
      const t = buildThemeTokens(spec, 'light')
      const lums = surfaceKeys.map(k => relLuminance(parse(t[k])))
      for (let i = 1; i < lums.length; i++) {
        expect(lums[i], `${name} ${surfaceKeys[i]}`).toBeGreaterThan(lums[i - 1])
      }
    }
  })
})

describe('brand-contrast passes AA for every shipped accent hue', () => {
  // jogi sky, edictus gray, and a sweep of tenant hues incl. MyV orange (#fd5d03).
  const specs = [
    THEME_SPECS.jogi,
    THEME_SPECS.edictus,
    ...[0, 30, 60, 120, 180, 240, 300, hexToHue('#fd5d03')!].map(customSpec),
  ]

  it('brand fill vs --brand-contrast >= 4.5', () => {
    for (const spec of specs) {
      const t = buildThemeTokens(spec)
      const ratio = contrastRatio(parse(t['--brand']), parse(t['--brand-contrast']))
      expect(ratio, `hue ${spec.accentHue}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('--brand-on: conventional white on saturated brand fills, pale-safe', () => {
  const sweep = [
    THEME_SPECS.jogi,
    THEME_SPECS.edictus,
    ...[0, 30, 60, 120, 180, 240, 300, hexToHue('#fd5d03')!].map(customSpec),
  ]

  it('MyV orange → white in light, AA-strict dark in dark (dark unchanged)', () => {
    const dark = buildThemeTokens(resolveThemeSpec('#fd5d03', true), 'dark')
    const light = buildThemeTokens(resolveThemeSpec('#fd5d03', true), 'light')
    expect(dark['--brand-on']).toBe(dark['--brand-contrast']) // dark keeps the AA token
    expect(light['--brand-on']).toBe('255 255 255')           // white CTA in light
  })

  it('clears AA-large (>=3:1) on the brand fill in BOTH modes for every shipped hue', () => {
    for (const spec of sweep) {
      for (const mode of ['dark', 'light'] as const) {
        const t = buildThemeTokens(spec, mode)
        const ratio = contrastRatio(parse(t['--brand']), parse(t['--brand-on']))
        expect(ratio, `${mode} hue ${spec.accentHue}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('a pale (but chromatic) brand falls back to dark — white-on-pale never ships', () => {
    // pale orange #ffd6a5: white-on-it ≈ 1.4 (< 3), so --brand-on must NOT be white
    const t = buildThemeTokens(resolveThemeSpec('#ffd6a5', true), 'light')
    expect(t['--brand-on']).not.toBe('255 255 255')
    expect(contrastRatio(parse(t['--brand']), parse(t['--brand-on'])), 'pale brand').toBeGreaterThanOrEqual(4.5)
  })
})

// The jogi preset's light output — pins buildThemeTokens(jogi, 'light'). No longer
// the styles/tokens.css light default (that is now neutral gray, see GRAY_LIGHT).
const TODAY_LIGHT: Record<string, Rgb> = {
  '--theme-50': [3, 7, 10],
  '--theme-100': [2, 12, 20],
  '--theme-200': [0, 25, 42],
  '--theme-300': [0, 45, 78],
  '--theme-400': [0, 64, 116],
  '--theme-500': [0, 82, 145],
  '--theme-600': [0, 109, 174],
  '--theme-700': [51, 135, 193],
  '--theme-800': [84, 153, 201],
  '--theme-900': [112, 168, 209],
  '--theme-950': [157, 197, 230],
  '--surface-0': [220, 240, 255],
  '--surface-1': [224, 243, 255],
  '--surface-2': [228, 247, 255],
  '--surface-3': [234, 251, 255],
  '--surface-4': [239, 255, 255],
  '--region-sidebar': [213, 231, 255],
  '--region-canvas': [208, 223, 248],
  '--region-panel': [211, 229, 255],
  '--border-subtle': [57, 70, 88],
  '--border-strong': [57, 70, 88],
  '--border-focus': [0, 64, 116],
  '--text-primary': [6, 8, 10],
  '--text-secondary': [23, 30, 38],
  '--text-tertiary': [57, 70, 88],
  '--text-inverse': [207, 220, 247],
  '--text-disabled': [98, 113, 136],
  '--brand': [0, 64, 116],
  '--brand-hover': [0, 82, 145],
  '--brand-muted': [0, 64, 116],
  '--brand-contrast': [255, 255, 255],
  '--brand-glow': [0, 64, 116],
}

describe('jogi preset light output stays pinned (generator regression)', () => {
  const tokens = buildThemeTokens(THEME_SPECS.jogi, 'light')
  it('every generated light var matches the pinned jogi value exactly', () => {
    for (const key of Object.keys(TODAY_LIGHT)) {
      expect(maxDelta(parse(tokens[key]), TODAY_LIGHT[key]), key).toBe(0)
    }
  })
})

describe('edictus gray stays achromatic in light mode too', () => {
  const tokens = buildThemeTokens(THEME_SPECS.edictus, 'light')
  it('every generated surface/accent/text stop is achromatic (R=G=B)', () => {
    for (const [key, val] of Object.entries(tokens)) {
      if (key === '--brand-contrast' || key === '--brand-on') continue // slate/white by design
      const [r, g, b] = parse(val)
      expect(r, key).toBe(g)
      expect(g, key).toBe(b)
    }
  })
})

describe('text + brand contrast pass AA in BOTH modes', () => {
  const specs = [
    THEME_SPECS.jogi,
    THEME_SPECS.edictus,
    ...[0, 30, 60, 120, 180, 240, 300, hexToHue('#fd5d03')!].map(customSpec),
  ]
  const modes = ['dark', 'light'] as const

  it('primary text vs page surfaces >= 4.5', () => {
    for (const spec of specs) {
      for (const mode of modes) {
        const t = buildThemeTokens(spec, mode)
        for (const bg of ['--surface-0', '--region-canvas']) {
          const ratio = contrastRatio(parse(t['--text-primary']), parse(t[bg]))
          expect(ratio, `${mode} hue ${spec.accentHue} text/${bg}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('brand fill vs --brand-contrast >= 4.5', () => {
    for (const spec of specs) {
      for (const mode of modes) {
        const t = buildThemeTokens(spec, mode)
        const ratio = contrastRatio(parse(t['--brand']), parse(t['--brand-contrast']))
        expect(ratio, `${mode} hue ${spec.accentHue}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('a custom tenant color pins --brand to the REAL color (not the washed ramp step)', () => {
  it('--brand is the exact tenant color, constant across modes, AA-legible', () => {
    for (const mode of ['dark', 'light'] as const) {
      const t = buildThemeTokens(resolveThemeSpec('#fd5d03', true), mode)
      // MyV orange #fd5d03 = 253 93 3 — NOT the salmon the hue-only ramp produced.
      expect(t['--brand'], mode).toBe('253 93 3')
      expect(t['--brand-muted'], mode).toBe('253 93 3')
      expect(t['--border-focus'], mode).toBe('253 93 3')
      expect(contrastRatio(parse(t['--brand']), parse(t['--brand-contrast'])), mode).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('--brand-hover is a darker shade of the pinned color', () => {
    const t = buildThemeTokens(resolveThemeSpec('#fd5d03', true), 'dark')
    expect(relLuminance(parse(t['--brand-hover']))).toBeLessThan(relLuminance(parse(t['--brand'])))
  })

  it('jogi/edictus have no pinned color → --brand stays ramp-based (parity preserved)', () => {
    expect(buildThemeTokens(THEME_SPECS.jogi, 'dark')['--brand']).toBe('56 189 248')
    const [r, g, b] = parse(buildThemeTokens(THEME_SPECS.edictus, 'dark')['--brand'])
    expect(r).toBe(g)
    expect(g).toBe(b)
  })
})

describe('resolveThemeSpec — single fallback matrix', () => {
  it('no company -> neutral gray (eDictus), not Jogi blue', () => {
    expect(resolveThemeSpec(null, false)).toBe(THEME_SPECS.edictus)
    expect(resolveThemeSpec('#fd5d03', false)).toBe(THEME_SPECS.edictus)
  })

  it('company with no/malformed/achromatic color -> edictus gray (never blue)', () => {
    expect(resolveThemeSpec(null, true)).toBe(THEME_SPECS.edictus)
    expect(resolveThemeSpec('not-a-hex', true)).toBe(THEME_SPECS.edictus)
    expect(resolveThemeSpec('#808080', true)).toBe(THEME_SPECS.edictus)
  })

  it('company with a valid chromatic color -> custom accent at that hue', () => {
    const spec = resolveThemeSpec('#fd5d03', true)
    expect(spec.accentChroma).toBe(1)
    expect(spec.chromeChroma).toBe(0)
    expect(Math.round(spec.accentHue)).toBe(Math.round(hexToHue('#fd5d03')!))
  })
})
