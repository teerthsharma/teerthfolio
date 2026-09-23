// THE GOOGLE RANGE, as geometry. Pure builders, no React:
// components/world/land/GoogleRange.jsx turns these into meshes and runs
// their life.
//
//   buildSkin()  the range's own rock: lib/world/terrain.js's two western
//                peaks, XNNPACK Peak and its shoulder, re-cut as a painted
//                rainbow range (the real Vinicunca and Zhangye Danxia look):
//                banded buttresses with strata benches across them, and
//                snow-filled couloirs streaking down between them from the
//                caps, each peak in its own colours. It sits on Terrain.jsx's
//                own lattice (same vertices, same diagonals) and never below
//                the terrain, so the grey rock under it never shows.
//   CAVE, THROAT XNNPACK Peak's cave, at the foot, facing the reading point.

import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { fbm, groundAt } from "../../../../lib/world/terrain.js";
import { C } from "../../palette.js";

const TAU = Math.PI * 2;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Terrain.jsx's hash (its vertex jitter): the skin must land on its lattice.
const rnd = (a, b) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

// ---- the cave -----------------------------------------------------------------

// XNNPACK Peak's cave: its mouth in the peak's foot on the east shoulder
// (land.js's (72, -58, 9) circle), turned toward the reading point and the
// camera, east of the reading point so its HTML label never covers the
// mouth. Local origin on the snow at the mouth's centre, +z out of it.
export const CAVE = { x: 67, z: -51, turn: -0.4 };
// The mouth's outline (x right, y up): a chunky, uneven arch, never a door.
export const THROAT = [[-2.45, 0], [-2.6, 1.5], [-2.3, 2.9], [-1.5, 4], [-0.2, 4.55], [1.2, 4.25], [2.15, 3.3], [2.55, 1.8], [2.4, 0]];
// The skin keeps clear of the mouth round a point 2 m out in front of it, so
// the benches still climb over the brow behind it.
const CLEAR = { x: CAVE.x + 2 * Math.sin(CAVE.turn), z: CAVE.z + 2 * Math.cos(CAVE.turn) };

// ---- the skin: painted strata, buttresses and couloirs ----------------------------

const BAND = 2.8; // m, one stratum
const TREAD = 0.4; // how much of each stratum lies flat as a bench
const LIFT = BAND + 0.3; // what the benches stand on, so they never cut below the terrain
const RIB = 1; // m the buttresses stand proud of the couloirs between them
const SNOWLINE = 21; // m: above it the benches give way to the caps

// Bottom up, cycling: a light band, a real dark, and one complementary pop.
const PAINT = {
  west: ["#e8435f", "#ffb39c", "#6a2758", "#ff7d8c", "#f8dccb", "#16b3a5"], // rose / plum / teal
  xnnpack: ["#ff9f1c", "#ffe2a4", "#c0432b", "#ffc94d", "#4a3bb3", "#f3b77c"], // amber / rust / indigo
};
const PAINT_RGB = Object.fromEntries(Object.entries(PAINT).map(([k, list]) => [k, list.map((hex) => new Color(hex))]));

// lib/world/terrain.js PEAKS: each one's colours and how many couloirs run
// down it (about one every 7 m round its foot).
const PEAKS = [
  { x: 26, z: -81, n: 13, paint: "west" },
  { x: 50, z: -81, n: 13, paint: "west" },
  { x: 65, z: -75, n: 17, paint: "xnnpack" }, // XNNPACK Peak
  { x: 77, z: -60, n: 9, paint: "xnnpack" }, // its east shoulder
];
function nearestPeak(x, z) {
  let best = Infinity;
  let k = 0;
  PEAKS.forEach((p, i) => {
    const d = (x - p.x) ** 2 + (z - p.z) ** 2;
    if (d < best) {
      best = d;
      k = i;
    }
  });
  return k;
}

// How far (m) (x, z) at height h stands outside its nearest couloir's snow
// (negative inside it). The couloirs radiate from each peak, wander a
// little, each reaches its own way down the flank, and they widen with
// height until they merge into the cap.
export function couloir(x, z, h) {
  const k = nearestPeak(x, z);
  const p = PEAKS[k];
  const d = Math.hypot(x - p.x, z - p.z);
  const u = (Math.atan2(x - p.x, z - p.z) / TAU) * p.n + 0.55 * (fbm(x / 9, z / 9) - 0.5);
  const j = Math.round(u);
  const off = (Math.abs(u - j) * TAU * Math.max(d, 9)) / p.n; // never all snow near a low summit
  // most run all the way down and spill a snow fan onto the plain; the rest
  // hang, starting somewhere up the face
  const reach = rnd(j + 0.37, k + 2.1);
  const bottom = reach < 0.6 ? -3 : 2 + (7 * (reach - 0.6)) / 0.4;
  const fan = reach < 0.6 ? 1.6 * (1 - smooth(0.3, 3.5, h)) : 0;
  return off - (0.95 + 0.055 * h + fan) * smooth(bottom, bottom + 2.5, h);
}

// The saddle between the two western peaks stays smooth snow (benches up it
// would read as stairs). Mirrors lib/world/terrain.js's PASS; if that
// moves, move this.
const PASS = { x: 38, mouth: -66, floor: 9, half: 3, wall: 2.2 };
function passFloor(x, z, h) {
  const along = PASS.mouth - z;
  if (along < 0) return 0;
  const floor = PASS.floor * smooth(4, 20, along) - 0.5 * Math.max(0, along - 26);
  const cap = floor + Math.max(0, Math.abs(x - PASS.x) - PASS.half) * PASS.wall;
  return (1 - smooth(0.3, 1.5, cap - h)) * (1 - smooth(PASS.half + 0.2, PASS.half + 1.8, Math.abs(x - PASS.x)));
}

// Terrain.jsx's lattice: origin, 1 m step, and the region the range covers
// (x 12..100, z -114..-48) in its indices.
const TX0 = -108;
const TZ0 = -152;
const GX = [120, 208];
const GZ = [38, 104];

// Facets no camera ever sees are not built (Terrain.jsx's own test: the
// azimuth never turns).
const VIEWS = [];
for (const el of [0.35, 0.75, 1.15]) for (const az of [-0.75, 0, 0.75]) VIEWS.push([Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]);
const seen = (nx, ny, nz) => VIEWS.some(([x, y, z]) => nx * x + ny * y + nz * z > -0.05);

export function buildSkin() {
  const nx = GX[1] - GX[0] + 1;
  const nz = GZ[1] - GZ[0] + 1;
  const n = nx * nz;
  const X = new Float32Array(n);
  const Z = new Float32Array(n);
  const H = new Float32Array(n);
  const M = new Uint8Array(n);
  const o = {};
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = iz * nx + ix;
      const gx = GX[0] + ix;
      const gz = GZ[0] + iz;
      let x = TX0 + gx;
      let z = TZ0 + gz;
      groundAt(x, z, o);
      if (o.mount > 0.02 || o.keep || (o.coast && o.h > -1)) {
        x += (rnd(gx, gz) - 0.5) * 0.62;
        z += (rnd(gz + 0.5, gx) - 0.5) * 0.62;
        groundAt(x, z, o);
      }
      X[i] = x;
      Z[i] = z;
      H[i] = o.h;
      M[i] = o.stuff === 3 && o.mount > 0.02 ? 1 : 0;
    }
  }

  // How deep into the range each vertex is (7 x 7 box): the benches and the
  // buttresses fade out over the last few metres so the skin meets Triton,
  // the snow and the coast flush.
  const S = new Float32Array(n);
  const NB = new Float32Array(n);
  const PF = new Float32Array(n);
  const G = new Float32Array(n);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = iz * nx + ix;
      let sum = 0;
      let count = 0;
      for (let dz = -3; dz <= 3; dz++) {
        const jz = iz + dz;
        if (jz < 0 || jz >= nz) continue;
        for (let dx = -3; dx <= 3; dx++) {
          const jx = ix + dx;
          if (jx < 0 || jx >= nx) continue;
          sum += M[jz * nx + jx];
          count++;
        }
      }
      const x = X[i];
      const z = Z[i];
      const h = H[i];
      const nb = 1.4 * (fbm(x / 11, z / 11) - 0.5); // the strata wander
      const pf = passFloor(x, z, h);
      const g = couloir(x, z, h);
      const cave = Math.hypot(x - CLEAR.x, z - CLEAR.z);
      const inside = smooth(0.55, 0.95, sum / count) * (1 - pf);
      // the buttresses stand proud; the couloirs between them stay low and smooth
      const base = h + RIB * inside * smooth(0, 2.2, g) * smooth(0.6, 4, h) * smooth(4, 8, cave);
      const lw = inside * smooth(0, 3.5, h) * smooth(0, 1.2, g) * smooth(3.6, 7, cave);
      let s = base + 0.12;
      if (lw > 0.02) {
        const t = (base + LIFT * lw + nb) / BAND;
        const k = Math.floor(t);
        s = Math.max(s, (k + smooth(TREAD, 1, t - k)) * BAND - nb);
      }
      S[i] = s;
      NB[i] = nb;
      PF[i] = pf;
      G[i] = g;
    }
  }

  const P = [];
  const N = [];
  const COL = [];
  const c = new Color();
  const snow = new Color(C.snow);
  const face = (i0, i1, i2, seed) => {
    const ux = X[i1] - X[i0];
    const uy = S[i1] - S[i0];
    const uz = Z[i1] - Z[i0];
    const vx = X[i2] - X[i0];
    const vy = S[i2] - S[i0];
    const vz = Z[i2] - Z[i0];
    let fx = uy * vz - uz * vy;
    let fy = uz * vx - ux * vz;
    let fz = ux * vy - uy * vx;
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl;
    fy /= fl;
    fz /= fl;
    if (!seen(fx, fy, fz)) return;
    const sc = (S[i0] + S[i1] + S[i2]) / 3;
    const nb = (NB[i0] + NB[i1] + NB[i2]) / 3;
    const pf = (PF[i0] + PF[i1] + PF[i2]) / 3;
    const g = (G[i0] + G[i1] + G[i2]) / 3;
    const range = (M[i0] + M[i1] + M[i2]) / 3;
    const cx = (X[i0] + X[i1] + X[i2]) / 3;
    const cz = (Z[i0] + Z[i1] + Z[i2]) / 3;
    const cap = (sc > SNOWLINE + 6 * nb && fy > 0.42) || (sc > SNOWLINE + 10 && fy > 0.15);
    if (range < 0.5 || sc < 1.1 || g < 0 || (pf > 0.5 && fy > 0.5) || fy > 0.86 || cap) {
      c.copy(snow);
    } else {
      const paint = PAINT_RGB[PEAKS[nearestPeak(cx, cz)].paint];
      const k = Math.floor((sc + nb) / BAND);
      c.copy(paint[((k % paint.length) + paint.length) % paint.length]).multiplyScalar(0.94 + 0.1 * rnd(seed, 7.3));
    }
    for (const i of [i0, i1, i2]) {
      P.push(X[i], S[i], Z[i]);
      N.push(fx, fy, fz);
      COL.push(c.r, c.g, c.b);
    }
  };

  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const cc = a + nx;
      const d = cc + 1;
      if (!(M[a] | M[b] | M[cc] | M[d])) continue;
      if (H[a] < -1 && H[b] < -1 && H[cc] < -1 && H[d] < -1) continue; // under the sea
      // Terrain.jsx's own diagonal, from the terrain's heights: the same
      // triangles, so the skin is above the terrain everywhere, not only at
      // the vertices
      if (Math.abs(H[a] - H[d]) < Math.abs(H[b] - H[cc])) {
        face(a, cc, d, a);
        face(a, d, b, a + 0.5);
      } else {
        face(a, cc, b, a);
        face(b, cc, d, a + 0.5);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(P, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(N, 3));
  geo.setAttribute("color", new Float32BufferAttribute(COL, 3));
  geo.computeBoundingSphere();
  return geo;
}
