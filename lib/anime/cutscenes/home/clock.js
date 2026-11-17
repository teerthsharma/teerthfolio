// The home move's clock, camera keys and lines, on the live clock (components/world/cutscene/moves/home.jsx, director.js, lib/world/cutscene/timeline.js). Its notes live with the originals.
import { hash as partHash } from "./live/parts.js";

export const T = { plop: 2.6, rise: [5.0, 5.9], circle: [5.8, 10.6], spy: [10.7, 11.3], sink: [11.6, 12.6], bloop: 12.0, gull: 4.5, beacon: 19.0, step: 0.5, rain: [24.4, 25.8], run: [25.6, 27.4], end: 29.4 };
export const LINE = { sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, A: 2.3, move: [12.2, 12.8], B: 12.8, C: 18.8, credit: 25.0, collapse: [29.4, 29.8] };
export const LENGTH = 30.2, INTO = 16 / 12, BACK = 594 / 24, GLIDE = 0.9, FOV = 52;
export const OC = { cx: 0.5, cz: -0.3, rx: 3.3, rz: 2.7 }, THORS_AT = [-2.4, 0, -0.5], THORS_MOUTH = [-2.4, 1.95, -0.5];
export const SEAL = { yaw: 0.2, scale: 1.15 };
export const KEY = { A: [[1.5, 1.25, 4.6], [-1.1, 0.95, -0.6]], B: [[4.8, 1.5, 13], [0.5, 0.5, -0.3]], C: [[2.2, 1.7, 9], [-1, 3.4, -100]], E: [[-2.5, 3.0, 6.5], [-12.6, 3.6, -7]], D: [[7, 3.6, 17], [-5, 1.6, -7]], I: [[0.9, 0.95, 3.2], [0, 0.55, 0]], H: [[-1.1, 0.62, 2.3], [1.6, 0.62, 0.05]], R: [[-2.6, 1.1, 3.4], [1.0, 1.6, -6]] };
export const DOCK = [0, 0, -2.2]; // = dockPoint(PLACE_BY_ID.home) in lib/world/places.js: x 0, z -8 + 4.2 + 1.6
export const TEXT = {
  A: { kind: "oval", text: "You have no enemies.", bold: ["enemies"] },
  B: { kind: "burst", text: "I have no orcas, for I have no enemies.", bold: ["orcas", "enemies"] },
  C: { kind: "oval", text: "Eleven landed contributions. Welcome home.", bold: ["Eleven landed contributions"] },
  credit: { title: "Teerth Sharma · Seal's Topology Land", sub: "Eleven landed contributions." },
};
export const drift = (t) => [0.12 * Math.sin(t * 0.37), 0.05 * Math.sin(t * 0.51)];
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const onTwos = (t) => Math.floor(t * 12) / 12;
export const lerp = (a, b, k) => a + (b - a) * k;
export const hash = partHash;

export function orcaAt(t, o) {
  const rise = smooth(T.rise[0], T.rise[1], t);
  const k = smooth(T.circle[0], T.circle[1], t);
  const a = 0.15 + Math.PI * 2 * k;
  let x = OC.cx + OC.rx * Math.cos(a);
  let z = OC.cz - OC.rz * Math.sin(a);
  let yaw = Math.atan2(-OC.rx * Math.sin(a), -OC.rz * Math.cos(a));
  const dive = (1 - smooth(0.5, 1.25, Math.abs(z))) * (1 - smooth(1.0, 2.3, x));
  let y = lerp(-2.6, -0.66, rise) + (t < T.rise[1] + 0.4 ? 0.3 * Math.sin(Math.PI * smooth(T.rise[0] + 0.05, T.rise[1] + 0.3, t)) : 0) - 1.9 * dive;
  const sp = smooth(T.spy[0], T.spy[1] + 0.3, t);
  let pitch = 0;
  if (t > T.circle[1] - 0.3) {
    const j = smooth(T.circle[1] - 0.3, T.spy[0] + 0.1, t);
    x = lerp(x, 3.7, j);
    z = lerp(z, 0.45, j);
    const to = Math.atan2(-3.7, -0.45);
    yaw += Math.atan2(Math.sin(to - yaw), Math.cos(to - yaw)) * j;
    pitch = 1.02 * sp;
    y = lerp(y, -1.5, sp);
  }
  const sink = smooth(T.sink[0], T.sink[1], t);
  y -= 2.4 * sink;
  o.x = x;
  o.z = z;
  o.y = y;
  o.yaw = yaw;
  o.pitch = pitch * (1 - sink * 0.6);
  o.vis = t > T.rise[0] - 0.2 && t < T.sink[1] + 0.05 ? 1 : 0;
  o.surf = o.vis * (1 - sink) * smooth(-2.0, -1.0, y);
  return o;
}

// Seal height / picture height in the live (live.gif p3, p13, f34, f50); the lens is pulled in to these.
export const FRAC = { A: 0.5, B: 0.3, C: 0.4, D: 0.17 };
const pull = ([eye, look], f, fov = FOV) => {
  const c = [0, 0.4 * SEAL.scale, 0], v = c.map((x, i) => x - eye[i]), d = Math.hypot(...v);
  const dm = (0.8 * SEAL.scale) / (2 * Math.tan((fov * Math.PI) / 360) * f), k = d > dm ? dm / d : 1;
  return [eye.map((_, i) => c[i] - v[i] * k), look];
};
export const KEYP = { ...KEY, A: pull(KEY.A, FRAC.A), B: pull(KEY.B, FRAC.B), C: pull(KEY.C, FRAC.C), D: pull(KEY.D, FRAC.D) };
export const CAMT = { toH: [9.65, 10.0], hold: [10.0, 11.6], toB: [11.6, 11.95], b: [11.95, 12.5], toC: [12.5, 13.4] };
export const HIT = { rise: 5.0, arrive: 10.7, bloop: 12.0 };
export const ON = { peng: [[2.3, 9.5]], gull: [[3.9, 29.4]], wake: [[4.9, 13.6]], ring: [[2.5, 13.9], [24.3, 27.6]], smoke: [[12.0, 27.6]], flames: [[19.0, 27.6]], rain: [[24.3, 27.6]], mist: [[4.6, 24.4]] };
export const within = (w, t) => w.some(([a, b]) => t >= a && t < b);
export const run = (t) => smooth(T.run[0], T.run[1], t);

