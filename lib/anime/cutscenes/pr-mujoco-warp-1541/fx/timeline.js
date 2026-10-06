// FX timeline for pr-mujoco-warp-1541. Bible frames are 24 fps; the run is 336 f = 14.0 s.
// Every FX is a PURE FUNCTION of the clock t (seconds), so scrubbing == playing.
// Cue override: if the DIRECTION agent fires a beat with one of the names below, its start time replaces the default.
//   cue names read: "crouch" "aura" "lightning" "rocks" "crack" "slide" "inkring" "skyshift" "skyout" "forest" "sealglow"
export const F = (f) => f / 24;
export const DEF = {
  crouch: F(72), aura: F(96), lightning: F(110), rocks: F(110), speed: F(144), crack: F(168),
  slide: F(180), inkring: F(204), skyshift: F(96), skyout: F(216), forest: F(216), sealglow: F(276), end: F(330),
};
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const kin = (t, a, b) => clamp01((t - a) / (b - a));

// start time of a beat if it has fired, else the bible default.
function at(cue, name, def) {
  try { const s = cue.since(name); if (Number.isFinite(s)) return cue.t - s; } catch (e) { /* no such beat */ }
  return def;
}
export function resolve(cue) {
  const T = { ...DEF };
  for (const k of ["crouch", "aura", "lightning", "rocks", "crack", "slide", "inkring", "skyshift", "skyout", "forest", "sealglow"]) T[k] = at(cue, k, DEF[k]);
  T.speed = DEF.speed + (T.crack - DEF.crack);
  return T;
}

// power(t): 0 before the crouch, 0.4 at f96 (violet envelope at 40%), 1.0 at f168, holds 1 (gold) to the end.
export function power(t, T) {
  if (t < T.crouch) return 0;
  if (t < T.aura) return 0.4 * sstep(T.crouch, T.aura, t);
  if (t < T.crack) return 0.4 + 0.6 * sstep(T.aura, T.crack, t);
  return 1;
}
// blow-out: the aura bursts to 1.5x at the crack and returns to 1 over 0.6 s (ease-out).
export function blow(t, T) { const k = kin(t, T.crack, T.crack + 0.6); return t < T.crack ? 1 : 1 + 0.5 * (1 - k) * (1 - k); }
