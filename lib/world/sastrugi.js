// The Sastrugi Plain: wind-carved snow ridges on the plain and the lee band, noses up the wind (-0.8, -0.6).
// The sast ellipses of the planned regions.js are replicated here (same rule, same fbm wobble) until it lands.
import { forbidden, mulberry32 } from "../../components/world/life/spawn.js";
import { fbm } from "./terrain.js";
import { COLLIDERS as HUT_COLLIDERS } from "./hut.js";
import { COLLIDERS as ROOKERY_COLLIDERS } from "./rookery.js";

export const BASE = 107;
export const COLLIDERS = [];

const TRIES = 200000;
const PLAIN = { x: -73, z: 66, a: 23, b: 12, rot: 0.6435, feather: 0.35, want: 85 };
const BAND = { x: -72, z: -16, a: 13, b: 5, rot: 0.6435, feather: 0.35, want: 22 };
const GUANO = { x: -62, z: 85, a: 9, b: 7.5, rot: -0.6, feather: 0.45 };
const NEAR = [...HUT_COLLIDERS, ...ROOKERY_COLLIDERS];
const NOSE = Math.atan2(0.6, -0.8);

const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

function weight(x, z, e) {
  const dx = x - e.x;
  const dz = z - e.z;
  const c = Math.cos(e.rot);
  const s = Math.sin(e.rot);
  const u = dx * c + dz * s;
  const v = dz * c - dx * s;
  const d = Math.hypot(u / e.a, v / e.b) + 0.22 * (fbm(x / 7, z / 7) - 0.5);
  return smooth((d - 1) / -e.feather);
}

const rand = mulberry32(77031);

function scatter(e) {
  const picked = [];
  const c = Math.cos(e.rot);
  const s = Math.sin(e.rot);
  for (let i = 0; i < TRIES && picked.length < e.want; i++) {
    const r = Math.sqrt(rand());
    const th = 2 * Math.PI * rand();
    const u = e.a * r * Math.cos(th);
    const v = e.b * r * Math.sin(th);
    if (picked.some((p) => Math.abs(p.u - u) < 3 && Math.abs(p.v - v) < 1.5)) continue;
    const x = e.x + u * c - v * s;
    const z = e.z + u * s + v * c;
    if (weight(x, z, e) <= 0.35 || weight(x, z, GUANO) >= 0.05) continue;
    if (NEAR.some((k) => Math.hypot(x - k.x, z - k.z) < k.radius + 3)) continue;
    if (forbidden(x, z, 0.5)) continue;
    picked.push({ u, v, x, z });
  }
  return picked;
}

export const RIDGES = [];
for (const e of [PLAIN, BAND]) {
  for (const p of scatter(e)) {
    RIDGES.push({
      x: p.x,
      z: p.z,
      len: 2.2 + 2.3 * rand(),
      h: 0.16 + 0.12 * rand(),
      w: 0.5 + 0.4 * rand(),
      yaw: NOSE + (rand() * 2 - 1) * 0.14,
    });
  }
}
