type Rgb = readonly [number, number, number];
declare const RAMP_STOPS = 11;
declare const DEFAULT_L_STOPS: number[];
declare function oklchToRgb(L: number, C: number, hueDeg: number): Rgb;
declare function srgbToOklch([r, g, b]: Rgb): {
    L: number;
    C: number;
    h: number;
};
declare const toTriplet: ([r, g, b]: Rgb) => string;
declare function buildRamp(hueDeg: number, chroma: number, lStops?: readonly number[]): Rgb[];
declare const reflectIndex: (i: number, n: number) => number;
declare const reflectL: (L: number) => number;
declare function shiftLightness([r, g, b]: Rgb, dL: number): Rgb;
declare function relLuminance([r, g, b]: Rgb): number;
declare function contrastRatio(a: Rgb, b: Rgb): number;
declare const THEME_PRESETS: {
    readonly jogi: {
        readonly chromeHue: 218;
        readonly chromeChroma: 0.03;
    };
    readonly edictus: {
        readonly chromeHue: 0;
        readonly chromeChroma: 0;
    };
};

declare const isValidHex: (value: unknown) => value is string;
type NormalizedHex = string | null | 'invalid';
declare function normalizeHex(value: unknown): NormalizedHex;
declare function hexToHue(value: unknown): number | null;
declare function hexToBrand(value: unknown): Rgb | null;

type ThemeMode = 'dark' | 'light';
interface ThemeSpec {
    chromeHue: number;
    chromeChroma: number;
    accentHue: number;
    accentChroma: number;
    brand?: Rgb | null;
}
declare function buildThemeTokens(spec: ThemeSpec, mode?: ThemeMode): Record<string, string>;
declare const THEME_SPECS: {
    readonly jogi: {
        readonly chromeHue: 261;
        readonly chromeChroma: 1;
        readonly accentHue: 237;
        readonly accentChroma: 1;
    };
    readonly edictus: {
        readonly chromeHue: 261;
        readonly chromeChroma: 0;
        readonly accentHue: 237;
        readonly accentChroma: 0;
    };
};
declare const customSpec: (accentHue: number) => ThemeSpec;
declare function resolveThemeSpec(primaryColor: string | null | undefined, hasCompany: boolean): ThemeSpec;

export { DEFAULT_L_STOPS, type NormalizedHex, RAMP_STOPS, type Rgb, THEME_PRESETS, THEME_SPECS, type ThemeMode, type ThemeSpec, buildRamp, buildThemeTokens, contrastRatio, customSpec, hexToBrand, hexToHue, isValidHex, normalizeHex, oklchToRgb, reflectIndex, reflectL, relLuminance, resolveThemeSpec, shiftLightness, srgbToOklch, toTriplet };
