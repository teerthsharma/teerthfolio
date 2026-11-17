// The Rookery: an Adelie colony on the bare ground the south-west headland sheds its snow from first.
// Nests, birds and chicks stand on heightAt; the toboggan groove and the guano fans are ground decals.
import { heightAt } from "./terrain.js";

export const SITE = { x: -62, z: 85, radius: 8 };
export const GROOVE = [[-47, 73], [-51.5, 76.5], [-55.5, 80], [-58.5, 83]];
export const BASE_BIRDS = 44;
export const BASE_CHICKS = 8;
export const GROOVE_BIRDS = 5;
export const STRETCH = 6;

const CLUSTERS = [[-66.5, 79.5, 4], [-60.5, 81.5, 4], [-57, 86, 4], [-62, 89, 3], [-67.5, 87.5, 3]];
const STRAYS = [[-69, 85], [-58.5, 91], [-55.5, 87.5], [-63, 77.5]];

export const COLLIDERS = CLUSTERS.map(([x, z]) => ({ x, z, radius: 1.2, land: "rookery" }));

const hash = (i, k) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const NESTS = [];
CLUSTERS.forEach(([cx, cz, n], ci) => {
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n + hash(ci, k) * 0.6;
    NESTS.push({ x: cx + 0.75 * Math.cos(a), z: cz + 0.75 * Math.sin(a), owner: ci });
  }
});
for (const [x, z] of STRAYS) NESTS.push({ x, z, owner: -1 });
export { NESTS };

function alongGroove(s, side) {
  let left = s;
  for (let i = 0; i + 1 < GROOVE.length; i++) {
    const [ax, az] = GROOVE[i];
    const [bx, bz] = GROOVE[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (left <= len) {
      const t = left / len;
      const dx = (bx - ax) / len;
      const dz = (bz - az) / len;
      return { x: ax + (bx - ax) * t - dz * side, z: az + (bz - az) * t + dx * side };
    }
    left -= len;
  }
  const [lx, lz] = GROOVE[GROOVE.length - 1];
  return { x: lx, z: lz };
}

// Groove birds first (they are the penguin arrow and show at every tier), then each nest's sitter and standing mate.
export const BIRDS = [];
for (let k = 0; k < GROOVE_BIRDS; k++) {
  const p = alongGroove(0.8 + 3.4 * k, k % 2 ? 1.6 : -1.6);
  BIRDS.push({ x: p.x, z: p.z, yaw: hash(k, 9) * 2 * Math.PI });
}
const clear = (x, z, owner) => COLLIDERS.every((c, j) => j === owner || Math.hypot(x - c.x, z - c.z) >= c.radius + 0.3);
NESTS.forEach((n, i) => {
  BIRDS.push({ x: n.x, z: n.z, yaw: hash(i, 3) * 2 * Math.PI });
  let mate = null;
  for (let k = 0; k < 8 && !(mate && clear(mate.x, mate.z, n.owner)); k++) {
    const a = hash(i, 4 + k) * 2 * Math.PI;
    const d = 0.5 + 0.4 * hash(i, 12 + k);
    mate = { x: n.x + d * Math.cos(a), z: n.z + d * Math.sin(a) };
  }
  BIRDS.push({ ...mate, yaw: hash(i, 31) * 2 * Math.PI });
});

export const CHICKS = NESTS.slice(0, BASE_CHICKS).map((n, i) => {
  const a = hash(i, 8) * 2 * Math.PI;
  return { x: n.x + 0.3 * Math.cos(a), z: n.z + 0.3 * Math.sin(a) };
});

const pos = [];
const index = [];
const tone = [];

function ribbon(pts, width, t) {
  const S = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
    for (let k = 0; k < n; k++) S.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  S.push(pts[pts.length - 1]);
  const base = pos.length / 3;
  S.forEach(([x, z], j) => {
    const [px, pz] = S[Math.min(j + 1, S.length - 1)];
    const [qx, qz] = S[Math.max(j - 1, 0)];
    const tx = px - qx;
    const tz = pz - qz;
    const L = Math.hypot(tx, tz) || 1;
    const nx = (-tz / L) * (width / 2);
    const nz = (tx / L) * (width / 2);
    for (const sg of [1, -1]) {
      const vx = x + sg * nx;
      const vz = z + sg * nz;
      pos.push(vx, Math.max(heightAt(vx, vz), 0) + 0.04, vz);
      tone.push(t);
    }
  });
  for (let j = 0; j + 1 < S.length; j++) {
    const a = base + 2 * j;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
}

ribbon(GROOVE, 0.7, 0);
for (let i = 0; i < NESTS.length; i++) {
  const n = NESTS[i];
  const a = hash(i, 32) * 2 * Math.PI;
  ribbon([[n.x + 0.5 * Math.cos(a), n.z + 0.5 * Math.sin(a)], [n.x + 1.6 * Math.cos(a), n.z + 1.6 * Math.sin(a)]], 0.4, 1);
}

export const DECAL = { pos, index, tone };
export const GROUND_VERTS = Array.from({ length: pos.length / 3 }, (_, i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]);
