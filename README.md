# @edictus/theme

**English** · [Español](README.es.md)

Brand-neutral theme engine. It turns a tenant's brand color into a complete set
of CSS variables for light and dark mode, using OKLCH color math and WCAG
contrast checks. It has no runtime dependencies and no framework, DOM or cookie
coupling.

## Highlights

- **Hand-rolled OKLCH ↔ sRGB** conversion with gamut clamping. No color
  library is used.
- **One call, one complete token set.** `buildThemeTokens(spec, mode)` always
  returns the same keys:
  - surfaces and regions;
  - a 50–950 accent ramp;
  - text and borders;
  - brand tokens (`--brand`, `-hover`, `-contrast`, `-on`, `-muted`, `-glow`).
- **Dark mode is the measured reference; light mode is derived.** Text, borders
  and the accent mirror their lightness. Surfaces use a two-band remap, so light
  mode gets gray regions with near-white surfaces instead of a single flat
  white.
- **Contrast-aware brand colors.**
  - `--brand-contrast` meets WCAG AA for each brand and mode.
  - `--brand-on` picks white or dark text at the AA-large 3:1 threshold, so a
    pale brand never gets white text.
- **Tailwind-friendly output.** Values are space-separated RGB triplets
  (`"r g b"`), so `rgb(var(--brand) / <alpha-value>)` keeps working.
- **Exact-output regression tests** pin the generated values, together with
  contrast and gamut sweeps.

## Install

```bash
npm i github:luvidal/edictus-theme#<commit-sha>
```

## Usage

```ts
import { resolveThemeSpec, buildThemeTokens } from '@edictus/theme'

// A company with an orange brand color, rendered in light mode.
const spec = resolveThemeSpec('#fd5d03', true)
const vars = buildThemeTokens(spec, 'light')

for (const [name, value] of Object.entries(vars)) {
  document.documentElement.style.setProperty(name, value)
}
```

How `resolveThemeSpec(color, hasCompany)` picks the spec:
- With no company, or with a missing or gray color, it uses the neutral
  `THEME_SPECS.edictus` preset.
- With a valid color, it builds a custom accent ramp and pins `--brand` to that
  exact color.

The presets are `THEME_SPECS.classic` (blue) and `THEME_SPECS.edictus` (neutral
gray), and `customSpec(hue)` builds any other. For validation use
`isValidHex`, `normalizeHex`, `hexToHue` and `hexToBrand`.

## Development

```bash
npm test        # Vitest
npm run build   # tsup → dist/ (ESM + CJS + type declarations)
```
