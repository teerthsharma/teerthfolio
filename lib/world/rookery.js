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

// Groove birds first (they are the penguin arrow and show at every tier). Nest birds are dealt one at a time
// round the clusters, so a tier cut thins every cluster alike; strays come last.
export const BIRDS = [];
for (let k = 0; k < GROOVE_BIRDS; k++) {
  const p = alongGroove(0.8 + 3.4 * k, k % 2 ? 1.6 : -1.6);
  BIRDS.push({ x: p.x, z: p.z, yaw: hash(k, 9) * 2 * Math.PI });
}
const clear = (x, z, owner) => COLLIDERS.every((c, j) => j === owner || Math.hypot(x - c.x, z - c.z) >= c.radius + 0.3);
const BY_CLUSTER = CLUSTERS.map(() => []);
const STRAY_BIRDS = [];
NESTS.forEach((n, i) => {
  const list = n.owner < 0 ? STRAY_BIRDS : BY_CLUSTER[n.owner];
  list.push({ x: n.x, z: n.z, yaw: hash(i, 3) * 2 * Math.PI });
  let mate = null;
  for (let k = 0; k < 8 && !(mate && clear(mate.x, mate.z, n.owner)); k++) {
    const a = hash(i, 4 + k) * 2 * Math.PI;
    const d = 0.5 + 0.4 * hash(i, 12 + k);
    mate = { x: n.x + d * Math.cos(a), z: n.z + d * Math.sin(a) };
  }
  list.push({ ...mate, yaw: hash(i, 31) * 2 * Math.PI });
});
for (let r = 0; BY_CLUSTER.some((l) => r < l.length); r++) for (const l of BY_CLUSTER) if (r < l.length) BIRDS.push(l[r]);
BIRDS.push(...STRAY_BIRDS);

export const CHICKS = NESTS.slice(0, BASE_CHICKS).map((n, i) => {
  const a = hash(i, 8) * 2 * Math.PI;
  return { x: n.x + 0.3 * Math.cos(a), z: n.z + 0.3 * Math.sin(a) };
});

const pos = [];
const index = [];
const tone = [];
const fade = [];

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
      pos.push(vx, heightAt(vx, vz) + 0.04, vz);
      tone.push(t);
      fade.push(0);
    }
  });
  for (let j = 0; j + 1 < S.length; j++) {
    const a = base + 2 * j;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
}

const FAN = { from: 0.5, to: 1.6, half: 0.2 };

// A guano fan: a stadium from the nest's rim to a round tip, colour fading toward the snow along its length.
function fan(n, a) {
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  const { from, to, half } = FAN;
  const cap = to - half;
  const outline = [[from, -half], [from, half]];
  for (let k = 0; k <= 6; k++) {
    const th = Math.PI / 2 - (Math.PI * k) / 6;
    outline.push([cap + half * Math.cos(th), half * Math.sin(th)]);
  }
  const P = outline.map(([s, l]) => ({ x: n.x + s * dx - l * dz, z: n.z + s * dz + l * dx, f: (s - from) / (to - from) }));
  const base = pos.length / 3;
  for (const p of P) {
    pos.push(p.x, heightAt(p.x, p.z) + 0.04, p.z);
    tone.push(1);
    fade.push(p.f);
  }
  for (let k = 1; k + 1 < P.length; k++) {
    const u = [P[k].x - P[0].x, P[k].z - P[0].z];
    const v = [P[k + 1].x - P[0].x, P[k + 1].z - P[0].z];
    const up = u[1] * v[0] - u[0] * v[1] > 0;
    index.push(base, base + (up ? k : k + 1), base + (up ? k + 1 : k));
  }
}

ribbon(GROOVE, 0.7, 0);
for (let i = 0; i < NESTS.length; i++) fan(NESTS[i], hash(i, 32) * 2 * Math.PI);

export const DECAL = { pos, index, tone, fade };
export const GROUND_VERTS = Array.from({ length: pos.length / 3 }, (_, i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]);
