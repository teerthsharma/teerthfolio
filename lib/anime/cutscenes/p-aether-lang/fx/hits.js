// The hit panels of p-aether-lang: flat cel frames behind the seal, and the collide cracks and debris.
import { Group } from "three";
import { makeCracks, makeDebris, rgb } from "../../../kit/fx/cel.js";
import { HIT } from "../clock.js";
import { PAL } from "../palette.js";

export const KINDS = { impact: 3, lock: 2, cry: 3, collide: 4, back: 2 };
const SEED = { impact: 1, lock: 2, cry: 3, collide: 4, back: 5 };
const TAU = Math.PI * 2;

const hash = (i, s) => { let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(s + 7, 0x85ebca6b); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); return ((h ^ (h >>> 12)) >>> 0) / 4294967296; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const hot = (k) => mix(rgb(PAL.purple), rgb("#ffffff"), k);

function spikes(B, cx, cy, n, r0, seed, col, k) {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * TAU, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * (0.6 + 0.8 * k);
    const dx = Math.cos(a), dy = Math.sin(a);
    B.tri(cx + dx * r, cy + dy * r, cx + dx * 2.6 - dy * (w / 2), cy + dy * 2.6 + dx * (w / 2), cx + dx * 2.6 + dy * (w / 2), cy + dy * 2.6 - dx * (w / 2), col);
  }
}

function dots(B, cx, cy, n, col) {
  for (let i = 0; i < n; i++) {
    const a = hash(i, 11) * TAU, d = 0.08 + 0.3 * Math.sqrt(hash(i, 12)), r = 0.012 + 0.018 * hash(i, 13), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    B.fan(x, y, Array.from({ length: 8 }, (_, j) => [x + Math.cos((j / 8) * TAU) * r, y + Math.sin((j / 8) * TAU) * r]), col);
  }
}

function speed(B, cx, cy, A, f) {
  const R = Math.hypot(A, 1) * 1.05, c = rgb(PAL.C4);
  for (let i = 0; i < 70; i++) {
    const a = hash(i, 40 + f) * TAU, r0 = 0.26 * (0.8 + 0.6 * hash(i, 41 + f)) + 0.1 * hash(i, 43 + f), w = 0.002 + 0.01 * hash(i, 42 + f) ** 2, ca = Math.cos(a), sa = Math.sin(a);
    const pa = [cx + ca * r0 - sa * 0.0004, cy + sa * r0 + ca * 0.0004], pb = [cx + ca * r0 + sa * 0.0004, cy + sa * r0 - ca * 0.0004];
    const qa = [cx + ca * R - sa * w, cy + sa * R + ca * w], qb = [cx + ca * R + sa * w, cy + sa * R - ca * w];
    B.tri(pa[0], pa[1], pb[0], pb[1], qb[0], qb[1], c);
    B.tri(pa[0], pa[1], qa[0], qa[1], qb[0], qb[1], c);
  }
}

function ring(B, cx, cy, dx, col) {
  const pts = Array.from({ length: 57 }, (_, i) => { const a = (i / 56) * TAU; return [cx + dx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3]; });
  B.ribbon(pts, pts.map(() => 0.006), col);
}

function star(B, cx, cy, r, col) {
  const pts = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU - Math.PI / 2, q = i % 2 ? r * 0.45 : r; return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; });
  B.fan(cx, cy, pts, col);
}

// one drawing of a hit panel. X = { A (frame aspect), at ([u, v] frame fractions, y down, the seal's centre: the default is the frame centre) }; f = 0..KINDS[kind]-1
export function panelDraw(B, kind, f, X) {
  const A = X.A, [u, v] = X.at ?? [0.5, 0.5], cx = u * A, cy = v, k = f / KINDS[kind];
  const field = kind === "lock" ? PAL.C4 : kind === "cry" ? PAL.deep : kind === "back" ? PAL.flash : f === 0 ? PAL.C4 : PAL.C0;
  B.rect(0, 0, A, 1, rgb(field));
  if (kind === "lock") return dots(B, cx, cy, 16, rgb(PAL.C2));
  if (kind === "cry") return speed(B, cx, cy, A, f);
  if (kind === "back") return star(B, cx, cy, 0.1 + 0.02 * f, rgb(PAL.cream));
  const collide = kind === "collide", col = f === 0 ? rgb(collide ? PAL.C0 : PAL.C2) : hot(k);
  spikes(B, cx, cy, collide ? 18 : 14, 0.3 - 0.2 * k, SEED[kind] * 97 + f * 7, col, k);
  if (collide && f > 0) { ring(B, cx, cy, 0.012, rgb(PAL.blue)); ring(B, cx, cy, -0.012, rgb(PAL.red)); }
}

export function buildBreaks(ctx) {
  const engine = ctx.engine, group = new Group(), start = [0.5, 0.8];
  const cracks = makeCracks(engine, { at2: start, count: 9, len: 0.95, seam: PAL.C4, width: 0.014, fps: 12, hold: 0.9, tau: 0.3, at: HIT.collide, behind: true, order: 1001 });
  const debris = makeDebris(engine, { at2: start, tone: PAL.deep, lit: PAL.C3, count: 22, at: HIT.collide + 1 / 24, behind: true, order: 1001 });
  group.add(cracks.group, debris.group);
  let last = start;
  return {
    group,
    update(t, feet = start) {
      if (Math.abs(feet[0] - last[0]) + Math.abs(feet[1] - last[1]) > 1e-3) { last = feet.slice(); cracks.set({ at2: last }); debris.set({ at2: last }); }
      cracks.update(t);
      debris.update(t);
    },
    dispose() { cracks.dispose(); debris.dispose(); },
  };
}
