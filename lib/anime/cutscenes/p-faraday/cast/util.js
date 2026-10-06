// CAST helpers for p-faraday (own folder only). Pure functions of the clock, so a scrubbed frame equals a played one.
import { Group, Mesh, MeshBasicMaterial } from "three";

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, k) => a + (b - a) * k;
// smoothstep(a, b, x) = 3u^2 - 2u^3, u = clamp((x - a) / (b - a))
export const sm = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
// a window with smooth in and out: 1 inside [a, b], ramps of length ra / rb
export const win = (t, a, b, ra = 0.15, rb = 0.15) => sm(a, a + ra, t) * (1 - sm(b - rb, b, t));

// the clock of a named beat: the time it started (from the direction layer's beats) or the bible's own absolute time
export function T(cue, name, abs) {
  const s = cue?.since?.(name);
  return Number.isFinite(s) ? cue.t - s : abs;
}

export const MB = (col, o = {}) => new MeshBasicMaterial({ color: col, ...o });
export const mesh = (geo, col, o) => new Mesh(geo, MB(col, o));
export const L1 = (obj) => { obj.traverse((o) => o.layers.set(1)); return obj; };

// a rigid costume prop built with the engine's cel figure (shared programs): painted SDF-paint colours + ink hull
export function figProp(ctx, geo, col, shade, o = {}) {
  const { painted, paint } = ctx.sdf;
  const f = ctx.engine.figure(painted(geo, paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  if (o.scl) f.scale.set(...o.scl);
  return f;
}

// wrap `obj` so that it scales / rotates about `pivot` (in obj's own frame) instead of its origin
export function pivoted(obj, pivot) {
  const g = new Group();
  g.position.set(...pivot);
  obj.position.set(-pivot[0], -pivot[1], -pivot[2]);
  g.add(obj);
  return g;
}
