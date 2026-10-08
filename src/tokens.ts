// Per-company theme token generator (white-branding Layer 0 -> Layer 2).
//
// A theme is the fixed perceptual structure of today's dark UI with ONE hue
// rotated per tenant. The (L, C) of every surface, text and accent stop are
// measured off styles/tokens.css and frozen here; only `accentHue` rotates and
// `chroma` scales to 0 for the neutral-gray default. `buildThemeTokens` emits
// the exact CSS-var map that context/theme.tsx injects inline on <html>.
//
// Light mode: text, borders and the accent ramp keep mirroring their lightness
// about the ladder midpoint (hue + chroma unchanged) — see reflectL — because
// they live in the high-L band in dark and mirror correctly. Surfaces/regions do
// NOT reflect: the dark surface family is the only token family in the dark-low
// band, so mirroring lands it at mid-gray with elevation inverted. Instead they
// are affine-remapped into a near-white band (canvas grayest, most-raised
// whitest — see surfaceLightL), the real light convention; hierarchy then comes
// from borders + the light --shadow-*, not fill darkness. Status colors + shadows
// encode meaning, not identity, so they are NOT generated here — they get a
// hand-tuned `[data-theme="light"]` block in styles/tokens.css instead.
//
// Parity: at the `jogi` spec + `dark` this reproduces styles/tokens.css (accent
// ramp + text/border exactly, surfaces within rounding) — see tokens.test.ts.
// Status tokens, type, radius, spacing are NOT generated here.

import { oklchToRgb, contrastRatio, toTriplet, reflectL, shiftLightness, type Rgb } from './oklch-ramp'
import { hexToHue, hexToBrand } from './validate'

export type ThemeMode = 'dark' | 'light'

export interface ThemeSpec {
  chromeHue: number // OKLCH hue for the surface ladder (only used when chromeChroma > 0)
  chromeChroma: number // multiplier on the surface chroma arc: 1 = jogi blue-gray, 0 = neutral gray
  accentHue: number // nominal accent hue; rotates the whole ramp by (accentHue - JOGI_ACCENT_HUE)
  accentChroma: number // multiplier on the accent chroma arc: 1 = colored, 0 = neutral gray
  brand?: Rgb | null // tenant's ACTUAL brand color; pins --brand* to it (constant
  // across modes) instead of the ramp's theme-400. null -> use the ramp step (jogi
  // sky / eDictus gray). Set only for real custom tenants so vivid warm brands
  // (e.g. a saturated orange) render true, not washed to the sky lightness profile.
}

// Reference accent hue of today's sky ramp; jogi rotates by 0 -> exact parity.
const JOGI_ACCENT_HUE = 237
const CHROME_HUE = 261 // OKLCH hue of today's H218-HSL slate surfaces

// Surface/region ladder: [cssVar, OKLCH L, OKLCH C] measured from tokens.css.
const SURFACE_SPECS: readonly [string, number, number][] = [
  ['--surface-0', 0.2615, 0.051],
  ['--surface-1', 0.3249, 0.0464],
  ['--surface-2', 0.4119, 0.0474],
  ['--surface-3', 0.4859, 0.043],
  ['--surface-4', 0.5934, 0.0423],
  ['--region-sidebar', 0.3001, 0.0461],
  ['--region-canvas', 0.2302, 0.0386],
  ['--region-panel', 0.2771, 0.0443],
]

// Light-mode surface remap. Reflecting the surface family lands it mid-gray with
// elevation inverted (it's the only family in the dark-low band). Instead, affine-
// remap each dark stop's lightness from its [min..max] window onto a near-white
// band — monotonic, so elevation is preserved: the dark canvas (grayest) → a soft
// gray backdrop, the most-raised surface → near-pure-white. The band is wide
// enough that raised surfaces read as paper against a clearly-grayer canvas (the
// page chrome relies on this + the light --shadow-*/borders, not fill darkness).
// Hue + chroma are untouched.
// Two bands, so light mode has real hierarchy: the page/region BACKDROPS
// (canvas, sidebar, panel) map to a clearly-gray band, and the SURFACE ladder
// (cards, panels, the shell's mild active fills) maps to a near-white band — so
// every raised element reads as white paper against gray chrome. Each group is
// normalized within its own dark L range so elevation order is kept inside it.
const LIGHT_REGIONS = new Set(['--region-canvas', '--region-sidebar', '--region-panel'])
const LIGHT_REGION_BAND: readonly [number, number] = [0.90, 0.925] // gray chrome (kept clearly below the surface band so mild surface fills pop)
const LIGHT_SURFACE_BAND: readonly [number, number] = [0.95, 1.0] // near-white paper
const groupRange = (inRegion: boolean): [number, number] => {
  const ls = SURFACE_SPECS.filter(([n]) => LIGHT_REGIONS.has(n) === inRegion).map(([, L]) => L)
  return [Math.min(...ls), Math.max(...ls)]
}
const [REGION_L_MIN, REGION_L_MAX] = groupRange(true)
const [SURF_L_MIN, SURF_L_MAX] = groupRange(false)
const surfaceLightL = (name: string, L: number): number => {
  const inRegion = LIGHT_REGIONS.has(name)
  const [lo, hi] = inRegion ? LIGHT_REGION_BAND : LIGHT_SURFACE_BAND
  const [mn, mx] = inRegion ? [REGION_L_MIN, REGION_L_MAX] : [SURF_L_MIN, SURF_L_MAX]
  return lo + ((L - mn) / (mx - mn)) * (hi - lo)
}

// Accent ramp: [tailwind step, L, C, base hue] measured from the sky ramp.
// The base hue carries the ramp's natural warm->cool drift; rotating it by a
// delta preserves that drift for any tenant hue.
const ACCENT_SPECS: readonly [number, number, number, number][] = [
  [50, 0.9771, 0.0125, 236.6],
  [100, 0.9514, 0.025, 236.8],
  [200, 0.9014, 0.0555, 230.9],
  [300, 0.8276, 0.1013, 230.3],
  [400, 0.7535, 0.139, 232.7],
  [500, 0.6847, 0.1479, 237.3],
  [600, 0.5876, 0.1389, 242.0],
  [700, 0.5, 0.1193, 242.7],
  [800, 0.4434, 0.1, 240.8],
  [900, 0.3912, 0.0845, 240.9],
  [950, 0.2935, 0.0632, 243.2],
]

// Text + border ladder: [cssVar, OKLCH L, C, hue] measured from tokens.css.
// Chrome tokens — rotate with chromeChroma like surfaces (gray for gray tenants);
// per-token hue gives exact dark parity. Reflected with the surfaces in light.
const CHROME_TEXT_SPECS: readonly [string, number, number, number][] = [
  ['--text-primary', 0.9683, 0.0069, 247.9],
  ['--text-secondary', 0.869, 0.0198, 252.9],
  ['--text-tertiary', 0.7107, 0.0351, 256.8],
  ['--text-inverse', 0.2077, 0.0398, 265.8],
  ['--text-disabled', 0.5544, 0.0407, 257.4],
  ['--border-subtle', 0.7107, 0.0351, 256.8],
  ['--border-strong', 0.7107, 0.0351, 256.8],
]

const BRAND_STEP = 400 // --brand maps to theme-400 (sky-400 today)
const BRAND_HOVER_STEP = 500

// Button-text candidates: dark slate (--text-inverse) preferred, white fallback.
const CONTRAST_DARK: Rgb = [15, 23, 42]
const CONTRAST_LIGHT: Rgb = [255, 255, 255]

// Pick the brand-contrast color that clears AA (>=4.5) on the brand fill,
// preferring dark. Recomputed per accent so button text stays legible.
function brandContrast(brand: Rgb): Rgb {
  const dark = contrastRatio(brand, CONTRAST_DARK)
  if (dark >= 4.5) return CONTRAST_DARK
  const light = contrastRatio(brand, CONTRAST_LIGHT)
  return light > dark ? CONTRAST_LIGHT : CONTRAST_DARK
}

// `--brand-on`: the foreground for CTAs / chips / badges sitting ON the brand
// fill (buttons read as conventional white-on-brand). Like brandContrast but at
// the AA-LARGE 3:1 threshold *in light mode only* — a saturated brand (orange
// white-on-orange = 3.11 < 4.5 but >= 3) gets the expected white; a PALE brand
// (white-on-it < 3) falls back to the AA-strict dark, so white-on-pale never
// happens. Dark mode keeps the AA-strict brandContrast pick, so dark-mode
// accessibility is unchanged — this mirrors the established @edictus/ui pattern
// (`text-brand-contrast light:text-white`) but resolves per-tenant + pale-safe.
function brandOn(brand: Rgb, mode: ThemeMode): Rgb {
  if (mode === 'light' && contrastRatio(brand, CONTRAST_LIGHT) >= 3) return CONTRAST_LIGHT
  return brandContrast(brand)
}

// Emit the full per-theme CSS-var map (space-separated RGB triplets). In light
// `mode` text/borders/accent mirror their lightness while surfaces/regions get
// the near-white affine remap; hue + chroma are unchanged throughout.
export function buildThemeTokens(spec: ThemeSpec, mode: ThemeMode = 'dark'): Record<string, string> {
  const out: Record<string, string> = {}
  const mapL = (l: number) => (mode === 'light' ? reflectL(l) : l)

  // Surfaces/regions: affine near-white remap in light (not reflection); text,
  // borders and the accent ramp below keep reflecting via mapL.
  for (const [name, L, C] of SURFACE_SPECS) {
    const surfaceL = mode === 'light' ? surfaceLightL(name, L) : L
    out[name] = toTriplet(oklchToRgb(surfaceL, C * spec.chromeChroma, spec.chromeHue))
  }

  for (const [name, L, C, hue] of CHROME_TEXT_SPECS) {
    out[name] = toTriplet(oklchToRgb(mapL(L), C * spec.chromeChroma, hue))
  }

  const delta = spec.accentHue - JOGI_ACCENT_HUE
  let rampBrand: Rgb = CONTRAST_LIGHT
  let rampHover: Rgb = CONTRAST_LIGHT
  for (const [step, L, C, baseHue] of ACCENT_SPECS) {
    const rgb = oklchToRgb(mapL(L), C * spec.accentChroma, baseHue + delta)
    out[`--theme-${step}`] = toTriplet(rgb)
    if (step === BRAND_STEP) rampBrand = rgb
    if (step === BRAND_HOVER_STEP) rampHover = rgb
  }

  // --brand is the prominent fill/text/active color. A pinned tenant color is the
  // tenant's true identity, kept CONSTANT across modes (brand-contrast adapts for
  // AA); only when there's no pinned color does it fall back to the ramp's
  // theme-400 (jogi sky reflects light/dark; eDictus gray).
  const brand = spec.brand ?? rampBrand
  const brandHover = spec.brand ? shiftLightness(spec.brand, -0.06) : rampHover
  out['--brand'] = toTriplet(brand)
  out['--brand-hover'] = toTriplet(brandHover)
  out['--brand-contrast'] = toTriplet(brandContrast(brand))
  out['--brand-on'] = toTriplet(brandOn(brand, mode))
  // Brand-derived tokens kept coherent so focus rings / glows follow the tenant.
  out['--brand-muted'] = out['--brand']
  out['--brand-glow'] = out['--brand']
  out['--border-focus'] = out['--brand']

  return out
}

// Decided presets (see lib/branding/CLAUDE.md). Hues are irrelevant where the
// matching chroma is 0 but kept at the jogi values for clarity.
export const THEME_SPECS = {
  // Client fallback: today's Jogi blue. Reproduces styles/tokens.css.
  jogi: { chromeHue: CHROME_HUE, chromeChroma: 1, accentHue: JOGI_ACCENT_HUE, accentChroma: 1 },
  // Default for companies with no (valid) custom colors: fully neutral gray.
  edictus: { chromeHue: CHROME_HUE, chromeChroma: 0, accentHue: JOGI_ACCENT_HUE, accentChroma: 0 },
} as const satisfies Record<string, ThemeSpec>

// Custom tenant: neutral-gray chrome + accent rotated to their brand hue. `brand`
// (the real color) is null here so synthetic hue-only specs use the ramp;
// resolveThemeSpec fills it in from the actual stored color.
export const customSpec = (accentHue: number): ThemeSpec => ({
  chromeHue: CHROME_HUE,
  chromeChroma: 0,
  accentHue,
  accentChroma: 1,
  brand: null,
})

// Single fallback matrix (see lib/branding/CLAUDE.md):
//   no company        -> neutral gray (pre-tenant / white-label default)
//   company, no hue    -> eDictus gray (null/malformed/achromatic colors)
//   company, valid hue -> custom accent at their hue, --brand pinned to the color
// The Jogi-blue preset is no longer a fallback here — it is only reached when a
// caller explicitly asks for THEME_SPECS.jogi.
export function resolveThemeSpec(primaryColor: string | null | undefined, hasCompany: boolean): ThemeSpec {
  if (!hasCompany) return THEME_SPECS.edictus
  const hue = hexToHue(primaryColor)
  if (hue === null) return THEME_SPECS.edictus
  return { ...customSpec(hue), brand: hexToBrand(primaryColor) }
}
