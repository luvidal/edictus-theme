'use strict';

// src/oklch-ramp.ts
var RAMP_STOPS = 11;
var L_MIN = 0.13;
var L_MAX = 0.97;
var DEFAULT_L_STOPS = Array.from(
  { length: RAMP_STOPS },
  (_, i) => L_MIN + (L_MAX - L_MIN) * i / (RAMP_STOPS - 1)
);
function oklchToRgb(L, C, hueDeg) {
  const h = hueDeg * Math.PI / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const enc = (c) => {
    const x = Math.min(1, Math.max(0, c));
    return x <= 31308e-7 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  };
  const r = enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = enc(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)];
}
function srgbToOklch([r, g, b]) {
  const lin = (c) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const lr = lin(r);
  const lg = lin(g);
  const lb = lin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, b2);
  let h = Math.atan2(b2, a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}
var toTriplet = ([r, g, b]) => `${r} ${g} ${b}`;
function buildRamp(hueDeg, chroma, lStops = DEFAULT_L_STOPS) {
  return lStops.map((L) => oklchToRgb(L, chroma, hueDeg));
}
var reflectIndex = (i, n) => n - i;
var reflectL = (L) => L_MIN + L_MAX - L;
function shiftLightness([r, g, b], dL) {
  const { L, C, h } = srgbToOklch([r, g, b]);
  return oklchToRgb(Math.min(1, Math.max(0, L + dL)), C, h);
}
function relLuminance([r, g, b]) {
  const lin = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(a, b) {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
var THEME_PRESETS = {
  // Current classic scheme (blue) — assigned to the client role.
  classic: { chromeHue: 218, chromeChroma: 0.03 },
  // Default for companies with no custom colors (eDictus): the classic preset's ladder with
  // the hue removed -> neutral gray.
  edictus: { chromeHue: 0, chromeChroma: 0 }
};

// src/validate.ts
var HEX_RE = /^#[0-9a-fA-F]{6}$/;
var MIN_CHROMA = 0.01;
var isValidHex = (value) => typeof value === "string" && HEX_RE.test(value.trim());
function normalizeHex(value) {
  if (value === null) return null;
  if (!isValidHex(value)) return "invalid";
  return value.trim().toLowerCase();
}
var hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];
function hexToHue(value) {
  if (!isValidHex(value)) return null;
  const { C, h } = srgbToOklch(hexToRgb(value.trim()));
  return C < MIN_CHROMA ? null : h;
}
function hexToBrand(value) {
  if (!isValidHex(value)) return null;
  const rgb = hexToRgb(value.trim());
  return srgbToOklch(rgb).C < MIN_CHROMA ? null : rgb;
}

// src/tokens.ts
var CLASSIC_ACCENT_HUE = 237;
var CHROME_HUE = 261;
var SURFACE_SPECS = [
  ["--surface-0", 0.2615, 0.051],
  ["--surface-1", 0.3249, 0.0464],
  ["--surface-2", 0.4119, 0.0474],
  ["--surface-3", 0.4859, 0.043],
  ["--surface-4", 0.5934, 0.0423],
  ["--region-sidebar", 0.3001, 0.0461],
  ["--region-canvas", 0.2302, 0.0386],
  ["--region-panel", 0.2771, 0.0443]
];
var LIGHT_REGIONS = /* @__PURE__ */ new Set(["--region-canvas", "--region-sidebar", "--region-panel"]);
var LIGHT_REGION_BAND = [0.9, 0.925];
var LIGHT_SURFACE_BAND = [0.95, 1];
var groupRange = (inRegion) => {
  const ls = SURFACE_SPECS.filter(([n]) => LIGHT_REGIONS.has(n) === inRegion).map(([, L]) => L);
  return [Math.min(...ls), Math.max(...ls)];
};
var [REGION_L_MIN, REGION_L_MAX] = groupRange(true);
var [SURF_L_MIN, SURF_L_MAX] = groupRange(false);
var surfaceLightL = (name, L) => {
  const inRegion = LIGHT_REGIONS.has(name);
  const [lo, hi] = inRegion ? LIGHT_REGION_BAND : LIGHT_SURFACE_BAND;
  const [mn, mx] = inRegion ? [REGION_L_MIN, REGION_L_MAX] : [SURF_L_MIN, SURF_L_MAX];
  return lo + (L - mn) / (mx - mn) * (hi - lo);
};
var ACCENT_SPECS = [
  [50, 0.9771, 0.0125, 236.6],
  [100, 0.9514, 0.025, 236.8],
  [200, 0.9014, 0.0555, 230.9],
  [300, 0.8276, 0.1013, 230.3],
  [400, 0.7535, 0.139, 232.7],
  [500, 0.6847, 0.1479, 237.3],
  [600, 0.5876, 0.1389, 242],
  [700, 0.5, 0.1193, 242.7],
  [800, 0.4434, 0.1, 240.8],
  [900, 0.3912, 0.0845, 240.9],
  [950, 0.2935, 0.0632, 243.2]
];
var CHROME_TEXT_SPECS = [
  ["--text-primary", 0.9683, 69e-4, 247.9],
  ["--text-secondary", 0.869, 0.0198, 252.9],
  ["--text-tertiary", 0.7107, 0.0351, 256.8],
  ["--text-inverse", 0.2077, 0.0398, 265.8],
  ["--text-disabled", 0.5544, 0.0407, 257.4],
  ["--border-subtle", 0.7107, 0.0351, 256.8],
  ["--border-strong", 0.7107, 0.0351, 256.8]
];
var BRAND_STEP = 400;
var BRAND_HOVER_STEP = 500;
var CONTRAST_DARK = [15, 23, 42];
var CONTRAST_LIGHT = [255, 255, 255];
function brandContrast(brand) {
  const dark = contrastRatio(brand, CONTRAST_DARK);
  if (dark >= 4.5) return CONTRAST_DARK;
  const light = contrastRatio(brand, CONTRAST_LIGHT);
  return light > dark ? CONTRAST_LIGHT : CONTRAST_DARK;
}
function brandOn(brand, mode) {
  if (mode === "light" && contrastRatio(brand, CONTRAST_LIGHT) >= 3) return CONTRAST_LIGHT;
  return brandContrast(brand);
}
function buildThemeTokens(spec, mode = "dark") {
  const out = {};
  const mapL = (l) => mode === "light" ? reflectL(l) : l;
  for (const [name, L, C] of SURFACE_SPECS) {
    const surfaceL = mode === "light" ? surfaceLightL(name, L) : L;
    out[name] = toTriplet(oklchToRgb(surfaceL, C * spec.chromeChroma, spec.chromeHue));
  }
  for (const [name, L, C, hue] of CHROME_TEXT_SPECS) {
    out[name] = toTriplet(oklchToRgb(mapL(L), C * spec.chromeChroma, hue));
  }
  const delta = spec.accentHue - CLASSIC_ACCENT_HUE;
  let rampBrand = CONTRAST_LIGHT;
  let rampHover = CONTRAST_LIGHT;
  for (const [step, L, C, baseHue] of ACCENT_SPECS) {
    const rgb = oklchToRgb(mapL(L), C * spec.accentChroma, baseHue + delta);
    out[`--theme-${step}`] = toTriplet(rgb);
    if (step === BRAND_STEP) rampBrand = rgb;
    if (step === BRAND_HOVER_STEP) rampHover = rgb;
  }
  const brand = spec.brand ?? rampBrand;
  const brandHover = spec.brand ? shiftLightness(spec.brand, -0.06) : rampHover;
  out["--brand"] = toTriplet(brand);
  out["--brand-hover"] = toTriplet(brandHover);
  out["--brand-contrast"] = toTriplet(brandContrast(brand));
  out["--brand-on"] = toTriplet(brandOn(brand, mode));
  out["--brand-muted"] = out["--brand"];
  out["--brand-glow"] = out["--brand"];
  out["--border-focus"] = out["--brand"];
  return out;
}
var THEME_SPECS = {
  // Client fallback: today's classic blue. Reproduces styles/tokens.css.
  classic: { chromeHue: CHROME_HUE, chromeChroma: 1, accentHue: CLASSIC_ACCENT_HUE, accentChroma: 1 },
  // Default for companies with no (valid) custom colors: fully neutral gray.
  edictus: { chromeHue: CHROME_HUE, chromeChroma: 0, accentHue: CLASSIC_ACCENT_HUE, accentChroma: 0 }
};
var customSpec = (accentHue) => ({
  chromeHue: CHROME_HUE,
  chromeChroma: 0,
  accentHue,
  accentChroma: 1,
  brand: null
});
function resolveThemeSpec(primaryColor, hasCompany) {
  if (!hasCompany) return THEME_SPECS.edictus;
  const hue = hexToHue(primaryColor);
  if (hue === null) return THEME_SPECS.edictus;
  return { ...customSpec(hue), brand: hexToBrand(primaryColor) };
}

exports.DEFAULT_L_STOPS = DEFAULT_L_STOPS;
exports.RAMP_STOPS = RAMP_STOPS;
exports.THEME_PRESETS = THEME_PRESETS;
exports.THEME_SPECS = THEME_SPECS;
exports.buildRamp = buildRamp;
exports.buildThemeTokens = buildThemeTokens;
exports.contrastRatio = contrastRatio;
exports.customSpec = customSpec;
exports.hexToBrand = hexToBrand;
exports.hexToHue = hexToHue;
exports.isValidHex = isValidHex;
exports.normalizeHex = normalizeHex;
exports.oklchToRgb = oklchToRgb;
exports.reflectIndex = reflectIndex;
exports.reflectL = reflectL;
exports.relLuminance = relLuminance;
exports.resolveThemeSpec = resolveThemeSpec;
exports.shiftLightness = shiftLightness;
exports.srgbToOklch = srgbToOklch;
exports.toTriplet = toTriplet;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map