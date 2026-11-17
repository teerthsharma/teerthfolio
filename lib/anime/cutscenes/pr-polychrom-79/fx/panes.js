// PANES for pr-polychrom-79: the crimson stage breaks at REVEAL[0] into a 4 x 3 grid of 24 crimson triangles with gold seams, ranked by distance from the rip, each falling and spinning once its turn comes.
import { rgb, makeCel } from "../../../kit/fx/cel.js";
import { hash } from "../live/parts.js";
import { BREAK, REVEAL } from "../clock.js";
import { PAL } from "../pal.js";

const CRIM = rgb(PAL.crimson), GOLD = rgb(PAL.goldHi), COLS = 4;

// each cell of the grid splits on a seeded diagonal; vertices are [u, v] frame fractions (u across the width)
function tiles(n) {
  const rows = n / COLS / 2, out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
    const u0 = c / COLS, u1 = (c + 1) / COLS, v0 = r / rows, v1 = (r + 1) / rows;
    const TL = [u0, v0], TR = [u1, v0], BL = [u0, v1], BR = [u1, v1];
    const pair = hash(r * COLS + c, 79) < 0.5 ? [[TL, TR, BR], [TL, BR, BL]] : [[TL, TR, BL], [TR, BR, BL]];
    for (const v of pair) out.push(v);
  }
  return out.map((v, i) => ({ v, i, c: [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3] }));
}

// break order: distance of each centroid from the rip, in frame heights
function rankFrom(P, A) {
  const d = P.map((p) => Math.hypot(p.c[0] * A - BREAK.x * A, p.c[1] - BREAK.y));
  const order = [];
  [...d.keys()].sort((a, b) => d[a] - d[b]).forEach((i, r) => { order[i] = r; });
  return order;
}

// the pane after age a: falls with g, drifts with vx = (cx - rip) * drift, spins about its centroid (sign by index)
function move(p, a, A) {
  const cx = p.c[0] * A, cy = p.c[1], dx = (cx - BREAK.x * A) * BREAK.drift * a, dy = 0.5 * BREAK.g * a * a;
  const th = BREAK.spin * a * (p.i % 2 ? 1 : -1), co = Math.cos(th), si = Math.sin(th);
  return p.v.map(([u, v]) => {
    const x = u * A - cx, y = v - cy;
    return [cx + dx + x * co - y * si, cy + dy + x * si + y * co];
  });
}

const gone = (q, A) => {
  const cx = (q[0][0] + q[1][0] + q[2][0]) / 3, cy = (q[0][1] + q[1][1] + q[2][1]) / 3;
  return cy > 1.1 || cx < -0.3 || cx > A + 0.3;
};

const seams = (B, q, col, w) => { for (let i = 0; i < 3; i++) B.ribbon([q[i], q[(i + 1) % 3]], [w / 2, w / 2], col); };

export function buildPanes(ctx) {
  const P = tiles(BREAK.n);
  const cel = makeCel(ctx.engine, {
    max: 4096, order: 50,
    draw(B, ts, A) {
      if (ts < REVEAL[0] || ts >= REVEAL[1]) return;
      const age = ts - REVEAL[0], f = Math.floor(age * 24 + 1e-6), order = rankFrom(P, A);
      for (const p of P) {
        const a = age - BREAK.delay * order[p.i];
        const q = a > 0 ? move(p, a, A) : p.v.map(([u, v]) => [u * A, v]);
        if (a > 0 && gone(q, A)) continue;
        B.tri(q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], CRIM);
        if (f > 0) seams(B, q, GOLD, 0.004);
      }
    },
  });
  return { group: cel.group, update: (ts, cue) => cel.update(ts, cue), dispose: () => cel.dispose() };
}
