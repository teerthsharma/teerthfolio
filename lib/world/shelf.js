// The West Shelf (issue #77, west-margin): Triton's western ice spilled round the back of Mount MujoRush and ending in
// a blue cliff on the north-west apron. Pure geometry: TRIS is the whole shelf as hex-coloured triangles, and the block
// sites; components/world/land/Shelf.jsx draws them with the grotto's lit back wall. The shelf lies past the walkable rim, so it has no collider.

import { Color, ShapeUtils, Vector2, Vector3 } from "three";
import { heightAt } from "./terrain.js";

// The foot (the cliff's base, west to east), then the inland and seaward edges running back to the north.
export const FOOT = [[-121, -41], [-114, -45.5], [-108, -51], [-102, -55.6], [-98, -56.8], [-94, -57.9], [-90, -58.9], [-86, -59.7], [-82, -60.4], [-78, -60.9], [-74, -61.4], [-70, -61.6]];
export const INLAND = [[-70, -61.6], [-72, -70], [-70, -82], [-64, -94], [-56, -106], [-50, -114]];
export const SEAWARD = [[-121, -41], [-124, -56], [-118, -72], [-106, -88], [-90, -102], [-72, -114], [-56, -122]];
export const SLABS = [{ x: -104, lean: 6 }, { x: -96, lean: 9 }, { x: -88, lean: 14 }];
export const BLOCKS = 14;
export const COLLIDERS = [];

export const hash = (i, k) => {
  let h = (Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca77)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// The foot at x: its z, the unit tangent east along it, and the outward normal (south, toward the pup).
export function footFrame(x) {
  for (let i = 0; i < FOOT.length - 1; i++) {
    const [ax, az] = FOOT[i];
    const [bx, bz] = FOOT[i + 1];
    if (x < ax || x > bx) continue;
    const len = Math.hypot(bx - ax, bz - az);
    const tx = (bx - ax) / len;
    const tz = (bz - az) / len;
    return { z: az + ((x - ax) / (bx - ax)) * (bz - az), tx, tz, nx: -tz, nz: tx };
  }
  return null;
}

const footY = (x, z) => Math.max(heightAt(x, z), -0.8);

const GX = -80, GW = 3.2;
export const GROTTO = { x: GX, z: footFrame(GX).z, width: GW, height: 2.6, depth: 2.2, floor: footY(GX, footFrame(GX).z) };
const EDGE_W = GX - GW / 2, EDGE_E = GX + GW / 2;

// The stations along the foot: every corner, plus the two edges of the grotto so its opening is a gap in the face.
export const FRONT = [...FOOT.filter(([x]) => x < EDGE_W), [EDGE_W, footFrame(EDGE_W).z], [EDGE_E, footFrame(EDGE_E).z], ...FOOT.filter(([x]) => x > EDGE_E)];
export const SEA = SEAWARD;

export const shelfTop = (x, z) => 6.5 + 4.5 * clamp01((x + 80) / 10) * clamp01(1 - distToFoot(x, z) / 10);
function distToFoot(x, z) {
  let d = Infinity;
  for (let i = 0; i < FOOT.length - 1; i++) {
    const [ax, az] = FOOT[i];
    const [bx, bz] = FOOT[i + 1];
    const u = clamp01(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2));
    d = Math.min(d, Math.hypot(ax + u * (bx - ax) - x, az + u * (bz - az) - z));
  }
  return d;
}
export const jitter = (i) => 0.35 * (2 * hash(i, 1) - 1);
// Never below the ground plus 0.8 m, so the top never sinks into the massif's skirt.
export const topY = (x, z, j = 0) => Math.max(shelfTop(x, z) + j, heightAt(x, z) + 0.8);

// The fallen blocks: centres 0.2 to 1.2 m south of the foot, kept clear of the grotto and of each other (a candidate
// that overlaps an accepted block is redrawn; after 50 tries it is kept).
export function blockSites() {
  const out = [];
  for (let i = 0; i < BLOCKS; i++) {
    for (let a = 0; ; a++) {
      const k = 17 * a;
      let x = -112 + 38 * hash(i, 11 + k);
      if (Math.abs(x - GROTTO.x) < 2.5) x -= 5;
      const s = { x, z: footFrame(x).z + 0.2 + hash(i, 13 + k), r: 0.5 + 0.6 * hash(i, 12 + k) };
      if (a >= 50 || out.every((o) => Math.hypot(o.x - s.x, o.z - s.z) >= o.r + s.r + 0.2)) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

const SLAB_TOP = "#f0f2f7", CHAMFER = "#dbeaf5", SLAB_SIDE = "#9fcfeb", GAP = "#2b5a72", FLOOR = "#dbeaf5", FIRN = "#eef6fc";
const RAMP = ["#62abd9", "#9fcfeb", "#dbeaf5"].map((hex) => new Color(hex));
function ramp(h) {
  const f = clamp01(h / 6.5) * 2, i = Math.min(1, Math.floor(f));
  return `#${RAMP[i].clone().lerp(RAMP[i + 1], f - i).getHexString()}`;
}
// Face bands in metres above the foot: blue ice, white firn at 2.1 to 2.4 and at 4.6 to 4.8, blue to the lip.
const BANDS = [[0, 2.1, false], [2.1, 2.4, true], [2.4, 4.6, false], [4.6, 4.8, true], [4.8, Infinity, false]];

const quad = (t, a, b, c, d) => t.push([a, b, c], [a, c, d]);
const station = ([x, z], i) => ({ x, z, base: footY(x, z), top: topY(x, z, jitter(i)) });
const yAt = (c, h) => Math.min(c.base + h, c.top);

// Face quads between neighbouring stations, one per band above `from`: firn bands are flat, blue ice takes the ramp.
function strip(t, cols, from = 0, bands = BANDS) {
  for (let i = 0; i < cols.length - 1; i++) {
    const [a, b] = [cols[i], cols[i + 1]];
    for (const [lo, hi, firn] of bands) {
      const l = Math.max(lo, from);
      if (hi <= from || yAt(a, hi) - yAt(a, l) + yAt(b, hi) - yAt(b, l) <= 1e-6) continue;
      const v = (c, h) => [c.x, yAt(c, h), c.z, firn ? FIRN : ramp(yAt(c, h) - c.base)];
      quad(t, v(a, l), v(b, l), v(b, hi), v(a, hi));
    }
  }
}

function resample(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return [...out, pts[pts.length - 1]];
}

// The top: the outline (foot, inland, seaward) triangulated, flat between its stations. The inland edge runs over the
// massif's skirt, where a flat top at 4 m spacing or wider dips 0.4 m or more under the ground: it is sampled every 3 m.
function topTris(t) {
  const pts = [
    ...FRONT.map(([x, z], i) => ({ x, z, y: topY(x, z, jitter(i)) })),
    ...resample(INLAND, 3).slice(1).map(([x, z]) => ({ x, z, y: topY(x, z) })),
    ...SEA.map(([x, z], i) => ({ x, z, y: topY(x, z, jitter(i)) })).slice(1).reverse(),
  ];
  for (const tri of ShapeUtils.triangulateShape(pts.map((p) => new Vector2(p.x, p.z)), [])) {
    t.push(tri.map((v) => [pts[v].x, pts[v].y, pts[v].z, SLAB_TOP]));
  }
}

function grottoTris(t) {
  const { nx, nz } = footFrame(GX);
  const [L, R] = [EDGE_W, EDGE_E].map((x) => {
    const z = footFrame(x).z;
    return { x, z, y: footY(x, z) };
  });
  const [QL, QR] = [L, R].map((p) => ({ x: p.x - nx * GROTTO.depth, z: p.z - nz * GROTTO.depth, y: p.y }));
  const at = (p, h, hex) => [p.x, p.y + h, p.z, hex];
  const H = GROTTO.height;
  quad(t, at(L, 0.02, FLOOR), at(R, 0.02, FLOOR), at(QR, 0.02, FLOOR), at(QL, 0.02, FLOOR));
  quad(t, at(L, 0.02, GAP), at(QL, 0.02, GAP), at(QL, H, GAP), at(L, H, GAP));
  quad(t, at(R, 0.02, GAP), at(QR, 0.02, GAP), at(QR, H, GAP), at(R, H, GAP));
  quad(t, at(L, H, GAP), at(R, H, GAP), at(QR, H, GAP), at(QL, H, GAP));
}

// A leaning slab 0.95 m out from the face, its top edges bevelled 0.4 m.
function slabTris(t, { x: sx, lean }) {
  const f = footFrame(sx);
  const T = new Vector3(f.tx, 0, f.tz);
  const N = new Vector3(f.nx, 0, f.nz);
  const UP = new Vector3(0, 1, 0);
  const a = (lean * Math.PI) / 180;
  const D = UP.clone().multiplyScalar(Math.cos(a)).addScaledVector(N, Math.sin(a));
  const P = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(UP, -Math.sin(a));
  const B = new Vector3(sx, 0, f.z).addScaledVector(N, 0.95);
  B.y = footY(B.x, B.z);
  const H = 4.5, HW = 1.2, HT = 0.35;
  const hO = 1 - 0.4 / H, iT = 1 - 0.4 / HW, iP = 1 - 0.2 / HT;
  const c = (s1, s2, s3, hex) => {
    const p = B.clone().addScaledVector(T, s1 * HW).addScaledVector(P, s2 * HT).addScaledVector(D, s3 * H);
    return [p.x, p.y, p.z, hex];
  };
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  quad(t, c(-iT, -iP, 1, SLAB_TOP), c(iT, -iP, 1, SLAB_TOP), c(iT, iP, 1, SLAB_TOP), c(-iT, iP, 1, SLAB_TOP));
  corners.forEach((A, k) => {
    const Bc = corners[(k + 1) % 4];
    quad(t, c(A[0], A[1], hO, CHAMFER), c(Bc[0], Bc[1], hO, CHAMFER), c(Bc[0] * iT, Bc[1] * iP, 1, SLAB_TOP), c(A[0] * iT, A[1] * iP, 1, SLAB_TOP));
    quad(t, c(A[0], A[1], 0, SLAB_SIDE), c(Bc[0], Bc[1], 0, SLAB_SIDE), c(Bc[0], Bc[1], hO, CHAMFER), c(A[0], A[1], hO, CHAMFER));
  });
  const g = (s1, s3) => {
    const q = new Vector3(sx, 0, f.z).addScaledVector(T, s1 * HW).addScaledVector(N, 0.3);
    q.y = footY(q.x, q.z) + s3 * H * 0.9;
    return [q.x, q.y, q.z, GAP];
  };
  quad(t, g(-1, 0), g(1, 0), g(1, 1), g(-1, 1));
}

// The top is its own mesh: a flat surface that receives shadows shows acne at grazing sun, so it does not receive.
export const TOP = (() => {
  const t = [];
  topTris(t);
  return t;
})();
export const TRIS = (() => {
  const t = [];
  const front = FRONT.map((p, i) => station(p, i));
  const iL = FRONT.findIndex(([x]) => x === EDGE_W);
  strip(t, front.slice(0, iL + 1));
  strip(t, [front[iL], front[iL + 1]], GROTTO.height);
  strip(t, front.slice(iL + 1));
  strip(t, SEA.map((p, i) => station(p, i)), 0, [[0, Infinity, false]]);
  grottoTris(t);
  SLABS.forEach((s) => slabTris(t, s));
  return t;
})();
