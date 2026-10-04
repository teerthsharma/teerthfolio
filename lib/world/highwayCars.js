// The highway's cars. Every car lives in a bay of the car park under the three
// faces: it reverses out, joins the road, goes round the ring, drives the town
// leg to the turning circle and back, round the ring again, down the park leg,
// and noses back into its bay. Spawn and respawn are the same place (the bay),
// so a car never appears on the road. One continuous Catmull-Rom path per car;
// scripts/check-world.mjs drives it headless. Pure: no React.

import { CatmullRomCurve3, Vector3 } from "three";
import { HIGHWAY } from "./land.js";
import { heightAt } from "./terrain.js";

export const STEP = 0.25; // m between curve samples

export function legTable(points) {
  const curve = new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)), false, "centripetal");
  const len = curve.getLength();
  const n = Math.max(2, Math.ceil(len / STEP));
  const pts = curve.getSpacedPoints(n);
  const px = new Float32Array(n + 1);
  const pz = new Float32Array(n + 1);
  const tx = new Float32Array(n + 1);
  const tz = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    px[i] = pts[i].x;
    pz[i] = pts[i].z;
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    tx[i] = (b.x - a.x) / l;
    tz[i] = (b.z - a.z) / l;
  }
  return { px, pz, tx, tz, n, len, step: len / n };
}
export const LEGS = HIGHWAY.legs.map(legTable);

// The drawn asphalt's height (Highway.jsx): 2 cm over the highest snow bump
// under any of it (terrain.js stays within 0.3 m of flat where the seal walks),
// never under 3 cm. Laid lower, the bumps stand through it as strips of snow.
export const ROAD_Y = (() => {
  let top = 0.01;
  const H = HIGHWAY.width / 2;
  const at = (x, z) => { top = Math.max(top, heightAt(x, z)); };
  for (const t of LEGS) for (let i = 0; i <= t.n; i += 4) for (const o of [-H, 0, H]) at(t.px[i] - t.tz[i] * o, t.pz[i] + t.tx[i] * o);
  const r = HIGHWAY.roundabout;
  for (let a = 0; a < Math.PI * 2; a += 0.1) for (const o of [-r.width / 2, 0, r.width / 2]) at(r.x + Math.cos(a) * (r.radius + o), r.z + Math.sin(a) * (r.radius + o));
  const c = HIGHWAY.carPark;
  for (let x = c.x - c.w / 2; x <= c.x + c.w / 2; x += 0.5) for (let z = c.z - c.d / 2; z <= c.z + c.d / 2; z += 0.5) at(x, z);
  return Math.ceil((top + 0.02) * 100) / 100;
})();

// The point `d` metres along a leg, `off` metres to the right of its centre
// line (right-hand traffic: the forward carriageway is at +off), written
// into `out` with the heading (rotation.y) that faces along the leg.
export function along(tab, d, off, out) {
  const f = Math.max(0, Math.min(tab.n, d / tab.step));
  const i = Math.min(tab.n - 1, Math.floor(f));
  const u = f - i;
  const tx = tab.tx[i] + (tab.tx[i + 1] - tab.tx[i]) * u;
  const tz = tab.tz[i] + (tab.tz[i + 1] - tab.tz[i]) * u;
  out.x = tab.px[i] + (tab.px[i + 1] - tab.px[i]) * u - tz * off;
  out.z = tab.pz[i] + (tab.pz[i + 1] - tab.pz[i]) * u + tx * off;
  out.heading = Math.atan2(tx, tz);
  return out;
}

// Is (x, z) on the asphalt Highway.jsx actually draws? onHighway (land.js) is
// the walkable footprint: its legs are capsules that run past a leg's cut end.
// This is the mesh itself: each leg's ribbon with its square-cut ends, the
// turning circle, ring, and the car park's rounded rectangle.
export function onDrawnAsphalt(x, z) {
  const half = HIGHWAY.width / 2;
  for (const t of LEGS) {
    let best = 1e9;
    let bi = 0;
    for (let i = 0; i <= t.n; i++) {
      const d = Math.hypot(x - t.px[i], z - t.pz[i]);
      if (d < best) { best = d; bi = i; }
    }
    if (best >= half) continue;
    const along = (x - t.px[bi]) * t.tx[bi] + (z - t.pz[bi]) * t.tz[bi];
    if ((bi === 0 && along < 0) || (bi === t.n && along > 0)) continue;
    return true;
  }
  const [sx, sz] = HIGHWAY.legs[0][0]; // the town end's turning circle
  if (Math.hypot(x - sx, z - sz) < half) return true;
  const r = HIGHWAY.roundabout;
  if (Math.abs(Math.hypot(x - r.x, z - r.z) - r.radius) < r.width / 2) return true;
  const c = HIGHWAY.carPark;
  const dx = Math.abs(x - c.x) - (c.w / 2 - 1.2);
  const dz = Math.abs(z - c.z) - (c.d / 2 - 1.2);
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) <= 1.2;
}

// ---- the car park --------------------------------------------------------------------------
const C = HIGHWAY.carPark;
export const BAY_Z = C.z - C.d / 2 + 1.5; // a parked car's centre, nose toward the faces (-z)
const AISLE_Z = BAY_Z + 2.3; // where a car has backed out to
// Bay lines run every 1.9 m from the park's west edge + 0.5; a bay is the gap.
const bayX = (m) => C.x - C.w / 2 + 0.5 + 1.9 * m + 0.95;
export const STATIC_BAYS = [1, 3, 6].map(bayX); // the three that stay parked
export const CAR_BAYS = [0, 2, 4, 5].map(bayX); // the four that drive

const CAR_SPEED = 5.5; // m/s
const LANE = 1.4; // m off the leg's centre line
const R = HIGHWAY.roundabout;
const ENTRY = -Math.PI / 2; // the ring angle (x = cos, z = sin) where the park leg joins
const END1 = HIGHWAY.legs[0][HIGHWAY.legs[0].length - 1];
const TOWN = Math.atan2(END1[1] - R.z, END1[0] - R.x); // where the town leg joins
const [LEG1, LEG2] = LEGS;
const BACK = 2.3; // m of reversing out of the bay

function pathFor(k) {
  const bx = CAR_BAYS[k];
  const lane = LANE + (k % 2) * 0.7;
  const rr = R.radius + (k % 2 ? 0.8 : -0.8);
  const pts = [];
  const P = {};
  const add = (x, z) => pts.push(new Vector3(x, 0, z));
  const addLeg = (tab, d, off) => (along(tab, d, off, P), add(P.x, P.z));
  const addRing = (a) => add(R.x + Math.cos(a) * rr, R.z + Math.sin(a) * rr);
  const wrapTo = (a, ref) => a + Math.round((ref - a) / (Math.PI * 2)) * Math.PI * 2;
  const ring = (from, to) => {
    for (let a = from; a > to; a -= 0.3) addRing(a);
    addRing(to);
  };

  add(bx, AISLE_Z);
  // aisle to the park leg's mouth, then up it on the ring-bound side (right of travel)
  along(LEG2, LEG2.len - 0.5, -lane, P);
  add(bx + Math.sign(P.x - bx) * 1.2, AISLE_Z + 0.5);
  for (let d = LEG2.len - 0.5; d > 3; d -= 3) addLeg(LEG2, d, -lane);
  // circulating (angle decreasing): in after the park leg, out just before the town leg
  const exit1 = wrapTo(TOWN + 0.35, ENTRY - Math.PI * 2);
  ring(ENTRY - 0.45, exit1);
  for (let d = LEG1.len - 3; d > 2; d -= 3) addLeg(LEG1, d, -lane);
  // the town end's turning circle
  along(LEG1, 0, 0, P);
  add(P.x - Math.sin(P.heading) * 1.4, P.z - Math.cos(P.heading) * 1.4);
  for (let d = 2; d < LEG1.len - 3; d += 3) addLeg(LEG1, d, lane);
  const in2 = exit1 - 0.7;
  ring(in2, wrapTo(ENTRY + 0.35, in2) - (wrapTo(ENTRY + 0.35, in2) > in2 ? Math.PI * 2 : 0));
  for (let d = 3; d < LEG2.len - 0.5; d += 3) addLeg(LEG2, d, lane);
  addLeg(LEG2, LEG2.len - 0.5, lane);
  along(LEG2, LEG2.len - 0.5, lane, P);
  add(bx + Math.sign(P.x - bx) * 1.5, AISLE_Z - 0.3);
  add(bx, AISLE_Z - 0.4);
  add(bx, BAY_Z);
  const curve = new CatmullRomCurve3(pts, false, "centripetal");
  curve.arcLengthDivisions = 4000;
  return { curve, len: curve.getLength() };
}
const PATHS = CAR_BAYS.map((_, k) => pathFor(k));

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// phase: park (dwell s) -> reverse -> drive -> park. s is metres along the
// current phase; v the speed. blocked: the seal is in front, so it brakes.
// A car is also a motion.js prop (kind "car", carried: the seal is pushed out
// of it, it is never shoved), so a seal that walks into one gets the soft
// bump every prop gives and never overlaps it.
export const CAR_R = 0.65; // half the car's length: its collision circle
const carProp = (x, z) => ({ kind: "car", carried: true, x, z, vx: 0, vz: 0, radius: CAR_R, mass: 1000, spin: 0, hit: 0 });
export const createParked = (x) => ({ ...carProp(x, BAY_Z), h: Math.PI });
export function createCar(k) {
  return { ...carProp(CAR_BAYS[k], BAY_Z), k, phase: "park", s: 0, v: 0, dwell: 1 + k * 3.2, h: Math.PI };
}

// A seal is in a car's way when it stands within SEAL_CLEAR of the road the car
// is about to cover (the next LOOK metres of its path, bay and reversing out
// included): it brakes to stop LOOK + SEAL_CLEAR - ~0.6 m short of the seal's
// centre, about two metres of clear road, and waits.
const LOOK = 2;
const SEAL_CLEAR = 0.9 + CAR_R + 0.2;
function inWay(car, seal, clear) {
  const path = PATHS[car.k];
  const bx = CAR_BAYS[car.k];
  const s0 = car.phase === "drive" ? car.s : car.phase === "reverse" ? car.s : 0;
  for (let d = 0; d <= LOOK; d += 0.5) {
    let x;
    let z;
    if (car.phase === "drive") {
      const p = path.curve.getPointAt(Math.min(1, (s0 + d) / path.len));
      x = p.x;
      z = p.z;
    } else if (s0 + d <= BACK) {
      x = bx;
      z = BAY_Z + s0 + d;
    } else {
      const p = path.curve.getPointAt(Math.min(1, (s0 + d - BACK) / path.len));
      x = p.x;
      z = p.z;
    }
    if (Math.hypot(seal.x - x, seal.z - z) < clear) return true;
  }
  return false;
}

// One step of every car, waiting for the seal in its way, for a car ahead of it
// that is waiting too (so a queue never stacks), and, where paths merge, for
// a lower-numbered car in its way (a fixed priority, so none can deadlock).
export function stepCars(cars, seal, dt) {
  for (const c of cars) {
    let wait = inWay(c, seal, SEAL_CLEAR);
    for (const o of cars) {
      if (wait || o === c || o.phase === "park" || (o.k > c.k && (o.v > 3 || (o.x - c.x) * Math.sin(c.h) + (o.z - c.z) * Math.cos(c.h) <= 0))) continue;
      wait = inWay(c, o, CAR_R * 2 + 0.4);
    }
    stepCar(c, dt, wait);
  }
}

export function stepCar(car, dt, blocked = false) {
  const px = car.x;
  const pz = car.z;
  const path = PATHS[car.k];
  const bx = CAR_BAYS[car.k];
  let target = Math.PI;
  if (car.phase === "park") {
    car.dwell -= dt;
    if (car.dwell <= 0 && !blocked) { car.phase = "reverse"; car.s = 0; car.v = 0; }
  } else if (car.phase === "reverse") {
    car.v += ((blocked ? 0 : 1.8) - car.v) * (1 - Math.exp(-(blocked ? 9 : 4) * dt));
    car.s = Math.min(BACK, car.s + car.v * dt);
    car.x = bx;
    car.z = BAY_Z + car.s;
    if (car.s >= BACK) { car.phase = "drive"; car.s = 0; }
  } else {
    car.v += ((blocked ? 0 : CAR_SPEED) - car.v) * (1 - Math.exp(-(blocked ? 9 : 1.6) * dt));
    car.s = Math.min(path.len, car.s + Math.max(car.v, 0.9 * (blocked ? 0 : 1)) * dt);
    const u = car.s / path.len;
    const p = path.curve.getPointAt(u);
    const t = path.curve.getTangentAt(u);
    car.x = p.x;
    car.z = p.z;
    target = Math.atan2(t.x, t.z);
    if (car.s >= path.len) { car.phase = "park"; car.dwell = 2.5 + ((car.k * 7) % 4); car.v = 0; }
  }
  car.h = car.phase === "park" || car.phase === "reverse" ? car.h + wrap(target - car.h) * (1 - Math.exp(-6 * dt)) : car.h + wrap(target - car.h) * (1 - Math.exp(-7 * dt));
  car.vx = (car.x - px) / dt;
  car.vz = (car.z - pz) / dt;
}
