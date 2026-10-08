# @edictus/theme

[English](README.md) · **Español**

Motor de temas neutral respecto de la marca. Convierte el color de marca de
cada cliente en un conjunto completo de variables CSS para modo claro y
oscuro, usando cálculo de color en OKLCH y verificación de contraste WCAG. No
tiene dependencias en tiempo de ejecución ni está acoplado a un framework, al
DOM ni a cookies.

## Lo destacado

- **Conversión OKLCH ↔ sRGB propia**, con ajuste a la gama de colores. No usa
  ninguna librería de color.
- **Una llamada, un conjunto completo de tokens.**
  `buildThemeTokens(spec, mode)` siempre devuelve las mismas claves:
  - superficies y regiones;
  - una escala de acento de 50 a 950;
  - texto y bordes;
  - tokens de marca (`--brand`, `-hover`, `-contrast`, `-on`, `-muted`, `-glow`).
- **El modo oscuro es la referencia medida; el claro se deriva.** Texto, bordes
  y acento invierten su luminosidad. Las superficies usan un mapeo de dos
  bandas, así el modo claro tiene regiones grises con superficies casi blancas
  en vez de un blanco plano.
- **Colores de marca con contraste asegurado.**
  - `--brand-contrast` cumple WCAG AA para cada marca y modo.
  - `--brand-on` elige texto blanco u oscuro según el umbral AA para texto
    grande (3:1), así una marca pálida nunca queda con texto blanco.
- **Salida compatible con Tailwind.** Los valores son tripletas RGB separadas
  por espacios (`"r g b"`), así que `rgb(var(--brand) / <alpha-value>)` sigue
  funcionando.
- **Tests de regresión de salida exacta** fijan los valores generados, junto
  con barridos de contraste y de gama.

## Instalación

```bash
npm i github:luvidal/edictus-theme#<sha-del-commit>
```

## Uso

```ts
import { resolveThemeSpec, buildThemeTokens } from '@edictus/theme'

// Una empresa con color de marca naranja, en modo claro.
const spec = resolveThemeSpec('#fd5d03', true)
const vars = buildThemeTokens(spec, 'light')

for (const [name, value] of Object.entries(vars)) {
  document.documentElement.style.setProperty(name, value)
}
```

Cómo elige `resolveThemeSpec(color, hasCompany)` la configuración:
- Sin empresa, o con un color ausente o gris, usa el preset neutro
  `THEME_SPECS.edictus`.
- Con un color válido, construye una escala de acento propia y fija `--brand`
  en ese color exacto.

Los presets son `THEME_SPECS.classic` (azul) y `THEME_SPECS.edictus` (gris
neutro), y `customSpec(hue)` construye cualquier otro. Para validar colores
están `isValidHex`, `normalizeHex`, `hexToHue` y `hexToBrand`.

## Desarrollo

```bash
npm test        # Vitest
npm run build   # tsup → dist/ (ESM + CJS + declaraciones de tipos)
```
