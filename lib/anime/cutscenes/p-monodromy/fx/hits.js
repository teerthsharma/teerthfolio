// The hits of p-monodromy as a manga page draws them: each panel is a one-frame negative, then flat drawings on the 24 grid,
// behind the seal (wedges, the bolt, a star, a ring); the gather lines close on the hand. Also the turn-back star and the island's snow.
import { Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { R } from "../clock.js";
import { PAL, toned } from "../tone.js";

const INK = toned(PAL.ink), GOLD = toned(PAL.gold), CRIMSON = toned(PAL.crimson), CREAM = toned(PAL.cream);
const CYAN = toned(PAL.cyan), NAVY = toned(PAL.navy), WHITE = toned("#fbfaf7"), BOLT = toned(PAL.bolt), SPARK = toned("#4fe3ff"), FLAKE = toned("#bff6f0");
const STAY = 7 / 24;
const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const FLAKES = Array.from({ length: 60 }, (_, i) => ({ x: hash(i, 22), y: hash(i, 23), z: 0.35 + 0.65 * hash(i, 21) }));

// spikes from (cx, cy): wedges whose tips start short of the centre (jittered) and run past the frame; `edge` is a wider tone under each
function wedges(B, cx, cy, n, r0, seed, col, edge = null, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k;
    const dx = Math.cos(a), dy = Math.sin(a), e = edge ? 0.014 : 0;
    if (edge) B.tri(cx + dx * (r - 0.012), cy + dy * (r - 0.012), cx + dx * 2.6 - dy * (w / 2 + e), cy + dy * 2.6 + dx * (w / 2 + e), cx + dx * 2.6 + dy * (w / 2 + e), cy + dy * 2.6 - dx * (w / 2 + e), edge);
    B.tri(cx + dx * r, cy + dy * r, cx + dx * 2.6 - dy * (w / 2), cy + dy * 2.6 + dx * (w / 2), cx + dx * 2.6 + dy * (w / 2), cy + dy * 2.6 - dx * (w / 2), col);
  }
}

// a tapered speed line through (x, y), length len, along ang
function stroke(B, x, y, ang, len, wid, col) {
  const pts = [], ws = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, d = (u - 0.5) * len;
    pts.push([x + Math.cos(ang) * d, y + Math.sin(ang) * d]);
    ws.push(Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25);
  }
  B.ribbon(pts, ws, col);
}

// the strike's bolt: a jagged ribbon from the top right to (x, y), ink outline, cyan fringe, white core
function bolt(B, A, x, y, seed) {
  const sx = A * 0.96, sy = -0.02, pts = [[sx, sy]];
  for (let i = 1; i <= 7; i++) {
    const u = i / 8, j = (hash(i, seed) - 0.5) * 0.09;
    pts.push([sx + (x - sx) * u + j, sy + (y - sy) * u + j * 0.6]);
  }
  pts.push([x, y]);
  const w = pts.map((_, i) => (i === 0 ? 0.004 : 0.0025 + 0.002 * hash(i, seed + 1)));
  B.ribbon(pts, w.map((v) => v * 2.2), INK);
  B.ribbon(pts, w.map((v) => v * 1.5), SPARK);
  B.ribbon(pts, w.map((v) => v * 0.7), BOLT);
}

function ring(B, cx, cy, r, w, col) {
  const L = [], Rr = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    L.push([cx + c * (r - w / 2), cy + s * (r - w / 2)]); Rr.push([cx + c * (r + w / 2), cy + s * (r + w / 2)]);
  }
  B.strip(L, Rr, col);
}

function star(B, cx, cy, r, n, col) {
  const pts = [];
  for (let i = 0; i < 2 * n; i++) {
    const a = (i / (2 * n)) * Math.PI * 2, q = r * (i % 2 ? 0.34 : 1);
    pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]);
  }
  B.fan(cx, cy, pts, col);
}

// one drawing of a panel: f = 0 is the negative, the rest are the flat page; `b.kind` picks the drawing
function panel(B, A, b, f, cx, cy) {
  const seed = Math.round(b.t * 10) + f * 7, dark = f === 0;
  if (b.kind === "shatter") {
    B.rect(0, 0, A, 1, NAVY);
    wedges(B, cx, cy, 44, 0.24 + 0.05 * f, seed, WHITE, CYAN);
    return;
  }
  if (b.kind === "equip") {
    B.rect(0, 0, A, 1, INK);
    wedges(B, cx, cy, 44, 0.2 + 0.05 * f, seed, CYAN);
    ring(B, cx, cy, 0.3 + 0.07 * f, 0.02, CYAN);
    return;
  }
  B.rect(0, 0, A, 1, dark ? INK : GOLD);
  if (b.kind === "crack") {
    star(B, cx, cy, 0.26 + 0.05 * f, 6, dark ? GOLD : CRIMSON);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.2; stroke(B, cx + Math.cos(a) * 0.2, cy + Math.sin(a) * 0.2, a, 0.5, 0.03, dark ? GOLD : INK); }
    return;
  }
  wedges(B, cx, cy, 44, 0.24 + 0.05 * f, seed, dark ? GOLD : INK);
  if (b.kind === "strike") bolt(B, A, cx, cy, seed);
}

export default function makeHits(ctx) {
  const hits = (ctx.scene.beats ?? []).filter((b) => b.name === "panel" || b.name === "gather");
  const V = new Vector3();
  // a hit's centre in batch units (x 0..A, y 0..1 down): the seal's hand or chest, or a frame point [u, v]
  const centre = (at, A) => {
    if (Array.isArray(at)) return [at[0] * A, at[1]];
    const c = ctx.player?.camera, p = at === "hand" ? ctx.seal.named?.()?.handR : ctx.seal.chest(new Vector3());
    if (!c || !p) return [A / 2, 0.5];
    V.copy(Array.isArray(p) ? new Vector3(...p) : p).project(c);
    return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };

  const cel = makeCel(ctx.engine, {
    max: 40000, order: 1200, behind: true,
    draw(B, ts, A) {
      for (const b of hits) {
        const age = ts - b.t;
        const [cx, cy] = centre(b.at, A);
        if (b.name === "gather") {
          if (age < 0 || age >= b.dur) continue;
          const k = age / b.dur;
          wedges(B, cx, cy, Math.round(12 + 44 * k * k), 0.62 - 0.36 * k, 17 + Math.floor(ts * 12), CREAM, INK, 0.18 + 0.45 * k);
          continue;
        }
        if (age < -1e-6 || age >= b.dur + STAY) continue;
        if (age >= b.dur) {
          const k = 1 - (age - b.dur) / STAY;
          for (const s of b.strokes ?? []) stroke(B, cx + s[0], cy + s[1], s[2] + 0.02, s[3], s[4] * (0.25 + 0.3 * k), INK);
          continue;
        }
        const f = Math.floor(age * 24 + 1e-6);
        panel(B, A, b, f, cx, cy);
        for (const s of b.strokes ?? []) stroke(B, cx + s[0], cy + s[1], s[2] + (f - 1) * 0.02, s[3] * (f ? 1 : 0.8), s[4], INK);
      }
    },
  });

  // the island's snow, while the island is the picture (before the dusk and after the shatter)
  const snow = makeCel(ctx.engine, {
    max: 60 * 2, order: 1190, behind: true,
    draw(B, ts, A) {
      if (ts >= 1.5 && ts < R.back) return;
      for (const f of FLAKES) {
        const x = (((f.x + ts * 0.011 * f.z + 0.012 * Math.sin(ts * 0.9)) % 1) + 1) % 1 * A, y = (f.y + ts * 0.034 * f.z) % 1, r = 0.0022 + 0.0026 * f.z * f.z;
        B.tri(x, y - r, x + r, y, x, y + r, FLAKE);
        B.tri(x, y - r, x, y + r, x - r, y, FLAKE);
      }
    },
  });

  // the turn back: two frames of a gold star over the seal's box (the swap is under it), then flecks fly off on frames 2 to 5
  const poof = makeCel(ctx.engine, {
    max: 600, order: 1260,
    draw(B, ts, A) {
      const f = Math.floor((ts - R.pop) * 24 + 1e-6), box = ctx.player?.box;
      if (f < 0 || f > 5 || !box) return;
      const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
      if (f < 2) {
        for (const [k, c] of [[1, INK], [0.965, GOLD], [0.6, INK], [0.56, CREAM]]) star(B, cx, cy, r * k, 11, c);
        return;
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6) + 0.12 * (f - 2)), w = (0.03 * (6 - f)) / 4;
        const x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
        B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 3 ? INK : GOLD);
      }
    },
  });

  const group = cel.group;
  group.add(snow.group, poof.group);
  return {
    group,
    update(t, cue) {
      cel.update(t, cue);
      snow.update(t, cue);
      poof.update(t, cue);
    },
    dispose() { cel.dispose(); snow.dispose(); poof.dispose(); },
  };
}
