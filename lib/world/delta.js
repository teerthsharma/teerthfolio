// The Old Delta (issue #77, the south quarter): frost-cracked polygons on the dead river's outwash fan, a moraine arc of
// boulders with one 9 m breach, and a whale skeleton. Pure data: components/world/land/Delta.jsx builds the meshes.

import { regionWeights } from "./regions.js";
import { heightAt } from "./terrain.js";

const SITE = { x: 2, z: 92 };
const HEX = 2;
const CRACK_HALF = 0.09;
export const DISC_R = 0.22;
const ARC = { x: 1, z: 66, r: 21 };
const SPANS = [[46, 78], [102, 122]]; // degrees, 0 east, 90 south: the arc, and the 9 m breach between 78 and 102
export const ACROSS = [0.6, -0.8]; // north-east, across the wind: the arches' span and the vertebrae's offset
export const SKULL = { x: 4, z: 92, dir: [0.8, 0.6], len: 2.6, wide: 0.9, high: 0.7 };
const WHALE = { x: 5.6, z: 93.2, dir: [0.8, 0.6] };

const hash = (i, j, k) => {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const key = (x, z) => `${Math.round(x * 100)},${Math.round(z * 100)}`;
const jitter = ([x, z]) => {
  const i = Math.round(x * 100);
  const j = Math.round(z * 100);
  const r = 0.9 * Math.sqrt(hash(i, j, 1));
  const t = 2 * Math.PI * hash(i, j, 2);
  return [x + r * Math.cos(t), z + r * Math.sin(t)];
};

function honeycomb() {
  const edges = new Map();
  const s3 = Math.sqrt(3) * HEX;
  for (let i = -9; i <= 9; i++) {
    for (let j = -6; j <= 6; j++) {
      const cx = SITE.x + 1.5 * HEX * i;
      const cz = SITE.z + s3 * (j + 0.5 * (i & 1));
      const v = Array.from({ length: 6 }, (_, k) => [cx + HEX * Math.cos((k * Math.PI) / 3), cz + HEX * Math.sin((k * Math.PI) / 3)]);
      for (let k = 0; k < 6; k++) {
        const a = v[k];
        const b = v[(k + 1) % 6];
        const ka = key(a[0], a[1]);
        const kb = key(b[0], b[1]);
        const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        if (!edges.has(id)) edges.set(id, [a, b]);
      }
    }
  }
  return edges.values();
}

const W = {};
export const CRACKS = [];
for (const [a0, b0] of honeycomb()) {
  const a = jitter(a0);
  const b = jitter(b0);
  regionWeights((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, W);
  if (W.delta < 0.3) continue;
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  CRACKS.push(Array.from({ length: n + 1 }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]));
}

export function strip(pl, half = CRACK_HALF) {
  const out = [];
  for (let i = 0; i < pl.length; i++) {
    const p = pl[Math.max(0, i - 1)];
    const q = pl[Math.min(pl.length - 1, i + 1)];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const tx = (q[0] - p[0]) / l;
    const tz = (q[1] - p[1]) / l;
    const [x, z] = pl[i];
    out.push([x - tz * half, z + tx * half], [x + tz * half, z - tx * half]);
  }
  return out;
}

export function ring(x, z, r, n) {
  return Array.from({ length: n }, (_, k) => [x + r * Math.cos((2 * Math.PI * k) / n), z + r * Math.sin((2 * Math.PI * k) / n)]);
}

const ARC_LEN = SPANS.map(([a, b]) => (ARC.r * (b - a) * Math.PI) / 180);
const TOTAL = ARC_LEN.reduce((s, l) => s + l, 0);
function arcAngle(s) {
  for (let k = 0; k < SPANS.length; k++) {
    if (s <= ARC_LEN[k]) return (SPANS[k][0] * Math.PI) / 180 + s / ARC.r;
    s -= ARC_LEN[k];
  }
  return (SPANS.at(-1)[1] * Math.PI) / 180;
}

const BIG = [
  { x: 14.5, z: 82.1, r: 1.2, collider: true },
  { x: 10.9, z: 84.5, r: 1.3, collider: true },
  { x: -4.8, z: 86.2, r: 1.1, collider: true },
  { x: -8.9, z: 84.5, r: 1.05, collider: true },
  { x: 6.8, z: 86.2, r: 1.25, collider: false },
].map((b, i) => ({ ...b, dark: i % 2 === 1, cap: true }));

const clear = (x, z, r, list) => list.every((o) => Math.hypot(x - o.x, z - o.z) >= o.r + r + 0.15);
const SMALL = [];
for (let i = 0; i < 14; i++) {
  const r = 0.25 + 0.25 * hash(i, 7, 1);
  const rad = ARC.r + (hash(i, 6, 1) - 0.5) * 1.2;
  const s0 = ((i + 0.5) / 14) * TOTAL;
  let placed = false;
  for (let step = 0; step <= 12 && !placed; step++) {
    for (const sign of [1, -1]) {
      const s = s0 + sign * step * 0.4;
      if (step === 0 && sign === -1) continue;
      if (s < 0 || s > TOTAL) continue;
      for (const dr of [0, 0.9, -0.9]) {
        const th = arcAngle(s);
        const x = ARC.x + (rad + dr) * Math.cos(th);
        const z = ARC.z + (rad + dr) * Math.sin(th);
        if (!placed && clear(x, z, r, [...BIG, ...SMALL])) {
          SMALL.push({ x, z, r, dark: i % 2 === 1, cap: false });
          placed = true;
        }
      }
      if (placed) break;
    }
  }
}

export const STONES = [...BIG, ...SMALL];

export const RIBS = Array.from({ length: 8 }, (_, k) => ({ x: WHALE.x + k * WHALE.dir[0], z: WHALE.z + k * WHALE.dir[1], s: 1 - (0.35 * k) / 7 }));

export const VERTEBRAE = Array.from({ length: 9 }, (_, i) => {
  const k = 0.875 * i;
  return { x: WHALE.x + k * WHALE.dir[0] + 1.6 * ACROSS[0], z: WHALE.z + k * WHALE.dir[1] + 1.6 * ACROSS[1] };
});

export const COLLIDERS = [
  ...BIG.filter((b) => b.collider).map(({ x, z }) => ({ x, z, radius: 0.9, land: "delta" })),
  { x: SKULL.x, z: SKULL.z, radius: 1, land: "delta" },
];

const drape = (x, z, lift) => [x, heightAt(x, z) + lift, z];
export const GROUND_VERTS = [
  ...CRACKS.flatMap((pl) => strip(pl).map(([x, z]) => drape(x, z, 0.06))),
  ...VERTEBRAE.flatMap(({ x, z }) => [drape(x, z, 0.04), ...ring(x, z, DISC_R, 10).map(([a, b]) => drape(a, b, 0.04))]),
];
