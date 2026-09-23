// The shape of the land: one height field for the whole island, pure and
// cheap (no allocation per call), so anything can ask how high the ground is.
//
//   heightAt(x, z)     metres above the snow plain (y = 0)
//   groundAt(x, z, o)  the same, plus what the ground is made of there (for
//                      the terrain's colours: components/world/land/Terrain.jsx)
//   coastRadius(a)     where the coast's cliff top stands at angle a
//                      (atan2(z, x): 0 east, PI/2 south)
//
// THE CONTRACT: wherever the seal can walk (inside the rim, outside every
// collider circle, outside the water) the ground is y = 0 within 0.3 m (npm
// run check samples it), so buildings, props and the seal stand at y = 0.
// Relief lives only where the seal cannot go:
//   - inside LAND_COLLIDERS (lib/world/land.js) and past the rim: the
//     mountains. Each rises from the edge of its footprint at its own slope
//     (MujoRush's granite sheer, Triton's ice and the Google range steep)
//     up to its peak's cone, so the foot sits exactly on the collider edge.
//   - under the water (lib/world/river.js): the river's channel, the lake
//     behind the ice dam and the moat's ring, cut below WATER_Y, the bed
//     deeper where the water is wider.
//   - at the coast: a snow bank past the rim, rock headlands, and an ice
//     cliff down into the sea.
// The ice dam's own bulk (land "dam") and everything a land builder carves
// (the faces, the ice cave, the geyser) are drawn by components/world/land/*;
// under the dam's circles the ground stays flat for them.

import { LAND_COLLIDERS } from "./land.js";
import { ISLAND_RADIUS, PLACES, SPAWN } from "./places.js";
import { MOAT, RIVER, WATERS } from "./river.js";

export const WATER_Y = -0.35; // river, lake and moat surface
export const SEA_Y = -0.6; // the open sea (components/world/Sea.jsx)
export const KEEP_TOP = 4.2; // the flat top of the NVIDIA keep's mesa

const R = ISLAND_RADIUS;
const TAU = Math.PI * 2;

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
function smooth(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// ---- noise: seeded value noise, fbm and ridged fbm, all 0..1 -------------

function hash(ix, iz) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
export function fbm(x, z) {
  return 0.5 * vnoise(x, z) + 0.3 * vnoise(x * 2.03 + 17.1, z * 2.03 - 9.2) + 0.2 * vnoise(x * 4.1 - 3.3, z * 4.1 + 5.7);
}
// Sharp crests where the noise crosses its middle: ridgelines and gullies.
function ridged(x, z) {
  const a = 1 - Math.abs(2 * vnoise(x, z) - 1);
  const b = 1 - Math.abs(2 * vnoise(x * 2.1 + 31.7, z * 2.1 - 17.3) - 1);
  return (0.68 * a * a + 0.32 * b * b);
}

// ---- the coast ----------------------------------------------------------------

// [angle, half-width (rad), how far the land reaches past the coast (m),
// rock height (m)]: the headlands; between them the bays.
const HEADLANDS = [
  [0.32, 0.15, 7, 4], // the east point, south of the river mouth
  [1.02, 0.13, 8, 5.5], // south-east
  [2.2, 0.16, 10, 6.5], // south-west
  [3.02, 0.12, 7, 5], // west
];
function angleGap(a, b) {
  const d = a - b;
  return d - Math.round(d / TAU) * TAU;
}

export function coastRadius(theta) {
  let rc = 91 + 2 * Math.sin(3 * theta + 0.7) + 1.3 * Math.sin(5 * theta + 2.1) + 0.7 * Math.sin(11 * theta + 0.4);
  for (const [a, w, reach] of HEADLANDS) {
    const d = angleGap(theta, a) / w;
    rc += reach * Math.exp(-d * d);
  }
  return rc;
}

// Past the rim: a snow bank that rises from the rim, rock on the headlands,
// then the ice cliff down to the sea floor. `o.cliff` is 0 on top, 1 at the
// cliff's foot; `o.rock` how much of the height is headland rock.
function coast(x, z, r, o) {
  const theta = Math.atan2(z, x);
  const rc = coastRadius(theta);
  let rock = 0;
  for (const [a, w, , height] of HEADLANDS) {
    const d = angleGap(theta, a) / w;
    rock += height * Math.exp(-d * d);
  }
  const bank = Math.max(0.35, 1.3 + 0.9 * Math.sin(4 * theta + 1) + 0.6 * Math.sin(7 * theta + 2.3)) * (1 - 0.9 * o.oldBed);
  const crag = rock * smooth(R + 1.5, R + 6, r) * (0.55 + 0.9 * ridged(x / 6, z / 6));
  const top = bank * smooth(R + 0.2, R + 2.8, r) + crag;
  const past = r - rc;
  o.rock = crag > 0.4 ? crag / (top || 1) : 0;
  o.cliff = past > 0 ? smooth(0, 1.6, past) : 0;
  if (past <= 0) return top;
  return top + (-3 - 0.25 * past - top) * o.cliff;
}

// ---- the old riverbed ------------------------------------------------------------

// Before Triton's western glacier curled across the valley, the river ran
// on south from the lake, through the middle of the island, to the south
// bay. The ice dam cut it off: its bed is dry now, a band of old grey-blue
// ice a hand's depth below the snow, from the dam's foot (the geyser and
// the TensorFlow reading point stand in it) to a notch in the south coast.
const OLD_BED = [[-4, -30], [-4, -19], [-7, -10], [-6, 0], [-2, 13], [4, 27], [8, 40], [10, 54], [6, 68], [1, 80], [-1, 96]];
function oldBed(x, z) {
  let d = Infinity;
  for (let i = 0; i < OLD_BED.length - 1; i++) {
    const [ax, az] = OLD_BED[i];
    const [bx, bz] = OLD_BED[i + 1];
    d = Math.min(d, segDist(x, z, ax, az, bx, bz));
  }
  return smooth(6, 2.5, d + 1.5 * (vnoise(x / 6, z / 6) - 0.5));
}

// ---- the plain: drifts under 0.3 m, flat wherever something stands ---------

const FLAT = [
  ...PLACES.map((p) => [p.x, p.z, p.radius + 3.4, p.radius + 6.5]),
  [SPAWN.x, SPAWN.z, 3, 6],
];
function plain(x, z, bed) {
  let keep = 1;
  for (const [px, pz, r0, r1] of FLAT) {
    const dx = x - px;
    const dz = z - pz;
    if (dx * dx + dz * dz < r1 * r1) keep = Math.min(keep, smooth(r0, r1, Math.hypot(dx, dz)));
  }
  // the name pressed into the snow (Island.jsx): x -9..9, z 1.5..4.5
  const bx = Math.max(Math.abs(x) - 9.5, 0);
  const bz = Math.max(Math.abs(z - 3) - 2, 0);
  keep = Math.min(keep, smooth(0.5, 3, Math.hypot(bx, bz)));
  if (keep === 0) return 0;
  return keep * (0.34 * (fbm(x / 13, z / 13) - 0.5) + 0.08 * (vnoise(x / 3.1, z / 3.1) - 0.5) - 0.12 * bed);
}

// ---- the water: channel, lake and moat -------------------------------------------

// Every water segment: ax, az, bx, bz, width at a, width at b.
const SEGS = [];
for (const line of WATERS) {
  const w = line.width ?? RIVER.width;
  for (let i = 0; i < line.points.length - 1; i++) {
    const [ax, az, aw = w] = line.points[i];
    const [bx, bz, bw = w] = line.points[i + 1];
    SEGS.push(ax, az, bx, bz, aw, bw);
  }
}

// Distance past the nearest bank (negative in the water) and the water's
// half-width there, into o.gap and o.half.
function water(x, z, o) {
  let gap = Infinity;
  let half = RIVER.width / 2;
  for (let i = 0; i < SEGS.length; i += 6) {
    const ax = SEGS[i];
    const az = SEGS[i + 1];
    const sx = SEGS[i + 2] - ax;
    const sz = SEGS[i + 3] - az;
    const t = clamp01(((x - ax) * sx + (z - az) * sz) / (sx * sx + sz * sz || 1));
    const w = SEGS[i + 4] + (SEGS[i + 5] - SEGS[i + 4]) * t;
    const g = Math.hypot(x - ax - sx * t, z - az - sz * t) - w / 2;
    if (g < gap) {
      gap = g;
      half = w / 2;
    }
  }
  o.gap = gap;
  o.half = half;
}

// The ground the water allows at (x, z): the bed under it (deeper where the
// water is wider, so the lake is deep and the river quick and shallow), a
// wet bank that meets the plain 1.2 m out, and past that a V-notch that only
// matters where the land stands higher (the coast bank at the river mouth).
// Under the water a shallow shelf runs along each bank, wider and narrower
// by turns, so the deep channel inside the (straight-edged) water wanders
// like a real river's, with bars on its inside bends.
function carve(x, z, o) {
  const { gap, half } = o;
  if (gap < 0) {
    const g = -gap;
    const shelf = Math.min(2.2, 0.32 * half) * smooth(0.3, 0.75, fbm(x / 9, z / 9));
    const depth = 0.9 + 0.22 * half;
    return -0.2 - 0.3 * smooth(0, 0.7, g) - depth * smooth(shelf, shelf + Math.max(1.2, 0.8 * (half - shelf)), g);
  }
  if (gap < 1.2) return -0.2 + 0.2 * smooth(0, 1.2, gap);
  return (gap - 1.2) * 1.3;
}

// ---- the mountains --------------------------------------------------------------

// Metres of rise per metre inside a landform's footprint: the foot of each
// mountain is exactly its collider edge (or the rim, past which the land may
// rise at RIM_SLOPE, steepening further out).
// Snow drifts against each foot first: APRON m of it rising at 0.75.
const FOOT = { triton: 2.4, mujorush: 7, "google-range": 1.5 };
const APRON = { triton: 1.8, mujorush: 1.5, "google-range": 1.8 };
const RIM_SLOPE = 1.6;
const BULK = LAND_COLLIDERS.filter((c) => FOOT[c.land]).map((c) => [c.x, c.z, c.radius, FOOT[c.land], APRON[c.land]]);
function rise(e, slope, apron) {
  return e < apron ? e * 0.75 : apron * 0.75 + (e - apron) * slope;
}
const DAMS = LAND_COLLIDERS.filter((c) => c.land === "dam").map((c) => [c.x, c.z, c.radius]);

// Peaks: centre, height, radius at sea level, how much steeper the far
// (north) flank is, profile exponent (<1 domed, >1 spired), ridge relief,
// and which material shows on its steep faces.
const ICE = 1;
const GRANITE = 2;
const ROCK = 3;
const PEAKS = [
  { x: 0, z: -114, h: 86, r: 60, back: 1.7, shape: 1.25, relief: 9, stuff: ICE }, // TRITON
  { x: 26, z: -81, h: 30, r: 27, back: 1.3, shape: 1.4, relief: 4, stuff: ROCK }, // Highway Pass, west peak
  { x: 50, z: -81, h: 33, r: 27, back: 1.3, shape: 1.4, relief: 4, stuff: ROCK }, // Highway Pass, east peak
  { x: 65, z: -75, h: 40, r: 30, back: 1.3, shape: 1.45, relief: 5, stuff: ROCK }, // XNNPACK Peak
  { x: 77, z: -60, h: 15, r: 13, back: 1, shape: 1.1, relief: 3, stuff: ROCK }, // its east shoulder
];
// Mount MujoRush: a granite ridge, domed like Rushmore, its south face the
// sheer cliff (FOOT.mujorush) the three faces are carved in.
const MUJO = { ax: -52, az: -65, bx: -24, bz: -66, h: 32, r: 23, stuff: GRANITE };

// The carved cliff band itself (components/world/land/MujoRush.jsx's three
// heads sit at HEAD_Z = -55.2, lib/world/land.js's own note: "carved south
// cliff runs along z = -55 from x = -54 to -16"): smooth granite there, not
// the chunky ridged relief every other mountain face gets, so the heads
// read as cut INTO the rock instead of freestanding blobs in front of a
// jagged wall.
const MUJO_CLIFF = { z0: -58, z1: -50, x0: -54, x1: -16, margin: 4 };
function mujoCliffFactor(x, z) {
  const zIn = smooth(MUJO_CLIFF.z0 - MUJO_CLIFF.margin, MUJO_CLIFF.z0, z) * smooth(MUJO_CLIFF.z1 + MUJO_CLIFF.margin, MUJO_CLIFF.z1, z);
  const xIn = smooth(MUJO_CLIFF.x0 - MUJO_CLIFF.margin, MUJO_CLIFF.x0, x) * smooth(MUJO_CLIFF.x1 + MUJO_CLIFF.margin, MUJO_CLIFF.x1, x);
  const band = zIn * xIn; // 0 outside, 1 through the core of the band
  return 1 - band * 0.85; // 1x relief outside, 0.15x inside
}
// Highway Pass: a V cut through the range between its two peaks. Its floor
// is the plain at the mouth (z = -66), rises north past the rim to the
// saddle (9 m, 20 m in) and falls away beyond; its walls climb 2.2 m per m.
const PASS = { x: 38, mouth: -66, floor: 9, half: 3, wall: 2.2 };
function passCap(x, z) {
  const along = PASS.mouth - z;
  if (along < 0) return Infinity;
  const floor = PASS.floor * smooth(4, 20, along) - 0.5 * Math.max(0, along - 26);
  return floor + Math.max(0, Math.abs(x - PASS.x) - PASS.half) * PASS.wall;
}

// Triton's glaciers: [x, z, half-width] polylines from the ice cap down.
// The central one ends in the snout over the river's ice cave and the
// icefall; the western one feeds the TensorFlow ice dam's glacier.
const GLACIERS = [
  [[2, -108, 6], [3, -96, 9], [4, -86, 12.5], [4, -78, 15]],
  [[-9, -106, 5], [-12, -94, 6], [-14, -82, 6.5]],
];

function segDist(x, z, ax, az, bx, bz) {
  const sx = bx - ax;
  const sz = bz - az;
  const t = clamp01(((x - ax) * sx + (z - az) * sz) / (sx * sx + sz * sz || 1));
  return Math.hypot(x - ax - sx * t, z - az - sz * t);
}
function cone(d, r, h, shape) {
  const t = d / r;
  return t < 1 ? h * Math.pow(1 - t, shape) : -(t - 1) * h * 0.6;
}
function glacierAt(x, z) {
  let g = 0;
  for (const line of GLACIERS) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az, aw] = line[i];
      const [bx, bz, bw] = line[i + 1];
      const sx = bx - ax;
      const sz = bz - az;
      const t = clamp01(((x - ax) * sx + (z - az) * sz) / (sx * sx + sz * sz));
      const half = aw + (bw - aw) * t;
      const d = Math.hypot(x - ax - sx * t, z - az - sz * t);
      g = Math.max(g, smooth(half, half * 0.55, d));
    }
  }
  return g;
}

// How high the mountains stand at (x, z) (negative where there are none),
// and what their faces are made of there, into o.stuff / o.glacier.
function mountains(x, z, r, o) {
  // the cones
  let best = -Infinity;
  let stuff = 0;
  let relief = 0;
  for (const p of PEAKS) {
    const dz = z - p.z;
    const c = cone(Math.hypot(x - p.x, dz < 0 ? dz * p.back : dz), p.r, p.h, p.shape);
    if (c > best) {
      best = c;
      stuff = p.stuff;
      relief = p.relief;
    }
  }
  const mujo = cone(segDist(x, z, MUJO.ax, MUJO.az, MUJO.bx, MUJO.bz), MUJO.r, MUJO.h, 0.75);
  if (mujo > best) {
    best = mujo;
    stuff = GRANITE;
    relief = 2.5;
  }
  o.stuff = stuff;
  o.glacier = 0;
  if (best <= -2) return best;

  // ridges and gullies on the flanks, none on the glaciers' ice
  const g = stuff === ICE ? glacierAt(x, z) : 0;
  o.glacier = g;
  const lift = clamp01(best / 12);
  if (stuff === GRANITE) relief *= mujoCliffFactor(x, z);
  let h = best + relief * (ridged(x / 17, z / 17) - 0.42) * 2 * lift * (1 - g) - 2.5 * g * lift;
  const pass = passCap(x, z);
  if (pass < h) h = pass;

  // the foot: rise from the footprint's edge at the landform's own slope
  const past = r - R - 0.3;
  let foot = past * RIM_SLOPE + (past > 0 ? 0.25 * past * past : 0);
  for (let i = 0; i < BULK.length; i++) {
    const [cx, cz, cr, s, apron] = BULK[i];
    const e = rise(cr - Math.hypot(x - cx, z - cz), s, apron);
    if (e > foot) foot = e;
  }
  if (foot < h) h = foot;

  // under the ice dam's circles the ground stays flat for the dam builder
  let sd = Infinity;
  for (const [cx, cz, cr] of DAMS) sd = Math.min(sd, Math.hypot(x - cx, z - cz) - cr);
  const cap = 5 * Math.max(0, sd);
  return h < cap ? h : cap;
}

// The NVIDIA keep: a rock mesa inside the moat's ring, flat on top.
const KEEP = MOAT.ring;
function mesa(x, z) {
  const d = Math.hypot(x - KEEP.x, z - KEEP.z);
  if (d >= KEEP.keep - 0.3) return -Infinity;
  const top = KEEP_TOP + 0.3 * (vnoise(x / 2.2, z / 2.2) - 0.5);
  return top * (1 - smooth(KEEP.keep - 2.1, KEEP.keep - 0.3, d));
}

// ---- the whole ground ---------------------------------------------------------------

// Everything about the ground at (x, z), into `o` (reused, never allocated):
//   h        height (m)
//   gap      distance past the nearest water bank (negative in the water)
//   mount    how much of h is mountain (0..1): the landforms' bulk
//   stuff    what the mountain's faces are: 1 ice (Triton), 2 granite
//            (MujoRush), 3 dark rock (the Google range); 0 none
//   glacier  0..1 on Triton's glaciers
//   coast    0 inside the rim, 1 on the coast past it
//   cliff    0..1 down the coast's cliff face
//   rock     0..1 how much of the coast is headland rock
//   keep     1 on the NVIDIA keep's mesa
//   oldBed   0..1 in the river's old, dry bed
export function groundAt(x, z, o = {}) {
  const r = Math.hypot(x, z);
  water(x, z, o);
  o.cliff = 0;
  o.rock = 0;
  o.coast = r > R ? 1 : 0;
  o.oldBed = oldBed(x, z);
  let h = r < R ? plain(x, z, o.oldBed) * (1 - smooth(R - 4, R, r)) : coast(x, z, r, o);
  const bed = carve(x, z, o);
  if (bed < h) h = bed;

  const m = mountains(x, z, r, o);
  o.mount = 0;
  if (m > h) {
    o.mount = clamp01((m - h) / 1.5);
    h = m;
  }
  o.keep = 0;
  const k = mesa(x, z);
  if (k > h) {
    h = k;
    o.keep = 1;
  }
  o.h = h;
  return o;
}

const scratch = {};
export function heightAt(x, z) {
  return groundAt(x, z, scratch).h;
}
