// OKLCH ramp generator for per-company theming (white-branding Layer 0).
//
// A theme is one hue poured into a fixed perceptual-lightness ladder. Building
// ramps in OKLCH (not HSL) means equal index-distance == equal perceived
// contrast — so a LIGHT theme is the DARK theme with its ramp indices reflected
// (i -> N-i). See oklch-ramp.test.ts for the contrast-preservation invariant.
//
// Output triplets are space-separated RGB ("r g b") to match styles/tokens.css,
// where Tailwind reads them via rgb(var(--token) / <alpha>).
//
// Gamut clamp here is naive per-channel; swap for `culori` if vivid chroma ever
// needs gamut-correct reduction. Grays (chroma 0) and current hues are exact.

export type Rgb = readonly [number, number, number]

export const RAMP_STOPS = 11
const L_MIN = 0.13
const L_MAX = 0.97

// Full lightness ladder (OKLCH L), darkest..lightest, equal perceptual steps.
// The classic preset's current dark tokens occupy the lower half; the full range exists so
// light mode = reflection, not a separate hand-built palette.
export const DEFAULT_L_STOPS: number[] = Array.from(
  { length: RAMP_STOPS },
  (_, i) => L_MIN + ((L_MAX - L_MIN) * i) / (RAMP_STOPS - 1),
)

// OKLCH -> sRGB (0..255), per-channel clamped.
export function oklchToRgb(L: number, C: number, hueDeg: number): Rgb {
  const h = (hueDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const enc = (c: number) => {
    const x = Math.min(1, Math.max(0, c))
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }
  const r = enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
  const g = enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
  const bl = enc(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)]
}

// sRGB (0..255) -> OKLCH. Inverse of oklchToRgb; used to read a tenant's hue
// off a stored #RRGGBB so the accent ramp can rotate to it.
export function srgbToOklch([r, g, b]: Rgb): { L: number; C: number; h: number } {
  const lin = (c: number) => {
    const x = c / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  const lr = lin(r)
  const lg = lin(g)
  const lb = lin(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(a, b2)
  let h = (Math.atan2(b2, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { L, C, h }
}

export const toTriplet = ([r, g, b]: Rgb): string => `${r} ${g} ${b}`

// Build a full ramp from one hue + chroma. chroma 0 => neutral gray.
export function buildRamp(
  hueDeg: number,
  chroma: number,
  lStops: readonly number[] = DEFAULT_L_STOPS,
): Rgb[] {
  return lStops.map((L) => oklchToRgb(L, chroma, hueDeg))
}

// Light theme = dark theme with ramp indices reflected.
export const reflectIndex = (i: number, n: number): number => n - i

// Light theme = dark theme with each stop's OKLCH lightness mirrored about the
// ladder midpoint (hue + chroma unchanged). Equivalent to reflectIndex for stops
// that sit on DEFAULT_L_STOPS, but works for any measured L (surfaces, text).
export const reflectL = (L: number): number => L_MIN + L_MAX - L

// Nudge a color's OKLCH lightness (hue + chroma kept), clamped to [0,1]. Used to
// derive a hover shade from a pinned brand color.
export function shiftLightness([r, g, b]: Rgb, dL: number): Rgb {
  const { L, C, h } = srgbToOklch([r, g, b])
  return oklchToRgb(Math.min(1, Math.max(0, L + dL)), C, h)
}

// WCAG relative luminance + contrast ratio (sRGB 0..255).
export function relLuminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relLuminance(a)
  const lb = relLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// Chrome-ramp params per theme preset. Custom companies override `chromeHue`
// from `primary_color`; chroma 0 = neutral gray.
export const THEME_PRESETS = {
  // Current classic scheme (blue) — assigned to the client role.
  classic: { chromeHue: 218, chromeChroma: 0.03 },
  // Default for companies with no custom colors (eDictus): the classic preset's ladder with
  // the hue removed -> neutral gray.
  edictus: { chromeHue: 0, chromeChroma: 0 },
} as const
