// Public surface of @edictus/theme — the pure, brand-neutral theme engine.
// OKLCH color math, per-tenant token generation, and hex validation. Zero deps,
// no framework/cookie/persistence coupling; consumers (the host's context/theme.tsx,
// companybranding.tsx, the branding API route, and the first-paint bootstrap)
// import from here.
export * from './oklch-ramp'
export * from './validate'
export * from './tokens'
