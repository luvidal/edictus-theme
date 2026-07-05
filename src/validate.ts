// Hex-color validation shared by the write path (PATCH /api/users/company) and
// the read path (CompanyBrandingProvider). Single source so the rule that a
// brand color must be `#RRGGBB` is enforced identically server- and client-side.

import { srgbToOklch, type Rgb } from './oklch-ramp'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

// Below this OKLCH chroma a color is effectively gray — no meaningful hue to
// rotate the ramp toward, so we treat it as "no custom color" (-> gray preset).
const MIN_CHROMA = 0.01

export const isValidHex = (value: unknown): value is string =>
  typeof value === 'string' && HEX_RE.test(value.trim())

// Result of normalizing a color field on write. `null` clears the color;
// `'invalid'` means the caller should reject (400) rather than store garbage.
export type NormalizedHex = string | null | 'invalid'

// Normalize to lowercase `#rrggbb`. `null` passes through (clearing is legal);
// anything that is not a valid hex returns `'invalid'`.
export function normalizeHex(value: unknown): NormalizedHex {
  if (value === null) return null
  if (!isValidHex(value)) return 'invalid'
  return value.trim().toLowerCase()
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

// OKLCH hue (deg) for a valid, non-gray hex; null otherwise. Achromatic colors
// return null so the caller falls back to the neutral gray preset.
export function hexToHue(value: unknown): number | null {
  if (!isValidHex(value)) return null
  const { C, h } = srgbToOklch(hexToRgb(value.trim()))
  return C < MIN_CHROMA ? null : h
}

// The tenant's actual brand RGB for a valid chromatic hex; null otherwise. Used
// to pin `--brand` to the real color instead of a hue forced onto sky's pale
// lightness profile (which washes vivid warm brands out to salmon).
export function hexToBrand(value: unknown): Rgb | null {
  if (!isValidHex(value)) return null
  const rgb = hexToRgb(value.trim())
  return srgbToOklch(rgb).C < MIN_CHROMA ? null : rgb
}
