// The Margin (issue #77, west-margin): the tide crack where the West Shelf's ice meets the ground, a slot with one snow
// bridge and five thin cracks. Pure geometry; components/world/land/Crevasse.jsx draws TRIS as one mesh. The 13 circles
// make the slot a funnel: a seal is steered to the bridge or round the west end.

import { heightAt } from "./terrain.js";

export const BARRIER = [[-91, -48.6], [-87, -50.6], [-82.5, -51.8], [-78, -51.9], [-74.5, -51], [-72.5, -49.4]];
export const BRIDGE = { x: -81.2, z: -51.7, dir: [0.9999, -0.0222], len: 3.6, width: 1.6, sag: 0.04 };
export const CRACKS = [
  { pts: [[-90, -45.6], [-86, -47.2], [-81.5, -47.8], [-77, -47.3]], half: 0.22 },
  { pts: [[-88.5, -52.8], [-84, -54.2], [-79.5, -54.6], [-75.5, -53.9]], half: 0.18 },
  { pts: [[-86, -55.6], [-82, -56.3], [-78, -56.4]], half: 0.28 },
  { pts: [[-76.5, -48.6], [-74, -47.2], [-72.6, -45.4]], half: 0.2 },
  { pts: [[-92.5, -51.5], [-90.5, -53.2], [-89.5, -55]], half: 0.18 },
];
const CIRCLES = [[-91, -48.6], [-89.8, -49.2], [-88.7, -49.8], [-87.5, -50.3], [-86.3, -50.8], [-85, -51.1], [-83.8, -51.5], [-78.6, -51.9], [-77.4, -51.7], [-76.1, -51.4], [-74.8, -51.1], [-73.8, -50.4], [-72.7, -49.6]];
export const COLLIDERS = CIRCLES.map(([x, z]) => ({ x, z, radius: 0.75, land: "crevasse" }));

const LIP = "#f5f9fd", WALL = "#5aa9dc", CORE = "#12407a", SNOW = "#eef2f8";
const LINE = 0.06;
const hash = (n) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};
const vtx = (x, z, lift, hex) => [x, Math.max(heightAt(x, z), 0) + lift, z, hex];

// Uniform Catmull-Rom through the control points, `steps` intervals, ends held.
export function sampleCurve(ctrl, steps) {
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const segs = ctrl.length - 1;
  return Array.from({ length: steps + 1 }, (_, k) => {
    const u = (k / steps) * segs;
    const i = Math.min(segs - 1, Math.floor(u));
    const t = u - i;
    const [p0, p1, p2, p3] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
    return [0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t * t * t));
  });
}

function slot(t) {
  const pts = sampleCurve(BARRIER, 30);
  const across = [-0.55, -0.3, 0, 0.3, 0.55];
  const hex = [LIP, WALL, CORE, WALL, LIP];
  const rows = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / len;
    const nz = (b[0] - a[0]) / len;
    return across.map((o, k) => vtx(p[0] + nx * o, p[1] + nz * o, LINE, hex[k]));
  });
  for (let i = 0; i < rows.length - 1; i++) {
    for (let k = 0; k < 4; k++) t.push([rows[i][k], rows[i + 1][k], rows[i + 1][k + 1]], [rows[i][k], rows[i + 1][k + 1], rows[i][k + 1]]);
  }
}

function bridge(t) {
  const { x, z, len, width, sag } = BRIDGE;
  const [dx, dz] = BRIDGE.dir;
  const at = (s, u) => {
    const px = x + dx * s * (len / 2) - dz * u * (width / 2);
    const pz = z + dz * s * (len / 2) + dx * u * (width / 2);
    return [px, Math.max(heightAt(px, pz), 0) + 0.11 - sag * (1 - s * s), pz, SNOW];
  };
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const s0 = -1 + (2 * i) / steps;
    const s1 = -1 + (2 * (i + 1)) / steps;
    const a = at(s0, -1);
    const b = at(s0, 1);
    const c = at(s1, 1);
    const d = at(s1, -1);
    t.push([a, d, c], [a, c, b]);
  }
}

function crack(t, { pts, half }, k) {
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
      const f = (i + j / SEG) / n;
      const w = Math.min(1, Math.sin(f * Math.PI) * 1.6);
      const zig = (hash(k * 13 + i * 7 + j * 2.3) - 0.5) * half * 1.4;
      const cx = ax + ((bx - ax) * j) / SEG + nx * zig;
      const cz = az + ((bz - az) * j) / SEG + nz * zig;
      const at = (o, hex) => vtx(cx + nx * o * half * w, cz + nz * o * half * w, LINE, hex);
      rows.push([at(-1, WALL), at(0, CORE), at(1, WALL)]);
    }
  }
  for (let i = 0; i < rows.length - 1; i++) {
    const [l0, m0, r0] = rows[i];
    const [l1, m1, r1] = rows[i + 1];
    t.push([l0, l1, m1], [l0, m1, m0], [m0, m1, r1], [m0, r1, r0]);
  }
}

// One triangle list: each vertex is [x, y, z, hex]. Every vertex is a ground decal (heightAt plus a small lift).
export const TRIS = (() => {
  const t = [];
  slot(t);
  bridge(t);
  CRACKS.forEach((c, k) => crack(t, c, k));
  return t;
})();

export const GROUND_VERTS = TRIS.flat().map((v) => [v[0], v[1], v[2]]);
