// HITS of Railgun on the cel layer, in the style's inks and behind the seal: the gather of the charge, the turn panel and the shot panel.
// Each panel is a flat drafting sheet with corner marks and a double rule; strokes stay seven drawings after their panel.
import { Vector3 } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { AMBER, CREAM, CYAN, NAVY } from "../palette.js";

const STAY = 7 / 24, PX = 1 / 720;
const C = { NAVY: rgb(NAVY), CREAM: rgb(CREAM), CYAN: rgb(CYAN), AMBER: rgb(AMBER) };
const hash = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
const seedOf = (b) => Math.round(b.t * 10);

function spikes(B, cx, cy, n, r0, seed, col, edge, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
    for (const [c, g] of edge ? [[edge, 0.014], [col, 0]] : [[col, 0]]) B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c);
  }
}

function ring(B, cx, cy, R, w, col, n = 56) {
  const p = Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
  B.ribbon(p, p.map(() => w / 2), col);
}

function stroke(B, A, hx, hy, ang, len, wid, edge) {
  const n = 14, pts = [], we = [], wc = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, d = (u - 0.5) * len, w = Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25;
    pts.push([A / 2 + (hx + Math.cos(ang) * d) * 0.5, 0.5 - (hy + Math.sin(ang) * d) * 0.5]);
    we.push(w); wc.push(w * 0.46);
  }
  B.ribbon(pts, we, edge);
  B.ribbon(pts, wc, C.CREAM);
}

// drafting marks: L ticks at the four corners and a double rule, in one ink
function marks(B, A, col) {
  const L = 0.035, m = 0.02, w = 2.5 * PX, t = 1.5 * PX;
  const bar = (x0, y0, x1, y1) => B.rect(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), col);
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [A - m, m, -1, 1], [m, 1 - m, 1, -1], [A - m, 1 - m, -1, -1]]) {
    bar(x, y, x + sx * L, y + sy * w);
    bar(x, y, x + sx * w, y + sy * L);
  }
  for (const d of [0.02, 0.036]) {
    bar(d, d, A - d, d + t); bar(d, 1 - d - t, A - d, 1 - d); bar(d, d, d + t, 1 - d); bar(A - d - t, d, A - d, 1 - d);
  }
}

export function hitCel(ctx, hits) {
  const V = new Vector3();
  const place = (at, A) => {
    const c = ctx.player?.camera, w = at === "hand" ? ctx.seal.named?.()?.handR : at === "seal" ? ctx.seal.chest(new Vector3()) : null;
    if (!w || !c) return Array.isArray(at) ? [at[0] * A, at[1]] : [A / 2, 0.5];
    V.copy(w).project(c);
    return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };
  const gather = (B, b, age, A, cx, cy) => {
    const k = b.rev ? 1 - age / b.dur : age / b.dur, f = Math.floor(age * 12 + 1e-6);
    spikes(B, cx, cy, Math.round(12 + 44 * k * k), 0.62 - 0.36 * k, seedOf(b) + f * 13, C.CREAM, C.NAVY, 0.18 + 0.45 * k);
  };
  const shotPanel = (B, b, age, A, cx, cy, hx, hy) => {
    const f = Math.floor(age * 24 + 1e-6), dark = f === 0, field = dark ? C.NAVY : C.CREAM, line = dark ? C.CREAM : C.NAVY;
    B.rect(0, 0, A, 1, field);
    spikes(B, cx, cy, 44, 0.24 + 0.05 * f, seedOf(b) + f * 7, line, null);
    ring(B, cx, cy, 0.1 + 0.1 * Math.min(f, 3), 0.012, C.AMBER);
    for (const [dx, dy, ang, len, wid] of b.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang, len * (dark ? 0.8 : 1), wid, C.AMBER);
    marks(B, A, line);
  };
  const turnPanel = (B, b, age, A, cx, cy) => {
    const f = Math.floor(age * 24 + 1e-6);
    B.rect(0, 0, A, 1, C.NAVY);
    spikes(B, cx, cy, 44, 0.24 + 0.05 * f, seedOf(b) + f * 7, C.CYAN, null);
    ring(B, cx, cy, 0.1 + 0.1 * Math.min(f, 3), 0.012, C.AMBER);
    marks(B, A, C.CYAN);
  };
  const cel = makeCel(ctx.engine, {
    max: 40000, order: 1200, behind: true,
    draw(B, ts, A) {
      for (const b of hits) {
        const age = ts - b.t;
        if (age < 0) continue;
        const [cx, cy] = place(b.at, A), hx = (cx - A / 2) * 2, hy = (0.5 - cy) * 2;
        if (b.name === "gather") { if (age < b.dur) gather(B, b, age, A, cx, cy); continue; }
        if (age < b.dur) (b.kind === "turn" ? turnPanel(B, b, age, A, cx, cy) : shotPanel(B, b, age, A, cx, cy, hx, hy));
        else if (age < b.dur + STAY) {
          const k = 1 - (age - b.dur) / STAY;
          for (const [dx, dy, ang, len, wid] of b.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang + 0.02, len, wid * (0.25 + 0.3 * k), C.AMBER);
        }
      }
    },
  });
  return { group: cel.group, update: (t, cue) => cel.update(t, cue), dispose: () => cel.dispose() };
}
