// The oasis lake (east shore): the frozen lid's data and its seal's hole; components/world/land/MeltLake.jsx draws it.
import { heightAt } from "./terrain.js";

export const LAKE = { x: 90, z: -4, a: 9.5, b: 8, rot: 0.3 };
export const HOLE = { x: 93, z: -6, r: 0.7 };

function lakeD(x, z) {
  const dx = x - LAKE.x, dz = z - LAKE.z, c = Math.cos(LAKE.rot), s = Math.sin(LAKE.rot);
  return Math.hypot((c * dx + s * dz) / LAKE.a, (c * dz - s * dx) / LAKE.b);
}

function subdivide(pts, step = 1) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}
export const CHANNEL = subdivide([[80.6, -4.5], [74, -6.2], [68.5, -5.2]]);

const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const STARS = [[86, -5], [89, -2], [93, -3]];
const inLid = (pts) => { const k = pts.findIndex(([x, z]) => lakeD(x, z) > 0.92); return k < 0 ? pts : pts.slice(0, Math.max(2, k)); };
export const CRACKS = STARS.flatMap(([cx, cz], s) => [0, 1, 2].map((k) => {
  const i = s * 3 + k;
  const th = (k / 3) * 2 * Math.PI + (hash(i) - 0.5) * 0.8;
  const len = 3.7 + 2.5 * hash(i, 1);
  const bow = (0.3 + 0.3 * hash(i, 2)) * (hash(i, 3) < 0.5 ? 1 : -1);
  const dx = Math.cos(th), dz = Math.sin(th);
  const pts = Array.from({ length: 5 }, (_, j) => {
    const t = j / 4, o = bow * Math.sin(2 * Math.PI * t);
    return [cx + dx * len * t - dz * o, cz + dz * len * t + dx * o];
  });
  return inLid(subdivide(pts));
}));

export const COLLIDERS = [{ x: HOLE.x, z: HOLE.z, radius: 0.8, land: "meltlake" }];

// Decals sit on the ground: the lid's dips (about -0.09 m) are far above the water (WATER_Y -0.35), so no max(height, 0) here.
const lift = ([x, z], l) => [x, heightAt(x, z) + l, z];
export const GROUND_VERTS = [...CHANNEL.map((p) => lift(p, 0.04)), ...CRACKS.flat().map((p) => lift(p, 0.06))];
