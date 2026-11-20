// The 8-leg route library (PREREGISTRATION.md section 6.1) and the leg walker that the bake and the walks share.
// The walker copies the loop of experiments/topo-field/path.mjs (accel, approach slow-down, 60 Hz).
import { PLACES, PLACE_BY_ID, SPAWN, SPAWN_PLAY, dockPoint } from "../../lib/world/places.js";
import { CRITICAL_S, SPAWN_CRITICAL_S, deadlineS } from "../../lib/world/cutscene/deadline.js";
import { MOTION } from "../../lib/world/motion.js";
import { makePath } from "../topo-field/path.mjs";

const DT = 1 / 60;
const CLAMP_R = 83;
const KTOUR = 1 - Math.exp(-MOTION.accel * DT);

export const L8_TABLE = [
  { name: "spawn -> home", length: 11.2, deadlineS: 0.327 },
  { name: "spawn -> p-caustic", length: 31.5, deadlineS: 1.278 },
  { name: "spawn -> pr-tensorflow-124410", length: 28.7, deadlineS: 1.489 },
  { name: "spawn -> p-resolvent", length: 33.7, deadlineS: 1.517 },
  { name: "home -> pr-openxla-46539", length: 21.0, deadlineS: 0.932 },
  { name: "p-caustic -> pr-nemo-relay-481", length: 18.6, deadlineS: 0.795 },
  { name: "pr-tensorflow-124410 -> pr-openxla-46539", length: 16.0, deadlineS: 0.383 },
  { name: "p-resolvent -> pr-highway-3244", length: 21.5, deadlineS: 1.005 },
];

const STATUE = PLACE_BY_ID[SPAWN_PLAY];

function clampPoint(d) {
  const r = Math.hypot(d.x, d.z);
  const k = r > CLAMP_R ? CLAMP_R / r : 1;
  return { x: d.x * k, z: d.z * k };
}

function dockAt(place) {
  return clampPoint(dockPoint(place));
}

const criticalS = (place) => (place.id === SPAWN_PLAY ? SPAWN_CRITICAL_S : CRITICAL_S);

export function criticalPlaces() {
  return [...PLACES, STATUE].filter((p) => deadlineS(SPAWN, p) < criticalS(p));
}

export function criticalIds() {
  return criticalPlaces().map((p) => p.id);
}

function ordinaryCritical() {
  return criticalPlaces().filter((p) => p.id !== SPAWN_PLAY).sort((a, b) => deadlineS(SPAWN, a) - deadlineS(SPAWN, b));
}

function edfRankOne(from, candidates) {
  const seal = dockAt(from);
  let best = null;
  let bestS = Infinity;
  for (const c of candidates) {
    const s = deadlineS({ x: seal.x, z: seal.z }, c);
    if (s < bestS) {
      bestS = s;
      best = c;
    }
  }
  return best;
}

function leg(fromName, fromPoint, toPlace) {
  const end = dockAt(toPlace);
  const length = Math.hypot(end.x - fromPoint.x, end.z - fromPoint.z);
  return { name: `${fromName} -> ${toPlace.id}`, start: fromPoint, end, length, from: fromName, to: toPlace.id };
}

export function buildL8() {
  const critical = criticalPlaces();
  const outside = PLACES.filter((p) => !critical.includes(p));
  const docks = ordinaryCritical();
  const legs = docks.map((d) => leg("spawn", { x: SPAWN.x, z: SPAWN.z }, d));
  for (const d of docks) {
    const from = dockAt(d);
    const next = edfRankOne(d, outside);
    legs.push(leg(d.id, from, next));
  }
  return legs;
}

export function tourLegs() {
  const docks = PLACES.map((p) => ({ place: p, point: dockAt(p) }));
  const visited = new Set();
  const legs = [];
  let cur = { x: SPAWN.x, z: SPAWN.z };
  let fromName = "spawn";
  for (let s = 0; s < docks.length; s++) {
    let best = null;
    let bestD = Infinity;
    for (const d of docks) {
      if (visited.has(d.place.id)) continue;
      const dd = Math.hypot(d.point.x - cur.x, d.point.z - cur.z);
      if (dd < bestD) {
        bestD = dd;
        best = d;
      }
    }
    visited.add(best.place.id);
    legs.push({ name: `${fromName} -> ${best.place.id}`, start: cur, end: best.point, length: bestD, from: fromName, to: best.place.id });
    cur = best.point;
    fromName = best.place.id;
  }
  return legs;
}

export function pairDocks() {
  return PLACES.map((p) => ({ id: p.id, ...dockAt(p) }));
}

function slowdown(x, z) {
  let near = 1;
  for (const p of PLACES) {
    const gap = Math.hypot(x - p.x, z - p.z) - p.radius;
    if (gap < MOTION.approach) near = Math.min(near, MOTION.approachSpeed + ((1 - MOTION.approachSpeed) * Math.max(0, gap)) / MOTION.approach);
  }
  return near;
}

export function walkLeg(start, end) {
  const xs = [start.x];
  const zs = [start.z];
  let x = start.x;
  let z = start.z;
  let v = 0;
  for (let f = 0; ; f++) {
    const dx = end.x - x;
    const dz = end.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.5) break;
    if (f > 20000) throw new Error(`leg to ${end.x},${end.z} longer than 20000 frames`);
    const vt = MOTION.maxSpeed * MOTION.boost * slowdown(x, z);
    v += (vt - v) * KTOUR;
    const s = Math.min(v * DT, dist);
    x += (dx / dist) * s;
    z += (dz / dist) * s;
    xs.push(x);
    zs.push(z);
  }
  return { x: Float64Array.from(xs), z: Float64Array.from(zs) };
}

export function ticksOf(walk) {
  const n = Math.ceil(walk.x.length / 6);
  const x = new Float64Array(n);
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = walk.x[6 * i];
    z[i] = walk.z[6 * i];
  }
  return { x, z };
}

export function tourWalk() {
  const p = makePath(1);
  return { x: p.x.slice(0, p.tourFrames), z: p.z.slice(0, p.tourFrames) };
}

export function roamWalk(seed) {
  const p = makePath(seed);
  return { x: p.x.slice(p.tourFrames - 1), z: p.z.slice(p.tourFrames - 1) };
}
