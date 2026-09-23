// TRITON's glacier front, as geometry (lib/world/terrain.js shapes the
// mountain and its glaciers; this is the ice that stands ON its foot). Pure
// builders, no React: components/world/land/Triton.jsx turns them into three
// meshes and runs the anomaly.
//
//   ice   one flat-shaded, vertex-coloured mesh: the serac wall along the
//         foot (deep ultramarine at the snow, turquoise, pale aqua up high,
//         snow on every face that looks at the sky, one violet ash layer
//         running through the old ice), the natural ice arch the river
//         leaves by, its icicles, the icefall tumbling down behind the
//         reading point, and the tongue: the snout spread flat on the plain
//         as polished blue ice out to the reading point.
//   glow  one unlit, vertex-coloured mesh: the Cherenkov light inside the
//         ice (the cave's back wall and floor, the crevasses between the
//         seracs, the cracks across the glacier above and the tongue).
//   CALVERS: the anomaly, the icefall's blocks that calve and un-calve.
//
// The foot line (where the ground first rises, from heightAt) runs z = -75
// from x = -8 to 6, recedes to -77 at x = 9, juts to -72.6 on the icefall
// lobe (x 10..18) and ends at the Google range at x = 20. Every piece's
// front stays inside a LAND_COLLIDERS "triton" circle (or the dam's), so
// the seal never slides into ice.

import { BufferGeometry, Color, ConeGeometry, Float32BufferAttribute, IcosahedronGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { heightAt } from "../../../../lib/world/terrain";

const TAU = Math.PI * 2;
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const col = (hex) => new Color(hex);

// ---- colour ------------------------------------------------------------------

// Metres above a piece's own base: glacier ice darkens and saturates with
// depth, so every serac is ultramarine where it meets the snow and pale at
// its crown.
const ICE_STOPS = [
  [0, col("#1a3894")],
  [1.1, col("#2360c8")],
  [2.9, col("#2aa2e8")],
  [5.2, col("#44c8f1")],
  [8.5, col("#96e2f6")],
  [12.5, col("#d0f0fa")],
];
const SNOW = col("#f5f9fd");
const BAND = col("#6f45dc"); // an old ash layer, the same height all along the wall
const BAND_Y = [1.72, 2.18]; // world y
const TINTS = [col("#25cfc6"), col("#6a7cf0")]; // a turquoise serac, a periwinkle one
const ICICLE = col("#c2f1fb");

// The light inside the ice (unlit): white-hot deep in, Cherenkov blue, then
// navy where it meets daylight.
const CHER_HOT = col("#c8fdff");
const CHER = col("#1ec8f0");
const CHER_DEEP = col("#0c52ae");
const NAVY = col("#0a1d52");
const SLIT_STOPS = [
  [0, col("#86f4ff")],
  [2, CHER],
  [6, CHER_DEEP],
  [12, NAVY],
];

function ramp(out, stops, t) {
  if (t <= stops[0][0]) return out.copy(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    if (t < t1) {
      const [t0, c0] = stops[i - 1];
      return out.copy(c0).lerp(c1, (t - t0) / (t1 - t0));
    }
  }
  return out.copy(stops[stops.length - 1][1]);
}

// Flat normals, then a colour per vertex from its height and facing.
function paint(geo, { base = 0, band = false, tint = null, tintAmt = 0, solid = null }) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const out = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (solid) c.copy(solid);
    else {
      ramp(c, ICE_STOPS, y - base);
      if (tint) c.lerp(tint, tintAmt);
      if (band && y > BAND_Y[0] && y < BAND_Y[1]) c.copy(BAND);
      const ny = nor.getY(i);
      if (ny > 0.42) c.lerp(SNOW, Math.min(1, (ny - 0.42) / 0.2));
    }
    out[i * 3] = c.r;
    out[i * 3 + 1] = c.g;
    out[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(out, 3));
  return g;
}

// ---- seracs ------------------------------------------------------------------

// A serac: an n-sided prism, tapered, sheared (so its foot stays level in
// the snow while it leans), its facets jittered, capped with a slanted cut
// (which catches snow) or a spire.
function serac(s, i) {
  const { x, z, h, rx = 1.5, rz = 1.3, sides = 6, taper = 0.22, leanX = 0, leanZ = -0.05, band = false, cap = "slant", capH = 1.8, slope = 0.42 } = s;
  const seed = i * 17.31 + 3.7;
  const base = s.base ?? heightAt(x, z + rz) - 0.45;
  const rot = s.rot ?? hash(seed) * TAU;
  const capDir = hash(seed + 5) * TAU;
  const rows = [0, 0.7, 1.5, 2.8, 4.6, 7, 9.5, 12.5].filter((y) => y < h - 0.4);
  if (band) for (const y of [1.6, BAND_Y[0] + 0.03, BAND_Y[1] - 0.03, 2.3]) if (y - base > 0.1 && y - base < h - 0.4) rows.push(y - base);
  rows.sort((a, b) => a - b);
  rows.push(h);

  const pos = [];
  const idx = [];
  const n = sides;
  rows.forEach((y, k) => {
    const f = 1 - taper * (y / h);
    const top = k === rows.length - 1;
    for (let j = 0; j < n; j++) {
      const a = rot + (j / n) * TAU;
      const jit = k === 0 ? 1 : 1 + 0.26 * (hash(seed + j * 7.3 + k * 3.1) - 0.5);
      const ox = Math.cos(a) * rx * f * jit;
      const oz = Math.sin(a) * rz * f * jit;
      let py = base + y;
      if (top && cap === "slant") py += slope * (ox * Math.cos(capDir) + oz * Math.sin(capDir));
      pos.push(x + ox + leanX * y, py, z + oz + leanZ * y);
    }
  });
  for (let k = 0; k < rows.length - 1; k++) {
    for (let j = 0; j < n; j++) {
      const a = k * n + j;
      const b = k * n + ((j + 1) % n);
      const c = (k + 1) * n + ((j + 1) % n);
      const d = (k + 1) * n + j;
      idx.push(a, c, b, a, d, c);
    }
  }
  const t0 = (rows.length - 1) * n;
  const spire = cap === "spire";
  pos.push(
    x + leanX * h + (spire ? (hash(seed + 9) - 0.5) * 0.8 : 0),
    base + h + (spire ? capH : 0),
    z + leanZ * h + (spire ? (hash(seed + 11) - 0.5) * 0.8 : 0),
  );
  const apex = pos.length / 3 - 1;
  for (let j = 0; j < n; j++) idx.push(apex, t0 + ((j + 1) % n), t0 + j);

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const tint = hash(seed + 21) < 0.55 ? TINTS[Math.floor(hash(seed + 23) * TINTS.length)] : null;
  return paint(g, { base, band, tint, tintAmt: 0.3 });
}

// The wall along the foot, west to east (the arch stands between -12 and 4).
const WALL = [
  { x: -13.6, z: -78.8, h: 12, rx: 1.7, rz: 1.5, band: true },
  { x: -10.9, z: -77.4, h: 9.5, band: true, cap: "spire" },
  { x: 4.7, z: -75.7, h: 10.5, band: true },
  { x: 7.1, z: -76.9, h: 12, band: true, cap: "spire", capH: 2.4 },
  { x: 9.3, z: -78.4, h: 13, rx: 1.3, rz: 1.2, band: true },
  { x: 19.4, z: -78.2, h: 10, band: true, cap: "spire" },
  // the second rank, taller, climbing the slope behind
  { x: -12, z: -81.5, h: 12, rx: 1.8 },
  { x: -8.5, z: -80.6, h: 12, cap: "spire", capH: 2.6 },
  { x: 0.6, z: -80.8, h: 12, rx: 1.8 },
  { x: 3.3, z: -78.8, h: 13, cap: "spire", capH: 2.2 },
  { x: 6.3, z: -79.9, h: 13, rx: 1.7 },
  // standing on the arch's crown, their feet inside it
  { x: -6.4, z: -76.6, base: 5.2, h: 5.6, rx: 1.4, rz: 1.2, cap: "spire", capH: 2 },
  { x: -2, z: -76.9, base: 5.4, h: 6.6, rx: 1.4, rz: 1.2 },
  { x: -4.3, z: -78.6, base: 6.2, h: 8, rx: 1.6, rz: 1.3, cap: "spire", capH: 2.4 },
];

// The icefall: the glacier breaking over the lobe above the reading point
// (collider 14, -77, r 5) into tumbled blocks, short and tipped at the
// front, taller seracs stepping up the slope behind.
const LOBE = { x: 14, z: -77 };
const onLobe = (deg, r = 3.3) => {
  const a = (deg * Math.PI) / 180;
  return { x: LOBE.x + Math.sin(a) * r, z: LOBE.z + Math.cos(a) * r, yaw: a };
};
const ICEFALL = [
  ...[-62, 62].map((deg, k) => {
    const { x, z } = onLobe(deg);
    return {
      x,
      z,
      h: [3.4, 3.1][k],
      rx: 1.4,
      rz: 1.15,
      sides: 4 + k,
      taper: 0.12,
      leanX: (hash(k * 3.3) - 0.5) * 0.45,
      leanZ: (hash(k * 5.1) - 0.5) * 0.35,
      slope: 0.5,
      base: heightAt(x, z) - 0.9,
    };
  }),
  { x: 12.4, z: -76.1, h: 6, rx: 1.5, rz: 1.3, sides: 5, leanX: -0.12, slope: 0.5 },
  { x: 15.6, z: -76.1, h: 6.8, rx: 1.5, rz: 1.3, sides: 4, leanX: 0.14, slope: 0.5 },
  { x: 11.8, z: -79, h: 12, rx: 1.6, cap: "spire", capH: 2.2 },
  { x: 14.1, z: -80.2, h: 13, rx: 1.8 },
  { x: 16.5, z: -79, h: 11, rx: 1.6, cap: "spire", capH: 2 },
].map((s) => ({ ...s, base: s.base ?? heightAt(s.x, s.z + (s.rz ?? 1.3)) - 0.8 }));

// ---- the ice cave: the river's source (RIVER.points[0] is [-4, -72, 8]) ---

// A natural arch of glacier ice over the river (banks at x = -8 and 0): a
// thick half ring, faceted and knocked out of true, its legs on the banks.
export const CAVE = { x: -4, z: -76 };
const ARCH_R = 6.2;
const ARCH_TUBE = 1.65;
const ARCH_DEPTH = 1.3; // the tube's depth (z) over its thickness

function displace(g, amount, seed) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n = (k) => hash(x * 1.37 + y * 2.11 + z * 0.73 + seed + k * 19.1) - 0.5;
    p.setXYZ(i, x + amount * n(1), y + amount * n(2), z + amount * n(3));
  }
  return g;
}

function buildArch() {
  const g = new TorusGeometry(ARCH_R, ARCH_TUBE, 6, 12, Math.PI);
  g.scale(1, 1, ARCH_DEPTH);
  displace(g, 0.45, 4.2);
  g.translate(CAVE.x, -0.35, CAVE.z);
  return paint(g, { base: -0.35 });
}

// Chunky icicles hanging off the arch's front lip, longest at the crown.
function buildIcicles() {
  const parts = [];
  const rIn = ARCH_R - ARCH_TUBE * 0.85;
  const zLip = CAVE.z + ARCH_TUBE * ARCH_DEPTH * 0.55;
  for (let k = 0; k < 9; k++) {
    const u = Math.PI * (0.17 + (0.66 * k) / 8);
    const len = 0.9 + 1.2 * Math.sin(u) ** 2 * (0.7 + 0.6 * hash(k * 2.7));
    const r = 0.22 + 0.12 * hash(k * 4.1);
    const g = new ConeGeometry(r, len, 5, 1);
    g.rotateX(Math.PI);
    g.translate(CAVE.x + rIn * Math.cos(u), -0.35 + rIn * Math.sin(u) - len / 2 + 0.2, zLip);
    parts.push(paint(g, { solid: ICICLE }));
  }
  return parts;
}

// ---- the glow ----------------------------------------------------------------

// Triangles with a colour per corner (unlit, so no normals).
function soup() {
  const pos = [];
  const clr = [];
  const put = (v) => {
    pos.push(v[0], v[1], v[2]);
    clr.push(v[3].r, v[3].g, v[3].b);
  };
  return {
    tri(a, b, c) {
      put(a);
      put(b);
      put(c);
    },
    quad(a, b, c, d) {
      put(a);
      put(b);
      put(c);
      put(a);
      put(c);
      put(d);
    },
    geometry() {
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new Float32BufferAttribute(clr, 3));
      return g;
    },
  };
}
const v = (x, y, z, c) => [x, y, z, c];

// The crevasses between the seracs: a lit slit running through the wall's
// middle, visible only where two seracs leave a gap.
const SLITS = [
  { pts: [[-14.2, -79.2], [-11, -77.6], [-9.2, -76.6]], h: 12 },
  { pts: [[1.8, -75.6], [4.7, -75.7], [7.1, -76.9], [9.3, -78.4], [10.4, -78.3]], h: 12 },
  { pts: [[18.3, -78.2], [20.4, -78.4]], h: 9 },
  // round the icefall lobe, behind its front blocks
  { pts: [-70, -40, -10, 20, 50, 72].map((d) => [LOBE.x + Math.sin((d * Math.PI) / 180) * 2.4, LOBE.z + Math.cos((d * Math.PI) / 180) * 2.4]), h: 6 },
];

function addSlit(s, { pts, h }) {
  const rows = SLIT_STOPS.map(([y]) => y).filter((y) => y < h);
  rows.push(h);
  const c0 = new Color();
  const c1 = new Color();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const ya = heightAt(ax, az) - 0.4;
    const yb = heightAt(bx, bz) - 0.4;
    for (let k = 0; k < rows.length - 1; k++) {
      ramp(c0, SLIT_STOPS, rows[k]);
      ramp(c1, SLIT_STOPS, rows[k + 1]);
      s.quad(v(ax, ya + rows[k], az, c0.clone()), v(bx, yb + rows[k], bz, c0.clone()), v(bx, yb + rows[k + 1], bz, c1.clone()), v(ax, ya + rows[k + 1], az, c1.clone()));
    }
  }
}

// The cave's light: a lit back wall standing just inside the arch, white-hot
// low in the middle where the river leaves, Cherenkov blue, navy at the rim
// (hidden in the arch); and the floor under the arch glowing toward it.
const CAVE_BACK_Z = -75.7;
const CAVE_MOUTH_Z = -73.6;
const CAVE_R = 4.7;
const FLOOR_STOPS = [
  [0, CHER_HOT],
  [0.45, CHER],
  [1, CHER_DEEP],
];

function addCaveGlow(s) {
  const NU = 12;
  const hot = v(CAVE.x, -0.35, CAVE_BACK_Z, CHER_HOT);
  const ring = (r, u, c) => v(CAVE.x + Math.cos(u) * r, -0.35 + Math.sin(u) * r, CAVE_BACK_Z, c);
  for (let b = 0; b < NU; b++) {
    const u0 = (b / NU) * Math.PI;
    const u1 = ((b + 1) / NU) * Math.PI;
    s.tri(hot, ring(2.3, u0, CHER), ring(2.3, u1, CHER));
    s.quad(ring(2.3, u0, CHER), ring(CAVE_R, u0, NAVY), ring(CAVE_R, u1, NAVY), ring(2.3, u1, CHER));
  }
  const NS = 8;
  const NV = 3;
  const floor = (sv, vv) => {
    const z = CAVE_BACK_Z + (CAVE_MOUTH_Z - CAVE_BACK_Z) * vv;
    const x = CAVE.x + sv * CAVE_R * 0.95;
    return v(x, Math.max(heightAt(x, z) + 0.08, -0.3), z, ramp(new Color(), FLOOR_STOPS, 0.55 * vv + 0.45 * Math.abs(sv)));
  };
  for (let a = 0; a < NV; a++) {
    for (let b = 0; b < NS; b++) {
      const s0 = -1 + (2 * b) / NS;
      const s1 = -1 + (2 * (b + 1)) / NS;
      s.quad(floor(s0, a / NV), floor(s1, a / NV), floor(s1, (a + 1) / NV), floor(s0, (a + 1) / NV));
    }
  }
}

// A crack along a polyline, closed at both ends: a navy lip each side,
// Cherenkov blue down the middle, `lift` m above the ground.
function addCrack(s, pts, k, half, lift) {
  const SEG = 4;
  const rows = [];
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    for (let j = i === 0 ? 0 : 1; j <= SEG; j++) {
      const t = (i + j / SEG) / n;
      const w = Math.min(1, Math.sin(t * Math.PI) * 1.6);
      const zig = (hash(k * 13 + i * 7 + j * 2.3) - 0.5) * half * 1.4;
      const cx = ax + ((bx - ax) * j) / SEG + nx * zig;
      const cz = az + ((bz - az) * j) / SEG + nz * zig;
      const at = (o) => {
        const x = cx + nx * o * half * w;
        const z = cz + nz * o * half * w;
        return [x, heightAt(x, z) + lift, z];
      };
      rows.push([at(-1), at(0), at(1)]);
    }
  }
  for (let i = 0; i < rows.length - 1; i++) {
    const [l0, m0, r0] = rows[i];
    const [l1, m1, r1] = rows[i + 1];
    s.quad(v(...l0, NAVY), v(...l1, NAVY), v(...m1, CHER), v(...m0, CHER));
    s.quad(v(...m0, CHER), v(...m1, CHER), v(...r1, NAVY), v(...r0, NAVY));
  }
}

// Transverse crevasses across the glacier above the snout.
const GLACIER_CRACKS = [
  [[-5, -83.5], [2, -83.2], [9, -82.6]],
  [[-2, -87.2], [5, -86.8], [12, -86.6]],
  [[1, -91.2], [11, -90.7]],
  [[-8, -89.2], [-1.5, -88.6]],
  [[5, -95], [14, -94.7]],
];

// ---- the tongue: the glacier's snout spread flat on the plain ---------------

// Where the ground first rises at x, searching north from the plain.
function footZ(x) {
  let z = -62;
  while (z > -80 && heightAt(x, z) < 0.4) z -= 0.1;
  return z;
}

// Polished blue ice, a hand above the snow (the seal slides on it: npm run
// check's flat-ground rule holds), from under the ice front out to a lobed
// snout that reaches the reading point. Deep blue at the ice front, paler
// out at the snout; wind-blown snow lying on it in patches; cracks in it lit
// from below, running out from the icefall.
const TONGUE_X = [0.9, 19.2];
const TONGUE_LIFT = 0.06;
const snoutZ = (x) => -63.9 - 3.2 * ((x - 13.2) / 8.5) ** 2 + 0.45 * Math.sin(x * 1.3) + 0.25 * Math.sin(x * 2.9 + 1);
const TONGUE_STOPS = [
  [0, col("#2c74d2")],
  [0.4, col("#47a0e6")],
  [1, col("#92d2f2")],
];
const SNOW_PATCHES = [
  [4.5, -70.6, 1.3],
  [9.2, -67.3, 1.1],
  [11.6, -70.4, 0.8],
  [17.6, -67.6, 1.2],
  [6.9, -73.1, 0.9],
  [15.4, -65.1, 0.7],
  [2.4, -72.6, 0.8],
  [13.6, -68.4, 0.6],
];
const TONGUE_CRACKS = [
  [[13.2, -72.3], [12.4, -69.6], [11, -67.8], [10.2, -66.2]],
  [[15.2, -72.2], [16.2, -69.8], [17.6, -68.3]],
  [[8.2, -74.8], [7.6, -72.2], [6, -70.2], [4.6, -69.4]],
  [[3.4, -74.2], [3.1, -72], [2.6, -70.8]],
  [[6, -70.2], [8.4, -68.8], [11, -67.8]],
  [[18.6, -74.2], [18.9, -71.2]],
];

function buildTongue() {
  const s = soup();
  const NX = 40;
  const NZ = 6;
  const c = new Color();
  const cols = [];
  for (let i = 0; i <= NX; i++) {
    const x = TONGUE_X[0] + ((TONGUE_X[1] - TONGUE_X[0]) * i) / NX;
    let zb = footZ(x) - 0.8;
    while (heightAt(x, zb) > 1 && zb < -64) zb += 0.2;
    const zf = Math.max(snoutZ(x), zb + 3);
    const strip = [];
    for (let j = 0; j <= NZ; j++) {
      const t = j / NZ;
      const z = zb + (zf - zb) * t;
      strip.push(v(x, heightAt(x, z) + TONGUE_LIFT, z, ramp(c, TONGUE_STOPS, t).clone()));
    }
    cols.push(strip);
  }
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const a = cols[i][j];
      const b = cols[i + 1][j];
      const cc = cols[i + 1][j + 1];
      const d = cols[i][j + 1];
      s.tri(a, cc, b);
      s.tri(a, d, cc);
    }
  }
  SNOW_PATCHES.forEach(([px, pz, r], k) => {
    const n = 7;
    const ring = Array.from({ length: n }, (_, j) => {
      const a = (j / n) * TAU + hash(k * 3.1);
      const rr = r * (0.7 + 0.55 * hash(k * 5 + j * 1.9));
      const x = px + Math.cos(a) * rr;
      const z = pz + Math.sin(a) * rr * 0.8;
      return v(x, heightAt(x, z) + TONGUE_LIFT + 0.015, z, SNOW);
    });
    const centre = v(px, heightAt(px, pz) + TONGUE_LIFT + 0.015, pz, SNOW);
    for (let j = 0; j < n; j++) s.tri(centre, ring[(j + 1) % n], ring[j]);
  });
  const g = s.geometry();
  g.computeVertexNormals();
  return g;
}

// ---- the whole front ---------------------------------------------------------

export function buildTriton() {
  const ice = mergeGeometries([...WALL.map(serac), ...ICEFALL.map((s, i) => serac(s, i + 40)), buildArch(), ...buildIcicles(), buildTongue()]);
  const s = soup();
  for (const slit of SLITS) addSlit(s, slit);
  addCaveGlow(s);
  GLACIER_CRACKS.forEach((c, k) => addCrack(s, c, k, 0.55, 0.08));
  TONGUE_CRACKS.forEach((c, k) => addCrack(s, c, k + 20, 0.17, TONGUE_LIFT + 0.03));
  return { ice, glow: s.geometry() };
}

// ---- the anomaly: the icefall calves, and then un-calves ---------------------

// The three middle blocks of the icefall's front rank (the district's hot
// spot, lib/world/places.js) break off in turn, topple onto the snow and
// shatter, then everything plays BACKWARDS, glowing: the chips fly home, the
// block stands back up into the glacier. Triton.jsx runs the clock; each
// block is one instance of CALVER_GEO, local origin at its base centre, +z
// its face toward the snow, its pivot the front bottom edge.
export const CALVER = { h: 3.8, front: 0.8 };
export const CALVERS = [-31, 0, 31].map((deg) => {
  const { x, z, yaw } = onLobe(deg);
  return { x, z, yaw, base: heightAt(x, z) - 0.9 };
});
export function buildCalver() {
  return serac({ x: 0, z: 0, base: 0, h: CALVER.h, rx: 1.3, rz: 1.1, sides: 4, rot: Math.PI / 4, taper: 0.06, leanZ: 0, slope: 0.45 }, 77);
}
// The chips it shatters into.
export function buildChip() {
  return paint(new IcosahedronGeometry(0.38, 0), { solid: ICICLE });
}
