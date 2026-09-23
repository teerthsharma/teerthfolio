// THE XLA GEYSER, pure layout: openxla/xla #46539 fixed GroupDisjointReductions
// so the same program always emits the same GPU code -- so this geyser
// erupts on the same exact beat every time, real seconds, never sped up for
// the seal being near (the one thing that would make it non-deterministic).
//
// THE ANOMALY (the owner's list: "a splash frozen in mid air"): beside the
// live column, an earlier eruption's crown of spray hangs frozen for good,
// the same shape every time -- determinism, shown, not told.

const GOLDEN = 2.39996;

export const ERUPT_PERIOD = 9; // s: the whole beat, source of truth for the schedule
export const RISE = 0.16; // fraction of the period spent climbing
export const FALL = 0.3; // fraction spent falling back as spray
export const DROP_COUNT = 22;

// Grown from 1.35/1.15: at that size, fully dormant (~54% of the cycle),
// the mound read as a dark pebble with a thin ring, not a landmark.
export const VENT_R = 1.8; // the sinter mound's base radius
export const VENT_H = 1.6; // the mound's height at the vent lip

// Every drop's own, fixed way up: a golden-angle fan (the same trick as
// land/Moat.jsx's Uphill), so the column reads as a fountain, not one jet,
// and is bit-for-bit the same shape every cycle.
export const DROPS = Array.from({ length: DROP_COUNT }, (_, i) => ({
  angle: i * GOLDEN,
  apex: 3.2 + 2.1 * ((i * 0.618) % 1), // m above the vent lip
  delay: (i % 6) / 6 / 3, // staggered launch inside RISE, so the jet fans out
  spread: 0.35 + 0.5 * (((i * 7) % 5) / 5), // outward drift while falling
}));

// THE ALWAYS-ON TELL: a few pale steam puffs drift up off the vent lip all
// the time, on their own slow loop -- never gated to ERUPT_PERIOD, so the
// mound reads "hot" even in the ~54% of the cycle the fountain is dormant
// (the one thing a dormant geyser needs to read as a geyser and not a UFO
// collar). Same golden-angle-fan trick as DROPS above, just slower and paler.
export const STEAM_COUNT = 7;
export const STEAM_PERIOD = 3.4; // s: one puff's own rise-and-fade loop
export const STEAM = Array.from({ length: STEAM_COUNT }, (_, i) => ({
  angle: i * GOLDEN,
  radius: 0.12 + 0.22 * ((i * 0.41) % 1),
  offset: i / STEAM_COUNT, // staggered around the loop, never in sync
  apex: 1.3 + 0.9 * ((i * 0.618) % 1),
}));

// THE FROZEN SPLASH: one crown of spray, its shape fixed for good (never
// animated), standing beside the vent at the live jet's own apex height --
// the same eruption, always, caught and kept.
export function buildFrozenSplash() {
  const n = 14;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    const r = 0.55 + 0.25 * ((i * 0.37) % 1);
    const y = VENT_H + 1.6 + 0.5 * Math.sin(i * 2.1);
    out.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, scale: 0.14 + 0.08 * ((i * 0.53) % 1) });
  }
  // a few climbing higher, the jet's own last moment
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 1.1;
    out.push({ x: Math.cos(a) * 0.22, y: VENT_H + 2.6 + i * 0.22, z: Math.sin(a) * 0.22, scale: 0.1 });
  }
  return out;
}
