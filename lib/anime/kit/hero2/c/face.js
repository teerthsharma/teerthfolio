// Face features laid on the head surface as painted cards: eyes (lens grids with per-vertex iris colour), lid lines, the mouth and its
// teeth, the ink marks, whisker dots, whiskers and the cheek-edge fur flicks. All driven by a look's data and an expression row.
import { Vector3 } from "three";
import { PRO } from "./proportions.js";
import { C, blade, merge, mix, sheet, sstep, stroke } from "./surface.js";

const INK = "#150a10";

function eye(S, E, { side, cx, cy, hw, hu, hb, tilt, open, cut, pk, tag }) {
  const parts = [], cs = Math.cos(tilt), sn = Math.sin(tilt), huE = hu * (1 - 0.45 * cut);
  const yU = (uu) => huE * open * Math.max(0, 1 - uu * uu) ** 0.34, yL = (uu) => -hb * Math.max(0.25, open) * Math.max(0, 1 - uu * uu) ** 0.7;
  const world = (lx, ly) => [cx + side * (lx * cs - ly * sn), cy + lx * sn + ly * cs];
  const dark = C(E.dark), iris = C(E.iris), glow = C(E.glow), pup = C("#15040a");
  const R = Math.max(hu + hb, 0.016) * 0.62 * (tag ? 1 : 1.08), ix = hw * 0.12, iy = (yU(0) + yL(0)) * 0.5 - 0.0008;
  if (open > 0.04) {
    parts.push(sheet(S, 40, 16, (u, v) => { const lx = (u * 2 - 1) * hw, uu = lx / hw; return world(lx, yL(uu) + (yU(uu) - yL(uu)) * v); }, (u, v) => {
      const lx = (u * 2 - 1) * hw, uu = lx / hw, ly = yL(uu) + (yU(uu) - yL(uu)) * v, dx = lx - ix, dy = ly - iy, r = Math.hypot(dx, dy * 1.05) / R;
      let c = mix(glow, iris, sstep(0.2, 0.62, r)); c = mix(c, dark, sstep(0.78, 1.04, r));
      const pr = Math.hypot(dx / (R * 0.15 * pk * 1.4), dy / (R * 0.62)); c = mix(c, pup, 1 - sstep(0.7, 1, pr));
      c = mix(c, "#ffe0d6", 0.9 * (1 - sstep(0.1, 0.22, Math.hypot(lx - ix - R * 0.4, ly - iy - R * 0.38) / R)));
      c = mix(c, dark, 0.78 * sstep(yU(uu) - 0.34 * (yU(uu) - yL(uu)), yU(uu), ly));
      return [c, mix(c, "#2a0610", 0.4)];
    }, 0.0016));
    const up = [], lo = [];
    for (let i = 0; i <= 14; i++) { const lx = -hw + (2 * hw * i) / 14, uu = lx / hw; up.push(world(lx, yU(uu))); lo.push(world(lx, yL(uu))); }
    const flick = world(hw + 0.009, yU(0.9) + 0.004 + 0.007 * (tilt > 0.15 ? 1 : 0.4));
    parts.push(stroke(S, [...up, flick], (t) => (tag ? 0.004 : 0.0066) * (0.35 + Math.sin(Math.PI * Math.min(1, t * 1.05)) * 0.65), INK, INK, 0.0026, 0.002));
    parts.push(stroke(S, lo, (t) => 0.0022 * Math.sin(Math.PI * t), INK, INK, 0.0024, 0.002));
  } else {
    const pts = []; for (let i = 0; i <= 14; i++) { const lx = -hw + (2 * hw * i) / 14, uu = lx / hw; pts.push(world(lx, -hb * 0.7 * (1 - uu * uu) ** 0.8 + 0.002)); }
    parts.push(stroke(S, [...pts, world(hw + 0.008, 0.004)], (t) => 0.0052 * (0.4 + Math.sin(Math.PI * t) * 0.6), INK, INK, 0.0022, 0.002));
    for (let k = 0; k < 3; k++) parts.push(stroke(S, [world(hw * (0.3 + 0.3 * k), -hb * 0.6), world(hw * (0.34 + 0.3 * k), -hb * 0.6 - 0.009)], 0.0017, INK, INK, 0.0022));
  }
  return parts;
}

export function eyes(S, look, ex) {
  const E = look.eyes, P = [];
  const W = (E.width ?? PRO.eyeW) / 2;
  for (const side of [1, -1]) {
    P.push(...eye(S, E, { side, cx: side * PRO.eyeX, cy: PRO.eyeY, hw: W, hu: 0.019, hb: 0.0145, tilt: ex.slant, open: ex.open, cut: ex.cut, pk: ex.pupil }));
    if (E.count >= 4 && ex.low > 0.01 || E.count >= 4 && ex.open < 0.04) P.push(...eye(S, E, { side, cx: side * PRO.eyeLowX, cy: PRO.eyeLowY, hw: W * 0.5, hu: 0.0085, hb: 0.0085, tilt: ex.slant * 0.6 + 0.08, open: ex.open < 0.04 ? 0 : Math.max(0.55, ex.low) * 0.9, cut: ex.cut * 0.5, pk: ex.pupil, tag: 1 }));
  }
  return P;
}

export function mouth(S, look, ex) {
  const P = [], yc0 = PRO.mouthY, kind = ex.mouth, T = look.teeth ?? {};
  if (kind === "line") {
    const mh = 0.07, pts = [[-mh, yc0 + 0.004], [-mh * 0.6, yc0 - 0.004], [0, yc0 - 0.009], [mh * 0.6, yc0 - 0.004], [mh, yc0 + 0.004]];
    P.push(stroke(S, pts, (t) => 0.0036 * (0.4 + Math.sin(Math.PI * t) * 0.6), INK, INK, 0.0016, 0.002));
    for (const s of [1, -1]) P.push(stroke(S, [[s * mh, yc0 + 0.004], [s * (mh + 0.008), yc0 + 0.011]], 0.0026, INK, INK, 0.0016));
    return P;
  }
  const grin = kind === "grin", mh = grin ? PRO.mouthHalf : 0.062, sag = grin ? 0.014 : -0.003, gape = (grin ? 0.027 : 0.017) * Math.max(0.35, ex.gape), yc = yc0 + (grin ? 0.006 : 0);
  const yU = (uu) => yc - sag * (1 - uu * uu), yL = (uu) => yU(uu) - gape * Math.max(0, 1 - uu * uu) ** 0.75;
  const mapAt = (lx, y) => [lx, y];
  const inside = mix("#3a0c18", "#16040a", 0.5);
  P.push(sheet(S, 34, 6, (u, v) => { const lx = (u * 2 - 1) * mh, uu = lx / mh; return mapAt(lx, yL(uu) + (yU(uu) - yL(uu)) * v); }, (u, v) => [mix("#4a1220", inside, v * 0.9), "#12040a"], 0.0018));
  const up = [], lo = [];
  for (let i = 0; i <= 24; i++) { const lx = -mh + (2 * mh * i) / 24, uu = lx / mh; up.push(mapAt(lx, yU(uu) + 0.0004)); lo.push(mapAt(lx, yL(uu) - 0.0004)); }
  const lipW = (t) => 0.0034 * (0.35 + Math.sin(Math.PI * t) * 0.65);
  P.push(stroke(S, up, lipW, INK, INK, 0.0028, 0.002), stroke(S, lo, lipW, INK, INK, 0.0028, 0.002));
  for (const s of [1, -1]) P.push(stroke(S, [[s * mh, yU(1)], [s * (mh + 0.007), yU(1) + (grin ? 0.009 : -0.004)]], 0.0028, INK, INK, 0.0028));
  const tooth = (x, y, down, len, w) => {
    const h = S.at(x, y, 0.0026); if (!h) return;
    const dir = new Vector3(0, down, 0).addScaledVector(h.n, -down * h.n.y).normalize();
    P.push(blade({ root: h.p.toArray(), dir: dir.toArray(), face: h.n.toArray(), len, w, th: 0.0022, segs: 3, sharp: 1, base: T.shade ?? "#cfc6bc", tip: T.col ?? "#fbf7ee", side: "#e9e2d8" }));
  };
  const nu = T.upper ?? 11, nl = T.lower ?? 9;
  for (let i = 0; i < nu; i++) { const uu = -0.9 + (1.8 * i) / (nu - 1), canine = Math.exp(-(((Math.abs(uu) - 0.55) / 0.12) ** 2)); tooth(uu * mh, yU(uu) - 0.0005, -1, (0.0072 + 0.0035 * canine) * (1 - 0.3 * Math.abs(uu) ** 3) * (0.6 + 0.4 * Math.max(0.4, ex.gape)), (1.8 * mh) / (nu - 1) * 1.2); }
  if (grin) for (let i = 0; i < nl; i++) { const uu = -0.8 + (1.6 * i) / (nl - 1); tooth(uu * mh, yL(uu) + 0.0005, 1, 0.0062 * (1 - 0.4 * Math.abs(uu) ** 2), (1.6 * mh) / (nl - 1) * 1.15); }
  return P;
}

export function marks(S, look) {
  const P = [];
  for (const m of look.marks ?? []) for (const s of m.mirror ? [1, -1] : [1]) {
    const pts = m.pts.map(([x, y]) => [x * s, y]), w0 = m.w[0], w1 = m.w[1], prof = m.lens ? (t) => w0 * Math.sin(Math.PI * t) ** 0.8 + 0.0005 : (t) => w0 + (w1 - w0) * t;
    P.push(stroke(S, pts, prof, m.col ?? INK, m.col ?? INK, 0.0015));
  }
  return P;
}

export function whiskers(S, look) {
  const P = [], D = look.whisker ?? {};
  for (const s of [1, -1]) {
    for (const [dx, dy] of [[0.026, 0.074], [0.044, 0.07], [0.062, 0.066], [0.034, 0.058], [0.052, 0.054], [0.07, 0.05]]) {
      const h = S.at(s * dx, dy, 0.0014); if (h) P.push(stroke(S, [[s * dx, dy], [s * dx + 0.0034, dy + 0.0006]], 0.0034, D.dot ?? "#3c3640", D.dot ?? "#3c3640", 0.0016));
    }
    for (const [y0, rise, drop] of [[0.082, 0.026, 0.016], [0.066, 0.004, 0.026], [0.05, -0.03, 0.034]]) {
      const h = S.at(s * 0.085, y0, 0.002); if (!h) continue;
      P.push(blade({ root: h.p.toArray(), dir: [s, rise * 2.2, -0.18], face: [0, 1, 0.2], len: 0.1, w: 0.0016, th: 0.0006, segs: 6, sharp: 1.3, bend: [0, -drop, -0.035], base: D.col ?? "#ddd9e2", tip: D.tip ?? "#6f6a7a" }));
    }
  }
  return P;
}

export function tufts(S, look) {
  const P = [], F = look.fur, rng = (() => { let a = 7; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const path = [[0.131, 0.21], [0.136, 0.17], [0.139, 0.13], [0.138, 0.09], [0.131, 0.05], [0.115, 0.02], [0.094, 0.002]];
  for (const s of [1, -1]) for (let i = 0; i < path.length; i++) for (let k = 0; k < 1; k++) {
    const [x, y] = path[i], yy = y + (k - 0.5) * 0.012 + (rng() - 0.5) * 0.006, h = S.at(s * (x - 0.004 * k), yy, -0.0005); if (!h) continue;
    P.push(blade({ root: h.p.toArray(), dir: [s * (0.9 + rng() * 0.4), -0.55 - rng() * 0.5, -0.35], face: [0, 0, 1], len: 0.012 + rng() * 0.012, w: 0.011 + rng() * 0.004, th: 0.0025, segs: 3, sharp: 1, bend: [0, -0.004, -0.004], base: F.coat, tip: mix(F.coat, "#e6e3ea", 0.55), side: F.shade }));
  }
  return P;
}

export function nose(S, look) {
  const N = look.fur.nose, W = 0.046, H = 0.03, cy = PRO.noseY, shape = (v) => (1 - Math.abs(2 * v - 1) ** 3.2) ** 0.5 * (0.68 + 0.32 * v);
  return [sheet(S, 18, 12, (u, v) => [(u - 0.5) * W * shape(v), cy - H / 2 + H * v + (1 - Math.abs(2 * u - 1)) * 0.003 * v], (u, v) => [mix(mix(N, "#0e0a0e", 0.3), "#6e6470", 0.55 * Math.exp(-(((u - 0.34) / 0.2) ** 2 + ((v - 0.78) / 0.16) ** 2))), "#0e0a0e"], 0.0014),
    ...[1, -1].map((s) => stroke(S, [[s * 0.004, cy - 0.006], [s * 0.011, cy - 0.003]], 0.0035, "#0a070a", "#0a070a", 0.0026, 0.002))];
}

export function furStrokes(S, look) {
  const P = [], c = mix(look.fur.coat, "#1c1824", 0.45), path = [[0.125, 0.2], [0.131, 0.17], [0.133, 0.14], [0.131, 0.11], [0.126, 0.08], [0.118, 0.05], [0.104, 0.022], [0.085, 0.004], [0.06, -0.004]];
  for (const s of [1, -1]) path.forEach(([x, y], i) => { for (const k of [0, 1]) P.push(stroke(S, [[s * (x - 0.012 - 0.005 * k), y + 0.011 + 0.004 * k], [s * (x - 0.004 - 0.003 * k), y - 0.004]], (t) => 0.0026 * (1 - t * 0.9), c, c, 0.0014)); });
  return P;
}
export const faceDetail = (S, look, ex) => merge([...eyes(S, look, ex), ...mouth(S, look, ex), ...marks(S, look), ...nose(S, look), ...furStrokes(S, look)]);
export const furDetail = () => null;
export const whiskerDetail = (S, look) => merge(whiskers(S, look));
