// The kill (B5, 8.0 to 8.5 s on the 24 fps grid): rings gather on the palm (k 0 to 7), the beam crosses to Lucifer (k 8), smoke (k 11). k 9 and 10 are frame-law beats.
import { rgb, makeCel } from "../../../kit/fx/cel.js";
import { bandOf } from "../cams.js";
import { kOf } from "../clock.js";
import { layout } from "../layout.js";

const RED = "#ff2a3a", MID = "#ffb0b0", CORE = "#ffe2e0", SMOKE = "#2a0610";
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

function disc(B, c, r, col, a = 1) {
  const pts = [];
  for (let i = 0; i < 24; i++) { const an = (i / 24) * Math.PI * 2; pts.push([c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r]); }
  B.fan(c[0], c[1], pts, rgb(col), a);
}

function beam(B, p, q, layers, a) {
  for (const [w, col] of layers) B.ribbon([p, q], [w / 2, w / 2], rgb(col), a);
}

export function makeKill(ctx) {
  let row = null;
  const fx = makeCel(ctx.engine, {
    max: 2000, order: 1210, behind: false,
    draw(B, ts, A, cue) {
      const k = kOf(cue?.t ?? ts);
      if (k < 0 || k === 9 || k === 10) return;
      const r = row ?? layout(ts), P = palmAt(r, A);
      if (k < 8) {
        const tau = Math.min(1, k / 8);
        for (let n = 0; n < 3; n++) ring(B, P, 0.1 * (1 - tau) ** 2 + 0.02 + 0.03 * n, 0.004, RED);
        if (tau > 0) disc(B, P, 0.015 * tau, CORE);
        return;
      }
      const Q = chestAt(r, A);
      if (k === 8) beam(B, P, Q, [[0.09, RED], [0.045, MID], [0.01, CORE]], 1);
      else beam(B, P, Q, [[0.06, SMOKE]], 0.6);
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
