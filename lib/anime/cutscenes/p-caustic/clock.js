// The live cutscene's clock: scene seconds through the site's PACE curve (lib/world/cutscene/clock.js), a monotone cubic through
// [scene, real] marks, so every beat sits on the real second the live site plays it. Pure: no three.
const MARKS = [[0, 0], [0.45, 0.45], [1.6, 1.95], [3.0, 3.1], [6.0, 6.3], [6.6, 8.9], [9.6, 15.8], [10.8, 19.9], [11.6, 22.5]];
const HZ = 60;
let TABLE = null;

function table() {
  if (TABLE) return TABLE;
  const k = MARKS, m = k.length - 1, R = k[m][1];
  const d = Array.from({ length: m }, (_, i) => (k[i + 1][0] - k[i][0]) / (k[i + 1][1] - k[i][1]));
  const g = Array.from({ length: m + 1 }, (_, i) => (i === 0 ? d[0] : i === m ? d[m - 1] : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  const n = Math.ceil(R * HZ) + 1;
  TABLE = new Float64Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.min(i / HZ, R);
    while (s < m - 1 && r >= k[s + 1][1]) s++;
    const h = k[s + 1][1] - k[s][1], u = (r - k[s][1]) / h, u2 = u * u, u3 = u2 * u;
    TABLE[i] = (2 * u3 - 3 * u2 + 1) * k[s][0] + (u3 - 2 * u2 + u) * h * g[s] + (-2 * u3 + 3 * u2) * k[s + 1][0] + (u3 - u2) * h * g[s + 1];
  }
  return TABLE;
}

// real seconds since the arrival -> scene seconds (the picture's clock)
export function warp(real) {
  if (real <= 0) return real;
  const T = table(), x = real * HZ, i = Math.floor(x);
  if (i >= T.length - 1) return T[T.length - 1] + (real - (T.length - 1) / HZ);
  return T[i] + (T[i + 1] - T[i]) * (x - i);
}

// scene seconds -> real seconds at which the site reaches them
export function R(scene) {
  const T = table();
  let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= scene) lo = mid; else hi = mid; }
  return (lo + (T[hi] > T[lo] ? (scene - T[lo]) / (T[hi] - T[lo]) : 0)) / HZ;
}

export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// scene seconds of every beat (the picture's clock)
export const T = {
  costume: [0.55, 1.15], impact: 1.15, bloom: [1.15, 1.6], rise: [1.7, 2.8], fist: [1.7, 2.0], cast: 3.3, split: [3.45, 3.95],
  m1: [3.8, 4.7], m2in: 4.85, m2hang: 6.1, hit2: 6.42, moonCrack: [5.45, 6.2], web: [6.42, 6.6], brk: 6.6, back: 6.8,
  lineA: 3.0, gap: 6.25, lineB: 6.6, credit: 9.6, collapse: [10.8, 11.2], end: 11.6, doomLife: 0.75,
};

// real seconds of the hits and the beats the page cuts on (on the 24 grid of the live gif)
export const HIT = { turn: R(1.05), m1: R(4.7), m2: R(6.42), brk: R(6.6), back: R(6.8) };
export const DURATION = 22.5;
export const DOCK = [81, 0, 63.6];
export const TURN = 0.4883339511;
export const SEAL = { scale: 1.6 };
// the measured live camera, world frame: [r0, r1, eye, forward, fov, h, law]; h = metres from the camera along the lens ray, 0 = at the dock
export const CAM = [
  [0.00, 0.63, [81, 7.96, 76.43], [0, -0.426, -0.905], 54, 8.5, "wide"],
  [0.63, 1.00, [81, 3.2, 71.5], [0, -0.356, -0.935], 57.3, 4.5, "wide"],
  [1.00, 1.40, [81, 5.3, 77.6], [0, -0.241, -0.97], 62.2, 7, "wide"],
  [1.40, 2.10, [81, 7.1, 86.6], [0, -0.17, -0.985], 65.2, 14, "wide"],
  [2.10, 2.44, [81.8, 5.97, 84.8], [-0.034, -0.141, -0.989], 65.9, 14, "arc"],
  [2.44, 2.77, [89.9, 4.34, 79.56], [-0.479, -0.059, -0.876], 64.6, 12, "arc"],
  [2.77, 2.92, [93.94, 1.64, 66.42], [-0.917, 0.113, -0.382], 62.8, 9, "arc"],
  [2.92, 4.89, [92.4, -1.0, 60.56], [-0.973, 0.209, -0.098], 62, 7.3, "kill"],
  [4.89, 5.15, [90.3, -2.06, 65.49], [-0.924, 0.141, -0.354], 62, 5.5, "kill"],
  [5.15, 8.90, [89.5, -1.1, 68.47], [-0.822, 0.071, -0.565], 62, 5.6, "kill"],
  [8.90, 9.50, [88.4, -1.36, 69.8], [-0.715, 0.061, -0.696], 62, 5.5, "kill"],
  [9.50, 10.16, [86.5, -0.7, 70.4], [-0.55, 0.05, -0.835], 62, 5.0, "kill"],
  [10.16, 20.75, [81.57, 0.55, 70.0], [-0.087, 0.024, -0.996], 62, 3.4, "home"],
  [20.75, 21.40, [81.5, 1.8, 70.5], [-0.074, -0.061, -0.995], 59.8, 3.4, "home"],
  [21.40, 21.85, [81.3, 4.9, 72.3], [-0.042, -0.267, -0.963], 51.8, 0, "home"],
  [21.85, 22.50, [81.0, 9.4, 74.7], [-0.01, -0.447, -0.894], 36.5, 0, "home"],
];
export const camAt = (r) => CAM.find((c) => r >= c[0] && r < c[1]) ?? CAM[CAM.length - 1];
// where the seal stands on the live lens ray, turned toward the camera
export function standAt(r) {
  const c = camAt(r), e = c[2], dx = DOCK[0] - e[0], dz = DOCK[2] - e[2], n = Math.hypot(dx, dz), h = c[5];
  const p = h ? [e[0] + (dx / n) * h, 0, e[2] + (dz / n) * h] : [DOCK[0], 0, DOCK[2]];
  return { p, yaw: Math.atan2(e[0] - p[0], e[2] - p[2]) + 0.4 };
}

// rig frame -> world: the site's cutView formula (rig turned by TURN, then the dock)
export function W(p) {
  const c = Math.cos(TURN), s = Math.sin(TURN);
  return [p[0] * c + p[2] * s + DOCK[0], p[1], p[2] * c - p[0] * s + DOCK[2]];
}
