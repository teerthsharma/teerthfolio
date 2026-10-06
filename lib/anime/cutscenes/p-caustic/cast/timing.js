// p-caustic CAST: shared timing + easing. Pure functions of the clock, so a scrubbed frame equals a played one.
// Event times are the bible's (scripts/p-caustic.md 3.6, 3.7, 4). A beat the DIRECTION agent names in scene.js overrides
// the default: cue.since(name) is finite once the beat has started, so start = t - cue.since(name).
// Cue names read here (all optional): costume (0.55) flinch (1.9) cast (3.3) hit1 (4.7) meteor2 (4.85) hit2 (6.42)
//   break (6.6) release (6.8, the costume drops) aftermath (8.3)
export const DEFAULT_EVENTS = { costume: 0.55, flinch: 1.9, cast: 3.3, hit1: 4.7, meteor2: 4.85, hit2: 6.42, break: 6.6, release: 6.8, aftermath: 8.3 };
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
// smoothstep of a 0..1 parameter
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
// ramp from 0 to 1 over [a, a + d], smoothed
export const ramp = (t, a, d) => sm((t - a) / Math.max(1e-6, d));
// easeOutBack: f(x) = 1 + (c1 + 1)(x - 1)^3 + c1 (x - 1)^2 ; c1 = 2.8 overshoots about 18 percent (the bible's mane)
export const back = (x, c1 = 2.8) => { x = clamp01(x); const u = x - 1; return 1 + (c1 + 1) * u * u * u + c1 * u * u; };
// frame-locked tremble in -1..1 (callers pass the STEPPED time)
export const jit = (t, s) => Math.sin(t * 91.7 + s * 17.3) * Math.cos(t * 53.1 + s * 5.9);
export function events(cue, t) {
  const E = {};
  for (const k of Object.keys(DEFAULT_EVENTS)) {
    const s = cue?.since ? cue.since(k) : Infinity;
    E[k] = Number.isFinite(s) ? t - s : DEFAULT_EVENTS[k];
  }
  return E;
}
