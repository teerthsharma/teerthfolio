// CAST helpers for p-nerve (own folder only). Everything is a pure function of the clock t, so a scrubbed frame equals a played one.
import { Group, Mesh, MeshBasicMaterial, SphereGeometry, CylinderGeometry } from "three";

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, k) => a + (b - a) * k;
// smoothstep(a, b, x) = 3u^2 - 2u^3, u = clamp((x - a) / (b - a))
export const sm = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const win = (t, a, b, ra = 0.15, rb = 0.15) => sm(a, a + ra, t) * (1 - sm(b - rb, b, t));
export const decay = (since, rate) => (since >= 0 && Number.isFinite(since) ? Math.exp(-rate * since) : 0);

// the bible's absolute SCENE times (s). The direction layer's beat of the same name overrides them (cue.since gives the start).
export const TL = {
  apple: 1.9, take: 3.25, strokes: 3.7, strokesEnd: 5.25, bite1: 4.1, bite2: 4.85, bite3: 5.65, write: 5.4,
  toll1: 7.0, toll2: 8.1, toll3: 9.2, flare: 9.95, flick: 10.4, core: 10.65, bag: 10.9, page: 11.7, pageEnd: 12.3,
  crack: 12.9, eat: 13.6, lineC: 17.6, credit: 26, collapse: 30.2,
};
// the clock of a named beat: when it started (direction layer) or the bible's own time
export function T(cue, name) {
  const s = cue?.since?.(name);
  return Number.isFinite(s) ? cue.t - s : TL[name];
}
// time since the most recent of the three tolls (Infinity before the first)
export function sinceToll(cue, t) {
  let s = Infinity;
  for (const n of ["toll1", "toll2", "toll3"]) { const d = t - T(cue, n); if (d >= 0 && d < s) s = d; }
  return s;
}

export const MB = (col, o = {}) => new MeshBasicMaterial({ color: col, ...o });
export const mesh = (geo, col, o) => new Mesh(geo, MB(col, o));
export const L1 = (obj) => { obj.traverse((o) => o.layers.set(1)); return obj; };

// a rigid prop built with the engine's cel figure (shared programs): painted lit/shade pair + ink hull
export function figProp(ctx, geo, col, shade, o = {}) {
  const { painted, paint } = ctx.sdf;
  const f = ctx.engine.figure(painted(geo, paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  if (o.scl) f.scale.set(...o.scl);
  return f;
}
export function pivoted(obj, pivot) {
  const g = new Group();
  g.position.set(...pivot);
  obj.position.set(-pivot[0], -pivot[1], -pivot[2]);
  g.add(obj);
  return g;
}

// the apple: 0.22 m (r 0.11): #d21f1a body, #7a0d0f hard shadow, #ff6a5a hard highlight, #3d2a14 stem (07-ryuuk.jpg). `r` scales it.
export function buildApple(ctx, r = 0.11) {
  const g = new Group();
  g.add(figProp(ctx, new SphereGeometry(r, 18, 12), "#d21f1a", "#7a0d0f", { lineMul: 0.8 }));
  g.add(figProp(ctx, new SphereGeometry(r * 0.2, 8, 6), "#ff6a5a", "#ff6a5a", { pos: [-r * 0.45, r * 0.45, r * 0.78], scl: [1.6, 1, 0.35], lineMul: 0.3 }));
  g.add(figProp(ctx, new CylinderGeometry(r * 0.07, r * 0.09, r * 0.4, 6), "#3d2a14", "#1f150a", { pos: [0, r * 1.0, 0], rot: [0, 0, 0.25], lineMul: 0.5 }));
  return g;
}
