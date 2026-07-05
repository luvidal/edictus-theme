# @edictus/theme

Pure, brand-neutral theme engine: OKLCH color math, per-tenant CSS-var token
generation (dark = reference, light = two-band remap), and hex validation. Zero
runtime deps. No framework, cookie, DOM, or persistence coupling — a caller feeds
a spec/hex in and gets RGB-triplet token maps out.

## Compact instructions

- This is a black-box satellite. Wrong output → add a fixture + fix it HERE, never
  patch around it in a consumer.
- Dark mode is the reference. Every `(L,C[,H])` in `tokens.ts` was measured off a
  real dark UI. **Never change dark values to "fix" light.** Light is derived.
- Output is space-separated RGB triplets (`"r g b"`) so Tailwind `rgb(var() / a)`
  alpha keeps working. Never emit `#hex` or `rgb()`.

## Communication style

Be concise and direct. Lead with the answer. Reference code as `file:line`. No
preamble/postamble. State outcomes plainly; if tests fail, say so with the output.

## Tech stack

TypeScript, tsup (cjs+esm+dts), Vitest. No runtime dependencies. Hand-rolled OKLCH
↔ sRGB (no `culori`).

## Project structure

- `src/oklch-ramp.ts` — `oklchToRgb`/`srgbToOklch` (gamut-clamped), `buildRamp`,
  `reflectIndex`/`reflectL`, `shiftLightness`, `relLuminance`/`contrastRatio`,
  `toTriplet`, `DEFAULT_L_STOPS`, `RAMP_STOPS`, `THEME_PRESETS`.
- `src/validate.ts` — `isValidHex`, `normalizeHex` (→ `'invalid'` on bad input),
  `hexToHue`/`hexToBrand` (null for malformed **or** achromatic).
- `src/tokens.ts` — `buildThemeTokens(spec, mode='dark')` → CSS-var map;
  `ThemeMode`, `ThemeSpec`, `THEME_SPECS` (`jogi` blue, `edictus` gray),
  `customSpec(hue)`, `resolveThemeSpec(primaryColor, hasCompany)`.
- `src/index.ts` — re-export hub. `tests/` — parity + contrast + gamut sweeps.

## Code rules

- File names lowercase. No `@/` or app-specific imports — this package is
  self-contained.
- Public API is stable; adding is fine, renaming/removing needs a consumer sweep.
- Every behavior change updates/adds a test. Keep `tests/tokens.test.ts` pinning
  the exact RGB output — it is the generator↔CSS parity guard.

## Behaviors

- `buildThemeTokens` emits the same key set for every spec/mode: `--surface-0..4`,
  `--region-*`, `--theme-50..950`, `--text-*`, `--border-*`,
  `--brand`/`-hover`/`-contrast`/`-on`/`-muted`/`-glow`, `--border-focus`.
- Light: text/borders/accent mirror lightness (`reflectL`, hue+chroma kept);
  surfaces/regions use the **two-band** affine remap (`surfaceLightL`) — gray
  region chrome + near-white surfaces. NOT a single near-white band. `--status-*`
  and `--shadow-*` are NOT generated here (they encode meaning; the host owns them).
- A pinned `spec.brand` stays constant across modes (vivid warm brands render true);
  `--brand-contrast` recomputes per brand+mode for AA; `--brand-on` = light→white /
  dark→dark at the AA-large 3:1 threshold in light (pale brand → dark, never
  white-on-pale).
- `resolveThemeSpec`: no company → `edictus` gray; company + null/malformed/gray →
  `edictus` gray; company + valid hue → custom accent, `--brand` pinned to the color.

## Commands

- `npm run build` — tsup → `dist/` (cjs+esm+dts). **Commit `dist/`** (consumed via
  GitHub, not npm).
- `npm test` — vitest.

## Validation

`npx tsc --noEmit && npm run build && npm test`.

## Consumer integration

Primary consumer: `~/GitHub/jogi` (`"@edictus/theme": "github:luvidal/edictus-theme#<sha>"`).
- `context/theme.tsx` — runtime injection (`buildThemeTokens`, `resolveThemeSpec`, `THEME_SPECS`).
- `context/companybranding.tsx` — `isValidHex`.
- `pages/api/users/company.ts` — `normalizeHex`.
- `lib/branding/bootstrap.ts` (stays in jogi — the Next/cookie first-paint adapter)
  imports `buildThemeTokens`/`resolveThemeSpec`/`isValidHex` from here.

After publishing, run `npm run update:theme` in jogi to pull the latest SHA, then
clear `.next/` and restart dev. Theme changes MUST be verified in jogi's running app
(dark AND light × neutral/saturated/pale brand) — token-correct ≠ looks-good. See
jogi `docs/ref/theme-contrast.md`.
