// The kill (B5, 8.0 to 8.5 s on the 24 fps grid): rings gather on the palm (k 0 to 7), one tapered bolt with a star burst crosses to Lucifer (k 8), smoke (k 11). k 9 and 10 are frame-law beats.
import { rgb, makeCel } from "../../../kit/fx/cel.js";
import { bandOf } from "../cams.js";
import { kOf } from "../clock.js";
import { layout } from "../layout.js";

const RED = "#ff2a3a", MID = "#ffb0b0", CORE = "#ffe2e0", SMOKE = "#2a0610";
const SEG = 14;
const JAG = (i) => 1 + 0.08 * (i % 2 ? 1 : -1);
const TAPER = (s) => (s < 0.8 ? 0.03 + 0.07 * Math.min(1, s / 0.25) : 0.1 - 0.25 * (s - 0.8));
const cel = (u, v, A) => { const { bar, h } = bandOf(A); return [u * A, bar + v * h]; };
const palmAt = (r, A) => cel(r.palm.u, 1 - r.palm.up, A);
const chestAt = (r, A) => (r.foe ? cel(r.foe.u, r.foe.v - 0.5 * r.foe.hh, A) : cel(r.palm.u + 0.5, 1 - r.palm.up, A));

function ring(B, c, r, w, col) {
  const N = 48, out = [], inn = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, x = Math.cos(a), y = Math.sin(a);
    out.push([c[0] + x * (r + w / 2), c[1] + y * (r + w / 2)]);
    inn.push([c[0] + x * (r - w / 2), c[1] + y * (r - w / 2)]);
  }
  B.strip(out, inn, rgb(col));
}

function disc(B, c, r, col) {
  const pts = [];
  for (let i = 0; i < 24; i++) { const an = (i / 24) * Math.PI * 2; pts.push([c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r]); }
  B.fan(c[0], c[1], pts, rgb(col));
}

function star(B, c, rOuter, rInner, col) {
  const pts = [];
  for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? rInner : rOuter; pts.push([c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r]); }
  B.fan(c[0], c[1], pts, rgb(col));
}

function bolt(B, P, Q) {
  const dx = Q[0] - P[0], dy = Q[1] - P[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const layer = (scale, w, col) => {
    const L = [], R = [];
    for (let i = 0; i < SEG; i++) {
      const s = i / (SEG - 1), half = (w(s) * JAG(i) * scale) / 2, x = P[0] + dx * s, y = P[1] + dy * s;
      L.push([x + nx * half, y + ny * half]); R.push([x - nx * half, y - ny * half]);
    }
    B.strip(L, R, rgb(col));
  };
  layer(1, TAPER, RED);
  layer(0.55, TAPER, MID);
  layer(1, () => 0.012, CORE);
}

export function makeKill(ctx) {
  let row = null;
  const fx = makeCel(ctx.engine, {
    max: 2000, order: 1210, behind: false,
    draw(B, ts, A) {
      const k = kOf(ts);
      if (k < 0 || k === 9 || k === 10) return;
      const r = row ?? layout(ts), P = palmAt(r, A);
      if (k < 8) {
        const tau = Math.min(1, k / 8);
        for (let n = 0; n < 3; n++) ring(B, P, 0.1 * (1 - tau) ** 2 + 0.02 + 0.03 * n, 0.004, RED);
        if (tau > 0) disc(B, P, 0.015 * tau, CORE);
        return;
      }
      const Q = chestAt(r, A);
      if (k === 11) { B.ribbon([P, Q], [0.03, 0.03], rgb(SMOKE), 0.6); return; }
      bolt(B, P, Q);
      star(B, Q, 0.09, 0.09 * (0.03 / 0.07), RED);
      star(B, Q, 0.07, 0.03, CORE);
      disc(B, P, 0.05, CORE);
    },
  });
  return {
    group: fx.group,
    update(t, cue, layoutRow) {
      row = layoutRow ?? layout(t);
      fx.update(t, cue);
    },
    dispose() { fx.dispose(); },
  };
}
