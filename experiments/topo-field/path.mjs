// Seal walk at 60 Hz: a nearest-neighbour tour of every place dock at boost speed, then a seeded roam.
import { MOTION } from "../../lib/world/motion.js";
import { PLACES, SPAWN, dockPoint } from "../../lib/world/places.js";
import { mulberry32 } from "./field.mjs";

const DT = 1 / 60;
const TWO_PI = 2 * Math.PI;
const CLAMP_R = 83;
const ROAM_R = 80;
const ROAM_TURN = 1.2;

function slowdown(x, z) {
  let near = 1;
  for (const p of PLACES) {
    const gap = Math.hypot(x - p.x, z - p.z) - p.radius;
    if (gap < MOTION.approach) near = Math.min(near, MOTION.approachSpeed + ((1 - MOTION.approachSpeed) * Math.max(0, gap)) / MOTION.approach);
  }
  return near;
}

const DOCKS = PLACES.map((p) => {
  const d = dockPoint(p);
  const r = Math.hypot(d.x, d.z);
  const clamped = r > CLAMP_R;
  const k = clamped ? CLAMP_R / r : 1;
  return { id: p.id, x: d.x * k, z: d.z * k, clamped };
});

function tourOrder() {
  const visited = new Uint8Array(DOCKS.length);
  const order = [];
  let cx = SPAWN.x;
  let cz = SPAWN.z;
  for (let s = 0; s < DOCKS.length; s++) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < DOCKS.length; i++) {
      if (visited[i]) continue;
      const d = Math.hypot(DOCKS[i].x - cx, DOCKS[i].z - cz);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    visited[best] = 1;
    order.push(best);
    cx = DOCKS[best].x;
    cz = DOCKS[best].z;
  }
  return order;
}

export function makePath(seed, { roamSeconds = 60 } = {}) {
  const xs = [SPAWN.x];
  const zs = [SPAWN.z];
  const vs = [0];
  let x = SPAWN.x;
  let z = SPAWN.z;
  let v = 0;
  const kTour = 1 - Math.exp(-MOTION.accel * DT);
  for (const di of tourOrder()) {
    const dock = DOCKS[di];
    let legFrames = 0;
    for (;;) {
      const dx = dock.x - x;
      const dz = dock.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.5) break;
      if (++legFrames > 20000) throw new Error(`leg to ${dock.id} longer than 20000 frames`);
      const vt = MOTION.maxSpeed * MOTION.boost * slowdown(x, z);
      v += (vt - v) * kTour;
      const s = Math.min(v * DT, dist);
      x += (dx / dist) * s;
      z += (dz / dist) * s;
      xs.push(x);
      zs.push(z);
      vs.push(v);
    }
  }
  const tourFrames = xs.length;

  const rng = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(TWO_PI * rng());
  let h = TWO_PI * rng();
  const kRoam = 1 - Math.exp(-MOTION.accel * DT);
  for (let f = 0; f <= roamSeconds * 60; f++) {
    h += ROAM_TURN * Math.sqrt(DT) * gauss();
    v += (MOTION.maxSpeed - v) * kRoam;
    x += Math.cos(h) * v * DT;
    z += Math.sin(h) * v * DT;
    const r = Math.hypot(x, z);
    if (r > ROAM_R) {
      h = Math.atan2(-z, -x);
      x *= ROAM_R / r;
      z *= ROAM_R / r;
    }
    xs.push(x);
    zs.push(z);
    vs.push(v);
  }

  return {
    x: Float64Array.from(xs),
    z: Float64Array.from(zs),
    v: Float64Array.from(vs),
    frames: xs.length,
    tourFrames,
    docks: DOCKS.map((d) => ({ ...d })),
  };
}
