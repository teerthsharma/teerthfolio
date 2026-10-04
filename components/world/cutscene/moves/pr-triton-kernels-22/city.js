// SHIBUYA, in ink: the scramble crossing at the pup's feet and the avenue running away from it to the
// shrine. City frame: the pup at the origin, the avenue toward -z, the camera behind at +z. One merged
// static mesh (the ink material draws it all): roads' paint (zebra bars, lane dashes), kerbs, the
// buildings (each one a stack of slabs cut along tilted planes: on the barrage a slab slides down its
// cut and the signs on it go dark), big screens, blade signs, a station canopy with its clock, a round
// tower of sign strips, abandoned cars; and the street lamps (an instanced geometry the move topples).

import { K, Mesher, hash } from "./ink";

export const AVE = 10.5; // half the avenue's width (m)
export const SHRINE_Z = -78; // the shrine's centre
export const LAMPS = [];
for (const s of [-1, 1]) for (let i = 0; i < 6; i++) LAMPS.push({ x: s * (AVE + 0.7), z: -14 - i * 6.8, side: s });
for (const [x, z] of [[-AVE - 0.7, 13.2], [AVE + 0.7, 13.2], [-AVE - 0.7, -13], [AVE + 0.7, -13]]) LAMPS.push({ x, z, side: Math.sign(x) });

const NOMOVE = [0, 0, 0, 1];

export function lampGeometry() {
  const M = new Mesher();
  const info = [K.solid, 0.2, 0, 0.3];
  M.box(0, 2.7, 0, 0.2, 5.4, 0.2, info);
  M.box(0, 0.25, 0, 0.5, 0.5, 0.5, info);
  M.box(0.9, 5.3, 0, 1.9, 0.14, 0.16, info);
  M.box(1.75, 5.18, 0, 0.9, 0.22, 0.4, [K.solid, 0.1, 0, 0.3]);
  M.box(1.75, 5.04, 0, 0.7, 0.05, 0.3, [K.flat, 1, 0, 0.3]); // the lit glass
  return M.geometry();
}

// ---- one building: footprint + height, cut into slabs
const plane = (c, cx, cz, x, z) => c.y + c.sx * (x - cx) + c.sz * (z - cz);

function building(M, o) {
  const { foot, H, seed, cuts = [], tone = 0.42 } = o;
  const n = foot.length;
  const cx = foot.reduce((s, p) => s + p[0], 0) / n;
  const cz = foot.reduce((s, p) => s + p[1], 0) / n;
  const planes = [{ y: 0, sx: 0, sz: 0 }, ...cuts, { y: H, sx: 0, sz: 0 }];
  const slabs = planes.slice(1).map((_, k) => k);
  const mvOf = (k) => (k === 0 ? NOMOVE : cuts[k - 1].mv);
  for (const k of slabs) {
    const lo = planes[k];
    const hi = planes[k + 1];
    const yb = foot.map((p) => plane(lo, cx, cz, p[0], p[1]));
    const yt = foot.map((p) => plane(hi, cx, cz, p[0], p[1]));
    const last = k === slabs.length - 1;
    const mv = mvOf(k);
    const wall = [K.window, tone, 0, seed];
    const topInfo = last ? [K.solid, 0.55, 0, seed] : [K.cut, 0.95, 0, seed];
    const botInfo = k === 0 ? [K.solid, 0.3, 0, seed] : [K.cut, 0.95, 0, seed];
    if (n === 4) {
      const c = [...foot.map((p, i) => [p[0], yb[i], p[1]]), ...foot.map((p, i) => [p[0], yt[i], p[1]])];
      M.hexa(c, (f) => (f === 0 ? botInfo : f === 1 ? topInfo : wall), mv);
    } else {
      const ring = (ys) => foot.map((p, i) => [p[0], ys[i], p[1]]);
      const b = ring(yb);
      const t = ring(yt);
      const inside = [cx, (yb[0] + yt[0]) / 2, cz];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        M.poly([b[i], b[j], t[j], t[i]], wall, mv, 0, inside);
      }
      M.fan(t, [cx, t.reduce((s, p) => s + p[1], 0) / n, cz], topInfo, mv, inside);
      M.fan(b, [cx, b.reduce((s, p) => s + p[1], 0) / n, cz], botInfo, mv, inside);
    }
  }
  // which slab holds a point
  const slabAt = (x, y, z) => {
    let k = 0;
    while (k < cuts.length && y > plane(cuts[k], cx, cz, x, z)) k++;
    return k;
  };
  const planeAt = (k, x, z) => plane(planes[k], cx, cz, x, z);
  return { mvOf, slabAt, planeAt, cx, cz };
}

// a cut from a spec: tilted about z (sx) or x (sz); the upper slab slides down the cut
function cutSpec(y, tilt, axis, t, dist, fall) {
  const sx = axis === "x" ? tilt : 0;
  const sz = axis === "z" ? tilt : 0;
  const dir = axis === "x" ? [-Math.sign(tilt), -Math.abs(tilt), 0] : [0, -Math.abs(tilt), -Math.sign(tilt)];
  return { y, sx, sz, mv: [dir[0] * dist, dir[1] * dist, dir[2] * dist, t + (fall ? 100 : 0)] };
}

// a screen / blade sign / roof clutter on a slab: placed whole inside one slab
function quadOn(M, pts, info, mv, inside = null) {
  M.poly(pts, info, mv, 0, inside);
}

export function buildCity() {
  const M = new Mesher();
  const cuts = []; // for the debris: where each cut sits and when
  const asphalt = [K.flat, 1, 0, 0];
  const flat = (x, z, sx, sz, y, rot = 0) => {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const p = [[-sx / 2, -sz / 2], [sx / 2, -sz / 2], [sx / 2, sz / 2], [-sx / 2, sz / 2]].map(([a, b]) => [x + a * c - b * s, y, z + a * s + b * c]);
    M.poly([p[3], p[2], p[1], p[0]], asphalt, NOMOVE, 0, [x, y - 1, z]);
  };

  // ---- the paint: the scramble's zebra bars and the lane dashes
  for (let i = 0; i < 18; i++) {
    const x = -AVE + 1.1 + i * 1.12;
    flat(x, -14.2, 0.62, 3.0, 0.05); // the avenue's crossing
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 18; i++) flat(sx * (AVE + 3.4), -AVE + 1.1 + i * 1.12 - 0.0, 3.0, 0.62, 0.05);
  }
  for (const [d, y] of [[1, 0.055], [-1, 0.07]]) {
    for (let i = -12; i <= 12; i++) {
      const sdist = i * 1.25;
      flat(sdist * Math.SQRT1_2, -d * sdist * Math.SQRT1_2, 0.66, 3.4, y, -d * (Math.PI / 4));
    }
  }
  for (let i = 0; i < 9; i++) {
    flat(0, -19 - i * 4.2, 0.2, 2.2, 0.05);
    flat(-5.2, -19 - i * 4.2, 0.12, 2.2, 0.05);
    flat(5.2, -19 - i * 4.2, 0.12, 2.2, 0.05);
  }
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) flat(s * (18 + i * 4.2), 0, 2.2, 0.2, 0.05);

  // ---- kerbs and pavements along the avenue
  const kerb = [K.solid, 0.7, 0, 0.1];
  for (const s of [-1, 1]) M.box(s * (AVE + 0.7), 0.12, -31, 1.4, 0.24, 36, kerb);
  for (const s of [-1, 1]) {
    M.box(s * (AVE + 0.7), 0.12, 12.5, 1.4, 0.24, 26, kerb);
    M.box(s * 40, 0.12, -AVE - 0.7, 62, 0.24, 1.4, kerb);
    M.box(s * 40, 0.12, AVE + 0.7, 62, 0.24, 1.4, kerb);
  }

  // ---- the lots
  const lots = [
    // the station front, left: a long low building with a canopy and a clock on the avenue side
    { id: "station", foot: [[-44, -29], [-AVE - 1.4, -29], [-AVE - 1.4, -13], [-44, -13]], H: 17, seed: 0.11, tone: 0.5, cuts: [cutSpec(11.5, 0.3, "z", 6.05, 11, false)] },
    { id: "L2", foot: [[-38, -50], [-AVE - 1.4, -50], [-AVE - 1.4, -31], [-38, -31]], H: 47, seed: 0.23, cuts: [cutSpec(19, 0.3, "x", 5.95, 16, false), cutSpec(33, -0.28, "z", 6.7, 13, true)] },
    { id: "R1p", foot: [[AVE + 1.4, -29], [46, -29], [46, -13], [AVE + 1.4, -13]], H: 11, seed: 0.37, tone: 0.5, cuts: [cutSpec(5.6, -0.13, "x", 6.3, 12, false)] },
    { id: "R2", foot: [[AVE + 1.4, -50], [40, -50], [40, -31], [AVE + 1.4, -31]], H: 53, seed: 0.51, cuts: [cutSpec(24, -0.32, "x", 6.1, 18, false), cutSpec(40, 0.3, "z", 6.9, 14, true)] },
    { id: "L4", foot: [[-80, -52], [-40, -52], [-40, -12], [-80, -12]], H: 62, seed: 0.66, cuts: [cutSpec(28, 0.3, "x", 6.5, 20, false)] },
    { id: "R4", foot: [[48, -52], [84, -52], [84, -12], [48, -12]], H: 68, seed: 0.74, cuts: [cutSpec(31, -0.3, "x", 6.6, 20, false)] },
    // the round sign tower on the right
    { id: "tower", foot: Array.from({ length: 10 }, (_, i) => [30 + 8.6 * Math.cos((i / 10) * Math.PI * 2), -24 + 8.6 * Math.sin((i / 10) * Math.PI * 2)]), H: 41, seed: 0.83, cuts: [cutSpec(22, 0.3, "x", 6.4, 15, false)] },
  ];
  // the skyline, far and fat
  for (let i = 0; i < 20; i++) {
    const right = i % 2;
    const x = (right ? 1 : -1) * (42 + hash(i, 1) * 52);
    const z = -26 - hash(i, 2) * 78;
    const w = 12 + hash(i, 3) * 12;
    const d = 12 + hash(i, 4) * 10;
    if (Math.abs(x) < 44 + w / 2 && z < -52) continue; // the shrine's ground
    lots.push({ id: `sk${i}`, foot: [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]], H: 62 + hash(i, 5) * 58, seed: hash(i, 6), tone: 0.38, cuts: i % 4 === 0 ? [cutSpec(30 + hash(i, 7) * 20, 0.3, i % 8 ? "x" : "z", 6.8 + hash(i, 8) * 0.8, 18, true)] : [] });
  }

  for (const lot of lots) {
    // the cut sweeps the block: near ones first, a little random
    const dist = Math.hypot(lot.foot[0][0], lot.foot[0][1]);
    for (const c of lot.cuts) {
      const t0 = (c.mv[3] % 100) + dist * 0.004;
      c.mv[3] = t0 + (c.mv[3] >= 100 ? 100 : 0);
    }
    const b = building(M, lot);
    const xs = lot.foot.map((p) => p[0]);
    const zs = lot.foot.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const z0 = Math.min(...zs);
    const z1 = Math.max(...zs);
    const cy = lot.cuts.length ? lot.cuts[0].y : lot.H * 0.5;
    for (const c of lot.cuts) cuts.push({ x: (x0 + x1) / 2, y: c.y, z: (z0 + z1) / 2, t: c.mv[3] % 100, w: Math.max(x1 - x0, z1 - z0), sx: c.sx, sz: c.sz });
    const slabAt = (x, y, z) => b.mvOf(b.slabAt(x, y, z));
    const sd = lot.seed;
    if (lot.id.startsWith("sk")) {
      // a few lit signs and a roof box so the skyline is not blank
      const x = (x0 + x1) / 2;
      if (lot.cuts.length === 0 || lot.H < cy + 20) continue;
      quadOn(M, [[x - 3, lot.H - 14, z1 + 0.15], [x + 3, lot.H - 14, z1 + 0.15], [x + 3, lot.H - 6, z1 + 0.15], [x - 3, lot.H - 6, z1 + 0.15]], [K.screen, 0.9, 0, sd], slabAt(x, lot.H - 10, z1));
      continue;
    }
    // roof clutter on the top slab
    for (let i = 0; i < 3; i++) {
      const x = x0 + 3 + hash(i, sd * 9) * (x1 - x0 - 6);
      const z = z0 + 3 + hash(i, sd * 7) * (z1 - z0 - 6);
      if (lot.id === "tower") continue;
      M.box(x, lot.H + 0.9, z, 3 + hash(i, 3) * 3, 1.8, 2.5 + hash(i, 4) * 2, [K.solid, 0.45, 0, sd], b.mvOf(lot.cuts.length));
    }
    if (lot.id === "tower") {
      const ring = lot.foot;
      // sign strips run up the round tower, one a face: set in as a skin just proud of the glass
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        const a = ring[i];
        const c = ring[j];
        const mx = (a[0] + c[0]) / 2 - 30;
        const mz = (a[1] + c[1]) / 2 + 24;
        const l = Math.hypot(mx, mz) || 1;
        const o = 0.2;
        const px = (q) => q[0] + (mx / l) * o;
        const pz = (q) => q[1] + (mz / l) * o;
        const yLo = 4;
        const yHi = 20;
        quadOn(M, [[px(a), yLo, pz(a)], [px(c), yLo, pz(c)], [px(c), yHi, pz(c)], [px(a), yHi, pz(a)]], [K.sign, 0.9, 0, sd + i * 0.071], slabAt(mx + 30, 12, mz - 24), [30, 12, -24]);
      }
      quadOn(M, [[30 - 4, 27, -24 + 8.9], [30 + 4, 27, -24 + 8.9], [30 + 4, 38, -24 + 8.9], [30 - 4, 38, -24 + 8.9]], [K.screen, 0.9, 0, sd], slabAt(30, 33, -15), [30, 33, -24]);
      continue;
    }
    // the big screens on the face toward the crossing (+z), whole in one slab
    const w = x1 - x0;
    const lowTop = Math.min(...lot.foot.map((p) => b.planeAt(1, p[0], p[1]))) - 1.2;
    const hiBot = Math.max(...lot.foot.map((p) => b.planeAt(1, p[0], p[1]))) + 2;
    if (lowTop > 7) {
      const sw = Math.min(w * 0.7, 15);
      const xm = lot.id === "L2" || lot.id === "L4" ? x1 - sw / 2 - 1.5 : x0 + sw / 2 + 1.5;
      quadOn(M, [[xm - sw / 2, 3.5, z1 + 0.2], [xm + sw / 2, 3.5, z1 + 0.2], [xm + sw / 2, Math.min(lowTop, 3.5 + sw * 0.55), z1 + 0.2], [xm - sw / 2, Math.min(lowTop, 3.5 + sw * 0.55), z1 + 0.2]], [K.screen, 0.9, 0, sd + 0.02], NOMOVE);
    }
    const ceil = lot.cuts.length > 1 ? Math.min(...lot.foot.map((p) => b.planeAt(2, p[0], p[1]))) - 1 : lot.H - 2;
    if (ceil - hiBot > 6 && lot.cuts.length) {
      const sw = Math.min(w * 0.6, 13);
      const xm = (x0 + x1) / 2;
      const top = Math.min(ceil, hiBot + 1 + sw * 0.6);
      quadOn(M, [[xm - sw / 2, hiBot + 1, z1 + 0.2], [xm + sw / 2, hiBot + 1, z1 + 0.2], [xm + sw / 2, top, z1 + 0.2], [xm - sw / 2, top, z1 + 0.2]], [K.screen, 0.9, 0, sd + 0.05], slabAt(xm, hiBot + 3, z1));
    }
    // blade signs thrust out over the avenue from the inner face, facing the camera
    if (lot.id !== "station" && lot.id !== "L4" && lot.id !== "R4") {
      const inner = x0 < 0 ? x1 : x0; // the face toward the avenue
      const dir = x0 < 0 ? 1 : -1;
      for (let i = 0; i < 4; i++) {
        const y0 = 3 + hash(i, sd * 3) * 5;
        const hgt = 7 + hash(i, sd * 5) * 9;
        const z = z0 + 3 + ((z1 - z0 - 6) * i) / 3 + hash(i, 9) * 1.2;
        const xa = inner;
        const xb = inner + dir * 2.4;
        if (y0 + hgt > lowTop + 0.5 && y0 < hiBot) continue;
        const mv = slabAt(inner, y0 + hgt / 2, z);
        // the big face toward +z, and a thin edge so it has thickness
        M.box((xa + xb) / 2, y0 + hgt / 2, z, 2.4, hgt, 0.28, [K.sign, 0.9, 0, sd + i * 0.131], mv);
      }
    }
    if (lot.id === "station") {
      // the canopy along the avenue face, its two posts, and a big round clock
      const xf = x1 + 0.02;
      M.box(xf + 1.7, 3.8, -21, 3.6, 0.3, 14, [K.roof, 0.3, 0, sd], NOMOVE);
      for (const z of [-27, -15]) M.box(xf + 3.2, 1.9, z, 0.35, 3.8, 0.35, [K.solid, 0.15, 0, sd], NOMOVE);
      const cxk = xf + 0.25;
      const ring = Array.from({ length: 16 }, (_, i) => [cxk, 8.3 + 1.5 * Math.sin((i / 16) * Math.PI * 2), -21 + 1.5 * Math.cos((i / 16) * Math.PI * 2)]);
      const away = [cxk - 4, 8.3, -21];
      M.fan(ring, [cxk, 8.3, -21], [K.flat, 1, 0, sd], NOMOVE, away);
      M.poly([[cxk + 0.05, 8.3, -21.07], [cxk + 0.05, 8.3, -20.93], [cxk + 0.05, 9.6, -20.93], [cxk + 0.05, 9.6, -21.07]], [K.solid, 0, 0, sd], NOMOVE, 0, away);
      M.poly([[cxk + 0.05, 8.23, -21], [cxk + 0.05, 8.37, -21], [cxk + 0.05, 8.37, -20.0], [cxk + 0.05, 8.23, -20.0]], [K.solid, 0, 0, sd], NOMOVE, 0, away);
      M.poly([[xf + 0.1, 4.2, -28.5], [xf + 0.1, 4.2, -13.5], [xf + 0.1, 6.0, -13.5], [xf + 0.1, 6.0, -28.5]], [K.screen, 0.9, 0, sd + 0.3], NOMOVE, 0, away);
    }
  }

  // ---- abandoned cars on the road
  const cars = [[-4.6, -9, 0.2], [8.8, -2.5, -0.15], [-6.4, -27, 0.05], [3.9, -36, 0.1], [7.2, -21, -0.08], [-14, 3.2, 1.57], [16.5, -4, 1.62]];
  cars.forEach(([x, z, r], i) => {
    M.box(x, 0.75, z, 1.9, 0.9, 4.4, [K.solid, 0.18, i % 3 === 0 ? 1 : 0, 0.4], NOMOVE, [0, r, 0]);
    M.box(x, 1.55, z - 0.2 * Math.cos(r), 1.7, 0.7, 2.3, [K.window, 0.2, 0, 0.4 + i * 0.1], NOMOVE, [0, r, 0]);
  });

  return { geometry: M.geometry(), cuts, tris: M.tris };
}
