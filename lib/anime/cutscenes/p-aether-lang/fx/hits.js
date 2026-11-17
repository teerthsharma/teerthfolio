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

function ring(B, cx, cy, dx, col) {
  const pts = Array.from({ length: 57 }, (_, i) => { const a = (i / 56) * TAU; return [cx + dx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3]; });
  B.ribbon(pts, pts.map(() => 0.006), col);
}

function star(B, cx, cy, r, col) {
  const pts = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU - Math.PI / 2, q = i % 2 ? r * 0.45 : r; return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; });
  B.fan(cx, cy, pts, col);
}

// one drawing of a hit panel, on the transparent layer (no full-frame field): the impact is the live's HUD frame in fx/page.js, the flashes are holdFlash in fx/index.js.
// X = { A (frame aspect), at ([u, v] frame fractions, y down, the seal's centre: the default is the frame centre) }; f = 0..KINDS[kind]-1
export function panelDraw(B, kind, f, X) {
  const [u, v] = X.at ?? [0.5, 0.5], cx = u * X.A, cy = v, k = f / KINDS[kind];
  if (kind === "lock") { dots(B, cx, cy, 16, rgb(PAL.C4)); dots(B, cx, cy, 10, rgb(PAL.C2)); }
  else if (kind === "cry" && f > 0) spikes(B, cx, cy, 14, 0.3 - 0.2 * k, SEED.cry * 97 + f * 7, rgb(PAL.accent), k);
  else if (kind === "back" && f > 0) star(B, cx, cy, 0.1 + 0.02 * f, rgb(PAL.cream));
  else if (kind === "collide" && f > 0) {
    spikes(B, cx, cy, 18, 0.3 - 0.2 * k, SEED.collide * 97 + f * 7, hot(k), k);
    ring(B, cx, cy, 0.012, rgb(PAL.blue)); ring(B, cx, cy, -0.012, rgb(PAL.red));
  }
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
