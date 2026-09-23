// THE GOOGLE RANGE, as geometry. Pure builders, no React:
// components/world/land/GoogleRange.jsx turns these into meshes and runs
// their life.
//
//   buildSkin()  the range's own rock: lib/world/terrain.js's two Highway
//                Pass peaks, XNNPACK Peak and its shoulder, re-cut as a
//                painted rainbow range (the real Vinicunca and Zhangye Danxia
//                look): stepped strata benches, a snow tread on every bench,
//                each peak banded in its own radiation colour, snow caps
//                above the snowline. It sits on Terrain.jsx's own lattice
//                (same vertices, same diagonals) and never below the terrain,
//                so the grey rock under it never shows.
//   buildWave()  Highway Pass's anomaly: the cornice on the pass's east wall
//                has grown into a breaking wave of snow, curled over the
//                saddle and frozen mid-break, its hollow glowing coral.
//   CAVE, THROAT XNNPACK Peak's cave, at the foot, facing the reading point.

import { BufferGeometry, Color, Float32BufferAttribute, ShapeUtils, SplineCurve, Vector2 } from "three";
import { fbm, groundAt } from "../../../../lib/world/terrain";
import { C } from "../../palette";

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

// ---- the skin: painted strata --------------------------------------------------

const BAND = 2.4; // m, one stratum
const TREAD = 0.4; // how much of each stratum lies flat as a snow bench
const LIFT = BAND + 0.3; // what the benches stand on, so they never cut below the terrain
const SNOWLINE = 21; // m: above it the benches give way to the caps

// Bottom up, cycling. Each peak wears its radiation colour at its foot, a
// light band, a real dark, and one complementary pop.
const PAINT = {
  highway: ["#e8435f", "#ffb39c", "#6a2758", "#ff7d8c", "#f8dccb", "#16b3a5"], // coral / plum / teal
  xnnpack: ["#ff9f1c", "#ffe2a4", "#c0432b", "#ffc94d", "#4a3bb3", "#f3b77c"], // amber / rust / indigo
};
const PAINT_RGB = Object.fromEntries(Object.entries(PAINT).map(([k, list]) => [k, list.map((hex) => new Color(hex))]));
// Which palette a facet takes: its nearest peak (lib/world/terrain.js PEAKS).
const PEAK_PAINT = [
  [26, -81, "highway"],
  [50, -81, "highway"],
  [65, -75, "xnnpack"],
  [77, -60, "xnnpack"],
];
function paintAt(x, z) {
  let best = Infinity;
  let key = "highway";
  for (const [px, pz, k] of PEAK_PAINT) {
    const d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < best) {
      best = d;
      key = k;
    }
  }
  return PAINT_RGB[key];
}

// Highway Pass's floor stays smooth snow (benches up it would read as
// stairs). Mirrors lib/world/terrain.js's PASS; if that moves, move this.
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

  // How deep into the range each vertex is (7 x 7 box): the benches fade out
  // over the last few metres so the skin meets Triton and the coast flush.
  const S = new Float32Array(n);
  const NB = new Float32Array(n);
  const PF = new Float32Array(n);
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
      const lw = smooth(0.55, 0.95, sum / count) * smooth(0, 3.5, h) * (1 - pf) * smooth(2.8, 5.5, Math.hypot(x - CAVE.x, z - CAVE.z));
      let s = h + 0.12;
      if (lw > 0.02) {
        const t = (h + LIFT * lw + nb) / BAND;
        const k = Math.floor(t);
        s = Math.max(s, (k + smooth(TREAD, 1, t - k)) * BAND - nb);
      }
      S[i] = s;
      NB[i] = nb;
      PF[i] = pf;
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
    const range = (M[i0] + M[i1] + M[i2]) / 3;
    const cx = (X[i0] + X[i1] + X[i2]) / 3;
    const cz = (Z[i0] + Z[i1] + Z[i2]) / 3;
    if (range < 0.5 || sc < 1.1 || (pf > 0.5 && fy > 0.5) || fy > 0.8 || (sc > SNOWLINE + 6 * nb && fy > 0.42)) {
      c.copy(snow);
    } else {
      const paint = paintAt(cx, cz);
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

// ---- the frozen wave ------------------------------------------------------------

// Its cross-section (u across the pass, + east; v up), base to lip: it rises
// out of the east wall, crests over the pass and curls west and down into a
// barrel, and the thickness it carries at each point of that spine.
const SPINE = [[4.2, -0.6], [3.3, 2.4], [2.3, 4.9], [0.9, 6.7], [-0.9, 7.5], [-2.7, 7.0], [-3.8, 5.7], [-3.8, 4.4], [-2.9, 3.8]];
const THICK = [2.4, 2.0, 1.7, 1.35, 1.05, 0.85, 0.65, 0.5, 0.34];
const PROFILE_STEPS = 18;

// Stations along the pass, south to north: the wave hugs the east wall and
// curls west over the pass mouth, its south end facing the reading point and
// the camera, so the curl's own silhouette and the glowing barrel inside it
// face the view; it peels smaller toward the saddle. The west half of the
// pass stays open. Each: z, scale, and x of u = 0, which keeps the base
// inside the east wall's footprint (land.js's (49, -74, 8) circle).
const WAVE_Z = [-66.8, -68.2, -69.6, -71, -72.4, -73.8];
export const WAVE_STATIONS = WAVE_Z.map((z, k) => {
  const sc = 0.85 - 0.35 * (k / (WAVE_Z.length - 1));
  const xb = 49 - Math.sqrt(64 - (z + 74) ** 2); // the east wall's foot at this z
  return { z, sc, ax: xb - 3 * sc };
});

function profile() {
  const curve = new SplineCurve(SPINE.map(([u, v]) => new Vector2(u, v)));
  const pts = curve.getSpacedPoints(PROFILE_STEPS);
  const outer = [];
  const inner = [];
  for (let j = 0; j <= PROFILE_STEPS; j++) {
    const t = curve.getTangentAt(j / PROFILE_STEPS);
    const f = (j / PROFILE_STEPS) * (THICK.length - 1);
    const k = Math.min(THICK.length - 2, Math.floor(f));
    const half = (THICK[k] + (THICK[k + 1] - THICK[k]) * (f - k)) / 2;
    // left of the spine's travel is the barrel's hollow
    inner.push([pts[j].x - t.y * half, pts[j].y + t.x * half]);
    outer.push([pts[j].x + t.y * half, pts[j].y - t.x * half]);
  }
  return { outer, inner };
}

// The frozen wave as one geometry, two groups: 0 its ice (the back, the
// base, both ends), 1 its hollow (the barrel's inside and the lip), which
// glows coral.
export function buildWave() {
  const { outer, inner } = profile();
  const m = PROFILE_STEPS;
  // the ring, counter-clockwise seen from the south: up the back, over the
  // crest to the lip, then back along the hollow to the base
  const ring = [...outer, ...inner.slice().reverse()];
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[(i + 1) % ring.length];
    area += ax * by - bx * ay;
  }
  const flip = area < 0;
  // which group each ring edge belongs to: the lip edge (m) and the hollow
  // (m + 1 .. 2m) glow; the back and the base are ice
  const glowEdge = (e) => e >= m && e < 2 * m + 1;

  const world = (st, [u, v]) => [st.ax + u * st.sc, v * st.sc, st.z];
  const ice = [];
  const hollow = [];
  const tri = (out, a, b, c) => (flip ? out.push(...a, ...c, ...b) : out.push(...a, ...b, ...c));
  for (let k = 0; k < WAVE_STATIONS.length - 1; k++) {
    const s0 = WAVE_STATIONS[k];
    const s1 = WAVE_STATIONS[k + 1];
    for (let e = 0; e < ring.length; e++) {
      const A = world(s0, ring[e]);
      const B = world(s0, ring[(e + 1) % ring.length]);
      const Cc = world(s1, ring[(e + 1) % ring.length]);
      const D = world(s1, ring[e]);
      const out = glowEdge(e) ? hollow : ice;
      tri(out, A, Cc, B);
      tri(out, A, D, Cc);
    }
  }
  // the two ends: the south one faces the camera (+z), the north one -z
  const flat = ring.map(([u, v]) => new Vector2(u, v));
  const tris = ShapeUtils.triangulateShape(flat, []);
  for (const [st, sign] of [[WAVE_STATIONS[0], 1], [WAVE_STATIONS[WAVE_STATIONS.length - 1], -1]]) {
    for (const [a, b, c] of tris) {
      const [ax, ay] = ring[a];
      const [bx, by] = ring[b];
      const [cx, cy] = ring[c];
      const ccw = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) > 0;
      const [p, q] = ccw === sign > 0 ? [b, c] : [c, b];
      ice.push(...world(st, ring[a]), ...world(st, ring[p]), ...world(st, ring[q]));
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute([...ice, ...hollow], 3));
  geo.addGroup(0, ice.length / 3, 0);
  geo.addGroup(ice.length / 3, hollow.length / 3, 1);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

// The spray the wave threw off as it froze: crystals hanging in the barrel,
// [x, y, z, size, phase].
export const SPRAY = Array.from({ length: 12 }, (_, i) => {
  const st = WAVE_STATIONS[i % 4];
  return [
    st.ax + (-2.2 - 1.4 * rnd(i, 2.3)) * st.sc,
    (1.1 + 2.6 * rnd(i, 3.7)) * st.sc,
    st.z - 1.4 * rnd(i, 1.1),
    0.2 + 0.22 * rnd(i, 4.1),
    rnd(i, 5.9) * Math.PI * 2,
  ];
});
