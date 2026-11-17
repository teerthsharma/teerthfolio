// The West Shelf (issue #77, west-margin): Triton's western ice spilled round the back of Mount MujoRush and ending in
// a blue cliff on the north-west apron. Pure geometry: TRIS is the whole shelf as hex-coloured triangles, and the block
// sites; components/world/land/Shelf.jsx draws them. The shelf lies past the walkable rim, so it has no collider.

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

// Points along a polyline no further apart than `step`; every corner is kept.
export function resample(pts, step = 2.5) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export const FRONT = resample(FOOT);
export const SEA = resample(SEAWARD);

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

export const GROTTO = { x: -80, z: footFrame(-80).z, width: 3.2, height: 2.6 };

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

// The shelf top before jitter: 6.5 m along the front to x = -80, rising to 11 m at the massif's corner, back to 6.5 m
// within 10 m of the foot.
export function shelfTop(x, z) {
  return 6.5 + 4.5 * clamp01((x + 80) / 10) * clamp01(1 - distToFoot(x, z) / 10);
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

const SLAB_TOP = "#f0f2f7", ICE = "#dbeaf5", GAP = "#2b5a72", DUST = "#8fc3e0";
// The face ramp by row, foot to lip: #62abd9, #9fcfeb, #dbeaf5, sampled at the four rows.
const ROW_HEX = (() => {
  const a = new Color("#62abd9"), b = new Color("#9fcfeb"), c = new Color("#dbeaf5");
  return [0, 1, 2, 3].map((j) => {
    const f = j / 3;
    return `#${(f < 0.5 ? a.clone().lerp(b, 2 * f) : b.clone().lerp(c, 2 * f - 1)).getHexString()}`;
  });
})();

const quad = (t, a, b, c, d) => t.push([a, b, c], [a, c, d]);

// The top: the outline (foot, inland, seaward) triangulated, each triangle split once so the top follows the ground.
function topTris(t) {
  const pts = [
    ...FRONT.map(([x, z], i) => ({ x, z, y: topY(x, z, jitter(i)) })),
    ...resample(INLAND).slice(1).map(([x, z]) => ({ x, z, y: topY(x, z) })),
    ...SEA.map(([x, z], i) => ({ x, z, y: topY(x, z, jitter(i)) })).slice(1).reverse(),
  ];
  const faces = ShapeUtils.triangulateShape(pts.map((p) => new Vector2(p.x, p.z)), []);
  const mids = new Map();
  const midOf = (a, b) => {
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (!mids.has(key)) {
      const p = pts[a], q = pts[b];
      const x = (p.x + q.x) / 2, z = (p.z + q.z) / 2;
      pts.push({ x, z, y: Math.max((p.y + q.y) / 2, heightAt(x, z) + 0.8) });
      mids.set(key, pts.length - 1);
    }
    return mids.get(key);
  };
  for (const [a, b, c] of faces) {
    const ab = midOf(a, b), bc = midOf(b, c), ca = midOf(c, a);
    for (const tri of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]) t.push(tri.map((v) => [pts[v].x, pts[v].y, pts[v].z, SLAB_TOP]));
  }
}

// The cliff face: one strip per station, three rows high, each row on the ramp.
function faceTris(t, stations) {
  const rows = stations.map(([x, z], i) => {
    const base = Math.max(heightAt(x, z), -0.8);
    const top = topY(x, z, jitter(i));
    return ROW_HEX.map((hex, j) => [x, base + ((top - base) * j) / 3, z, hex]);
  });
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < 3; j++) quad(t, rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
  }
}

// Two dust bands on the cliff, at 2.1 to 2.4 m and 4.6 to 4.8 m, lifted 3 cm off the face.
function dustTris(t) {
  for (const [lo, hi] of [[2.1, 2.4], [4.6, 4.8]]) {
    const span = FRONT.map(([x, z], i) => {
      const base = Math.max(heightAt(x, z), -0.8);
      const y0 = Math.max(lo, base + 0.01);
      const y1 = Math.min(hi, topY(x, z, jitter(i)) - 0.01);
      return y1 > y0 ? { x, z, y0, y1 } : null;
    });
    for (let i = 0; i < FRONT.length - 1; i++) {
      const a = span[i], b = span[i + 1];
      if (!a || !b) continue;
      const f = footFrame((a.x + b.x) / 2);
      const o = (p, y) => [p.x + f.nx * 0.03, y, p.z + f.nz * 0.03, DUST];
      quad(t, o(a, a.y0), o(b, b.y0), o(b, b.y1), o(a, a.y1));
    }
  }
}

// A leaning slab 0.6 m out from the face (2.4 m wide, 0.7 m thick, 4.5 m high), with the dark gap behind it.
function slabTris(t, { x: sx, lean }) {
  const f = footFrame(sx);
  const T = new Vector3(f.tx, 0, f.tz);
  const N = new Vector3(f.nx, 0, f.nz);
  const UP = new Vector3(0, 1, 0);
  const a = (lean * Math.PI) / 180;
  const D = UP.clone().multiplyScalar(Math.cos(a)).addScaledVector(N, Math.sin(a));
  const P = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(UP, -Math.sin(a));
  const B = new Vector3(sx, 0, f.z).addScaledVector(N, 0.95);
  B.y = Math.max(heightAt(B.x, B.z), -0.8);
  const H = 4.5, HW = 1.2, HT = 0.35;
  const c = (s1, s2, s3, hex) => {
    const p = B.clone().addScaledVector(T, s1 * HW).addScaledVector(P, s2 * HT).addScaledVector(D, s3 * H);
    return [p.x, p.y, p.z, hex];
  };
  quad(t, c(-1, -1, 1, SLAB_TOP), c(1, -1, 1, SLAB_TOP), c(1, 1, 1, SLAB_TOP), c(-1, 1, 1, SLAB_TOP));
  for (const s of [-1, 1]) {
    quad(t, c(s, -1, 0, ICE), c(s, 1, 0, ICE), c(s, 1, 1, ICE), c(s, -1, 1, ICE));
    quad(t, c(-1, s, 0, ICE), c(1, s, 0, ICE), c(1, s, 1, ICE), c(-1, s, 1, ICE));
  }
  const g = (s1, s3) => {
    const q = new Vector3(sx, 0, f.z).addScaledVector(T, s1 * HW).addScaledVector(N, 0.3);
    q.y = Math.max(heightAt(q.x, q.z), -0.8) + s3 * H * 0.9;
    return [q.x, q.y, q.z, GAP];
  };
  quad(t, g(-1, 0), g(1, 0), g(1, 1), g(-1, 1));
}

// The whole shelf (no grotto: that is a lit panel in Shelf.jsx). Hex colours; each triangle is three [x, y, z, hex].
export const TRIS = (() => {
  const t = [];
  topTris(t);
  faceTris(t, FRONT);
  faceTris(t, SEA);
  dustTris(t);
  SLABS.forEach((s) => slabTris(t, s));
  return t;
})();
