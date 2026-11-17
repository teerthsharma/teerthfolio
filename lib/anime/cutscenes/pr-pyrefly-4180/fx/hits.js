// THE DRAWN MARKS of the live cutscene in the page's own ink, flat to the lens: the paper star that turns the character back into the pale pup (BACK),
// the burst star at the pin, the clack's veil and slivers, the speed lines of each Flying Thunder God flash, the hoop's ring and the fold's torn cream wipe.
// Positions are frame fractions in cel units (x across the frame in frame heights, y down), projected from the rig frame with the dock's turn.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { BACK, DOCK, FOX, FTG, HIT, KUNAI, TURN } from "../clock.js";
import { toned } from "../tone.js";

const CREAM = toned("#e9dcc0"), PLUM = toned("#1d1240"), CORAL = toned("#ff6b57"), YEL = toned("#ffd400"), YEL2 = toned("#fff6a0"), LILAC = toned("#c8a8ff");
const HOOP = [0, 1, 2].map((k) => (KUNAI[2][k] + FOX[k]) / 2);
const C = Math.cos(TURN), S = Math.sin(TURN);
const hash = (a, b = 0) => { let h = Math.imul((a | 0) ^ Math.imul(b | 0, 0x27d4eb2d), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const toWorld = (p) => new Vector3(C * p[0] + S * p[2] + DOCK[0], p[1] + DOCK[1], -S * p[0] + C * p[2] + DOCK[2]);

function star(B, cx, cy, r, tips, inner, seed, col) {
  const ring = [];
  for (let i = 0; i < 2 * tips; i++) {
    const a = (i / (2 * tips)) * Math.PI * 2 + seed, q = r * (i % 2 ? inner : 1) * (0.92 + 0.16 * hash(i, 31));
    ring.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]);
  }
  B.fan(cx, cy, ring, col);
}
function disc(B, cx, cy, r, col) {
  const ring = Array.from({ length: 16 }, (_, i) => [cx + Math.cos((i / 16) * Math.PI * 2) * r, cy + Math.sin((i / 16) * Math.PI * 2) * r]);
  B.fan(cx, cy, ring, col);
}
function seg(B, x0, y0, x1, y1, w, col, a = 1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * (w / 2), ny = (dx / L) * (w / 2);
  B.tri(x0 + nx, y0 + ny, x0 - nx, y0 - ny, x1 - nx, y1 - ny, col, a);
  B.tri(x0 + nx, y0 + ny, x1 - nx, y1 - ny, x1 + nx, y1 + ny, col, a);
}
function ring(B, cx, cy, r0, r1, col, n = 28) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    B.tri(cx + c0 * r0, cy + s0 * r0, cx + c0 * r1, cy + s0 * r1, cx + c1 * r1, cy + s1 * r1, col);
    B.tri(cx + c0 * r0, cy + s0 * r0, cx + c1 * r1, cy + s1 * r1, cx + c1 * r0, cy + s1 * r0, col);
  }
}

export function buildHits(ctx) {
  const group = new Group();
  const proj = (p, A) => {
    const cam = ctx.player?.camera;
    if (!cam) return null;
    const v = toWorld(p).project(cam);
    return v.z > 1 ? null : [(v.x * 0.5 + 0.5) * A, 0.5 - v.y * 0.5];
  };
  const inBox = (u, v) => { const b = ctx.player?.box; return Boolean(b) && u >= b[0] && u <= b[2] && v >= b[1] && v <= b[3]; };

  const poof = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
    if (f < 0 || f > 5 || !box) return;
    const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
    if (f < 2) { for (const [k, c] of [[1, PLUM], [0.965, CREAM], [0.6, PLUM], [0.56, CREAM]]) star(B, cx, cy, r * k, 11, 0.66, f * 0.4 + (k < 0.7 ? 0.14 : 0), c); return; }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + hash(i, 5) * Math.PI * 2, q = r * (0.8 + 0.3 * hash(i, 6)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
      B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 2 ? PLUM : CREAM);
    }
  } });

  const marks = makeCel(ctx.engine, { max: 1600, order: 1250, behind: true, draw(B, ts, A) {
    const pf = ctx.pf, pin = pf?.pinAt ? proj(pf.pinAt, A) : null;
    const bf = Math.floor((ts - HIT.burst) * 24 + 1e-6);
    if (pin && bf >= 0 && bf < 4) {
      const r = 0.2 + 0.05 * bf;
      star(B, pin[0], pin[1], r, 11, 0.55, bf * 0.3, CREAM);
      star(B, pin[0], pin[1], r * 0.8, 11, 0.55, 0.15 + bf * 0.3, CORAL);
      disc(B, pin[0], pin[1], r * 0.4, CREAM);
    }
    const cl = Math.floor((ts - HIT.pin) * 24 + 1e-6);
    if (pin && cl >= 0 && cl < 4) {
      if (cl === 0) B.rect(0, 0, A, 1, CREAM, 0.5);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + hash(i, 41) * 0.6, d = (0.25 + 0.35 * (cl / 3)) * (0.9 + 0.2 * hash(i, 42)), w = 0.006 + 0.008 * hash(i, 43);
        const x0 = pin[0] + Math.cos(a) * (d - 0.08), y0 = pin[1] + Math.sin(a) * (d - 0.08), x1 = pin[0] + Math.cos(a) * d, y1 = pin[1] + Math.sin(a) * d;
        seg(B, x0, y0, x1, y1, w + 0.008, PLUM);
        seg(B, x0, y0, x1, y1, w, CREAM);
      }
    }
    FTG.forEach((t0, k) => {
      if (ts < t0 || ts >= t0 + 0.45) return;
      const f = Math.floor((ts - t0) * 24 + 1e-6);
      for (let i = 0; i < 24; i++) {
        let x = 0, y = 0;
        for (let tr = 0; tr < 6; tr++) { x = hash(i + 100 * k, f * 7 + tr) * A; y = hash(i + 100 * k, f * 7 + tr + 50); if (!inBox(x / A, y)) break; }
        const ang = 0.7 + (hash(i, 51 + k) - 0.5) * 0.3, len = 0.3 + 0.6 * hash(i, 52 + f), w = 0.002 + 0.006 * hash(i, 53);
        seg(B, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, w, i % 2 ? YEL : YEL2);
      }
    });
    const hp = pf?.hoopAt ?? HOOP, hoop = proj(hp, A);
    const hf = Math.floor((ts - HIT.hoop) * 24 + 1e-6);
    if (hoop && hf >= 0 && hf < 3) { const r = 0.1 + 0.03 * hf; ring(B, hoop[0], hoop[1], r + 0.012, r + 0.03, CREAM); ring(B, hoop[0], hoop[1], r, r + 0.022, LILAC); if (hf === 0) disc(B, hoop[0], hoop[1], 0.05, CREAM); }
  } });

  const fold = makeCel(ctx.engine, { max: 400, order: 1270, draw(B, ts, A) {
    if (ts < 26.0 || ts >= 26.5) return;
    const w = 0.7 * Math.sin(Math.PI * ((ts - 26.0) / 0.5));
    if (w < 0.005) return;
    const N = 24, edge = A * (1 - w), xs = [];
    for (let i = 0; i <= N; i++) xs.push(edge - (hash(i, 61) < 0.5 ? 0 : 0.03 + 0.03 * hash(i, 62)));
    for (let i = 0; i < N; i++) {
      const y0 = i / N, y1 = (i + 1) / N;
      B.tri(A, y0, xs[i], y0, xs[i + 1], y1, CREAM, 0.85);
      B.tri(A, y0, xs[i + 1], y1, A, y1, CREAM, 0.85);
    }
  } });

  group.add(poof.group, marks.group, fold.group);
  return {
    group,
    update(t, cue) { poof.update(t, cue); marks.update(t, cue); fold.update(t, cue); },
    dispose() { poof.dispose(); marks.dispose(); fold.dispose(); },
  };
}
