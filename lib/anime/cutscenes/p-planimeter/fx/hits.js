// The hits as an anime cut draws them, in the style's own inks: the eye glint, the chessboard, CHECKMATE. and the bell are manga panels (a negative,
// then a cream field with ink spikes), the turn back is a paper star. Flat to the lens, behind the seal. Times are real seconds (clock.js).
import { Group } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { BACK, BD, BELL, GL, MT } from "../clock.js";
import { CHECK, CREAM, INK, SCHOOL } from "../palette.js";
import { toned } from "../tone.js";

const C = { ink: toned(INK), cream: toned(CREAM), school: toned(SCHOOL), check: toned(CHECK) };
const STAY = 7 / 24;
const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

// t: real start; n: panel frames at 24 fps; at: a frame point [u, v] or "eye"; gather: when the focus lines start to close
const HITS = [
  { t: GL, n: 2, at: "eye", gather: 7.5 },
  { t: BD, n: 3, at: [0.5, 0.42], board: true, strokes: [[-0.5, 0.4, 0.9, 3.0, 0.2], [0.6, -0.3, -0.4, 2.6, 0.14]] },
  { t: MT, n: 4, at: [0.5, 0.67], gather: 8.75, king: [0.2, 0.9], strokes: [[-0.8, -0.1, -0.5, 3.6, 0.22], [0.6, 0.0, 0.5, 3.0, 0.16], [0.0, 0.2, 1.57, 2.4, 0.1]] },
  { t: BELL, n: 1, at: [0.16, 0.34], ring: 12 },
];

export const panelOn = (t) => HITS.some((h) => t - h.t >= 0 && t - h.t < h.n / 24);

const wedge = (B, cx, cy, a, r, w, col) => {
  const dx = Math.cos(a), dy = Math.sin(a);
  B.tri(cx + dx * r, cy + dy * r, cx + dx * 2.6 - dy * (w / 2), cy + dy * 2.6 + dx * (w / 2), cx + dx * 2.6 + dy * (w / 2), cy + dy * 2.6 - dx * (w / 2), col);
};
const spikes = (B, cx, cy, n, r0, seed, col, k = 1) => {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k;
    wedge(B, cx, cy, a, r, w, col);
  }
};
const stroke = (B, A, hx, hy, ang, len, wid, edge) => {
  const n = 14, pts = [], we = [], wc = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, d = (u - 0.5) * len, w = Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25;
    pts.push([A / 2 + (hx + Math.cos(ang) * d) * 0.5, 0.5 - (hy + Math.sin(ang) * d) * 0.5]);
    we.push(w); wc.push(w * 0.46);
  }
  B.ribbon(pts, we, edge);
  B.ribbon(pts, wc, C.cream);
};
// the chessboard's dark squares in the live overlay's perspective, shifted by dx
const squares = (B, A, dx, col) => {
  const y0 = 0.42, yAt = (r) => y0 + (1 - y0) * (1 - (1 - r / 8) ** 1.7), wAt = (y) => 0.36 + 0.9 * ((y - y0) / (1 - y0));
  for (let r = 0; r < 8; r++) {
    const ya = yAt(r), yb = yAt(r + 1), wa = wAt(ya), wb = wAt(yb), x = (side, w) => (0.5 - w / 2 + (w * side) / 8) * A + dx;
    for (let i = 0; i < 8; i++) {
      if ((i + r) % 2) continue;
      B.tri(x(i, wa), ya, x(i + 1, wa), ya, x(i + 1, wb), yb, col);
      B.tri(x(i, wa), ya, x(i + 1, wb), yb, x(i, wb), yb, col);
    }
  }
};
const king = (B, cx, cy, s, col) => {
  const P = (x, y) => [cx + x * s, cy + y * s];
  const body = [];
  for (let i = 0; i <= 6; i++) { const u = i / 6, a = (1 - u) ** 2, b = 2 * (1 - u) * u, c = u * u; body.push([-0.34 * a - 0.3 * b - 0.12 * c, -0.22 * b - 0.5 * c]); }
  body.push([-0.2, -0.56], [0.2, -0.56], [0.12, -0.5]);
  for (let i = 0; i <= 6; i++) { const u = i / 6, a = (1 - u) ** 2, b = 2 * (1 - u) * u, c = u * u; body.push([0.12 * a + 0.3 * b + 0.34 * c, -0.5 * a - 0.22 * b]); }
  const ring = body.map(([x, y]) => P(x, y)), mid = P(0, -0.3);
  B.fan(mid[0], mid[1], ring, col);
  const head = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return P(Math.cos(a) * 0.17, -0.74 + Math.sin(a) * 0.17); });
  B.fan(P(0, -0.74)[0], P(0, -0.74)[1], head, col);
  B.rect(...P(-0.035, -1.2), ...P(0.035, -0.94), col);
  B.rect(...P(-0.12, -1.12), ...P(0.12, -1.05), col);
};
const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31)); return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), col);

export function buildHits(ctx) {
  const group = new Group();
  const cam = () => ctx.player?.camera;
  const eyeAt = (A) => {
    const c = cam(), eye = ctx.seal.named?.()?.eyeR;
    if (!c || !eye) return [A / 2, 0.4];
    const v = eye.clone().project(c);
    return v.z > 1 ? [A / 2, 0.4] : [(v.x * 0.5 + 0.5) * A, 0.5 - v.y * 0.5];
  };
  const centre = (h, A) => (h.at === "eye" ? eyeAt(A) : [h.at[0] * A, h.at[1]]);

  const panel = (B, A, H, h, f, cx, cy, hx, hy) => {
    const dark = f === 0 && !h.ring, field = dark ? C.ink : C.cream, line = dark ? C.cream : C.ink;
    B.rect(0, 0, A, 1, field);
    if (h.board) {
      for (let i = 0; i < 16; i++) wedge(B, cx, cy, Math.atan2(1 - cy, (0.5 + (i / 15 - 0.5) * 1.8) * A - cx), 0.2 + 0.1 * hash(i, f), 0.04 + 0.05 * hash(i, 9), line);
      squares(B, A, f === 1 ? 5 / H : 0, line);
    } else if (h.ring) {
      spikes(B, cx, cy, h.ring, 0.2, 7, line);
    } else {
      spikes(B, cx, cy, 44, 0.24 + 0.05 * f, 7 + f * 7, line);
    }
    if (h.king && !dark) king(B, h.king[0] * A, h.king[1], 0.36, C.ink);
    for (const [dx, dy, ang, len, wid] of h.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang + (f - 1) * 0.02, len * (dark ? 0.8 : 1), wid * (dark ? 0.7 : 1), C.check);
  };

  const cel = makeCel(ctx.engine, {
    max: 20000, order: 1200, behind: true,
    draw(B, ts, A) {
      const H = ctx.engine.shared.uRes.value.y;
      for (const h of HITS) {
        const [cx, cy] = centre(h, A), hx = (cx - A / 2) * 2, hy = (0.5 - cy) * 2;
        if (h.gather != null && ts >= h.gather && ts < h.t) {
          const span = h.t - h.gather, k = Math.min(1, Math.floor((ts - h.gather) * 12 + 1e-6) / 12 / span);
          for (let i = 0; i < 24; i++) {
            const a = ((i + 0.5) / 24) * Math.PI * 2 + 0.12 * hash(i, 2), r1 = 0.1 + 0.9 * (1 - k), r0 = 0.1 + 0.5 * (1 - k), w = 0.004 + 0.004 * hash(i, 3);
            B.ribbon([[cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]], [w, w * 0.4], C.cream);
          }
        }
        const age = ts - h.t, pl = h.n / 24;
        if (age >= 0 && age < pl) panel(B, A, H, h, Math.floor(age * 24 + 1e-6), cx, cy, hx, hy);
        else if (h.strokes && age >= pl && age < pl + STAY) {
          const k = 1 - (age - pl) / STAY;
          for (const [dx, dy, ang, len, wid] of h.strokes) stroke(B, A, hx + dx, hy + dy, ang, len, wid * (0.25 + 0.3 * k), C.check);
        }
      }
      const box = ctx.player?.box, age = ts - BACK, f = Math.floor(age * 24 + 1e-6);
      if (box && f >= 0 && f <= 5) {
        const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
        if (f < 2) for (const [k, col] of [[1, C.ink], [0.965, C.cream], [0.6, C.school], [0.56, C.cream]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), col);
        else for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)) + 0.03 * (f - 2), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
          B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 2 ? C.ink : C.cream);
        }
      }
    },
  });
  group.add(cel.group);

  return {
    group,
    update(t, cue) { cel.update(t, cue); },
    dispose() { cel.dispose(); },
  };
}
