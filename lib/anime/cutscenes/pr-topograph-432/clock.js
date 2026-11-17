// The pr-topograph-432 clock: beat times, the ten panels, the hall's walkable floor and the placement helpers. Pure: imports nothing.
// Panel eye/look are [start, end] pairs (equal for a still shot); S0's wide end is camera.js's grammar (far 420 m, pitch 14 deg).
export const DUR = 29.4;
export const FPS = 12;
export const DOCK = [52, 0, -6.9];
export const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];

export const T = {
  sign: [0.45, 1.05], impact: 1.15, impactEnd: 1.32, doom: [1.15, 1.6], turn: 1.5,
  lineA: [2.3, 8.15], lineB: [8.5, 15.3], lineC: [15.3, 24.2], credit: [24.2, 28.6],
  mouth: [[2.4, 4.4], [15.4, 19.8]], ignite: [5.0, 5.35], rise: [7.4, 9.7], flare: [8.4, 10],
  open: [9, 11], staff: [12.4, 13.2], close: [17.4, 18.6], sit: [18.0, 19.8], back: 20.0, gutter: 0.09,
};
export const HIT = { eyes: 120 / 24, rise: 178 / 24, reveal: 216 / 24, staff: 307 / 24, back: 480 / 24 };

export const smooth = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
export const onTwos = (t) => Math.floor(t * 12 + 1e-6) / 12;

export function floorY(x, z) {
  if (z >= -2.65) return 0;
  if (z >= -7.55 && Math.abs(x) <= 3.5) return 0.4 * (Math.min(6, Math.floor((-2.65 - z) / 0.7)) + 1);
  if (z >= -13.6 && z < -7.2 && Math.abs(x) <= 6) return 2.8;
  return 0;
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));

export function standOn(eye, look, fov, aspect, u, v) {
  const f = nrm(sub(look, eye)), r = nrm(cross(f, [0, 1, 0])), up = cross(r, f);
  const hh = Math.tan((fov * Math.PI) / 360);
  const d = nrm(add(add(f, mul(r, (2 * u - 1) * hh * aspect)), mul(up, (1 - 2 * v) * hh)));
  for (let s = 0.5; s < 60; s += 0.05) {
    const p = add(eye, mul(d, s));
    if (p[1] <= floorY(p[0], p[2])) return [p[0], floorY(p[0], p[2]), p[2]];
  }
  return [0, 0, 0];
}

export function yawBetween(p, a, b, k) {
  const ya = Math.atan2(a[0] - p[0], a[2] - p[2]), yb = Math.atan2(b[0] - p[0], b[2] - p[2]);
  return ya + ((yb - ya + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * k;
}

const ASPECT = 16 / 9;
const FOLLOW = { eye: [-2.1, 1.0, 3.2], look: [0.2, 0.8, 0] };
const WIDE = { eye: [-223.59, 102.51, 340.71], look: [0, 42.9, 0] };
const lens = (eye, look, fov) => ({ eye: [eye, eye], look: [look, look], fov });
const facing = (seal, c) => yawBetween(seal, c.look[0], c.eye[0], 0.55);
const L3 = lens([2.6, 5.4, -4.2], [0, 4.9, -11], 44);
const L4 = lens([-3.2, 3.6, 1.2], [0, 5.4, -10], 48);
const L5 = lens([-2.6, 0.9, 4.2], [0.4, 3.4, -7.5], 54);
const S3seal = standOn(L3.eye[0], L3.look[0], L3.fov, ASPECT, 0.2, 0.9);
const S4seal = standOn(L4.eye[0], L4.look[0], L4.fov, ASPECT, 0.82, 0.92);

export const PANELS = [
  { id: "S0", t: [0, 1.5], eye: [FOLLOW.eye, WIDE.eye], look: [FOLLOW.look, WIDE.look], fov: 28, fovTo: 42, roll: 0, frame: "island", seal: [0, 0, 0], yaw: 0.6 },
  { id: "S1", t: [1.5, 2.9], ...lens([3.6, 2.2, 7.6], [0, 2.6, -5], 50), roll: 0, frame: "hall", seal: [0, 0, 0], yaw: 0.5 },
  { id: "S2", t: [2.9, 4.4], ...lens([1.9, 0.8, 3.1], [0.05, 1.1, 0], 40), roll: 0, frame: "hall", seal: [0, 0, 0], yaw: 0.6 },
  { id: "S3", t: [4.4, 7.4], ...L3, roll: 2.3, frame: "hall", seal: S3seal, yaw: facing(S3seal, L3) },
  { id: "S4", t: [7.4, 8.5], ...L4, roll: -2.9, frame: "hall", seal: S4seal, yaw: facing(S4seal, L4) },
  { id: "S5", t: [8.5, 12.2], ...L5, roll: 1.7, frame: "hall", seal: [0, 0, 0], yaw: facing([0, 0, 0], L5) },
  { id: "S6", t: [12.2, 15.3], ...lens([1.0, 1.3, 2.6], [0, 1.4, 0], 34), roll: 0, frame: "hall", seal: [0, 0, 0], yaw: 0.45 },
  { id: "S7", t: [15.3, 20.0], ...lens([2.4, 1.5, 4.2], [0, 3.6, -7], 50), roll: 1.15, frame: "hall", seal: [0, 0, 0], yaw: 2.6 },
  { id: "S8", t: [20.0, 24.2], ...lens([-2.1, 1.0, 3.2], [0.2, 0.8, 0], 44), roll: 0, frame: "island", seal: [0, 0, 0], yaw: 0.6 },
  { id: "S9", t: [24.2, 29.4], ...lens([-9.5, 3.8, 13.5], [2.5, 1.4, -5], 36), roll: 0, frame: "island", seal: [0, 0, 0], yaw: 0.22 },
];

export function panelAt(t) {
  return PANELS.find((p) => t < p.t[1]) ?? PANELS[PANELS.length - 1];
}
