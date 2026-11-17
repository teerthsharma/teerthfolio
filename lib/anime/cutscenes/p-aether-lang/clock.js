export const smooth = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
export const onTwos = (s) => Math.floor(s * 12) / 12;

const F = (n) => n / 24;
const HZ = 60;
const MARKS = [0, 0.45, 1.6, 2.3, 6.0, 6.6, 10.8, 20.2, 24.2, 26.7];
const SEGS = [0.45, 2.7, 0.3, 2.5, 2.6, 5.4, 9.4, 4.0, 2.5];
let acc = 0;
const K = MARKS.map((m, i) => [m, i ? (acc += SEGS[i - 1]) : 0]);

function table(k) {
  const m = k.length - 1;
  const R = k[m][1];
  const d = Array.from({ length: m }, (_, i) => (k[i + 1][0] - k[i][0]) / (k[i + 1][1] - k[i][1]));
  const g = Array.from({ length: m + 1 }, (_, i) => (i === 0 ? d[0] : i === m ? d[m - 1] : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  const n = Math.ceil(R * HZ) + 1;
  const T = new Float64Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.min(i / HZ, R);
    while (s < m - 1 && r >= k[s + 1][1]) s++;
    const h = k[s + 1][1] - k[s][1];
    const u = (r - k[s][1]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    T[i] = (2 * u3 - 3 * u2 + 1) * k[s][0] + (u3 - 2 * u2 + u) * h * g[s] + (-2 * u3 + 3 * u2) * k[s + 1][0] + (u3 - u2) * h * g[s + 1];
  }
  return T;
}
const TABLE = table(K);

export function sceneOf(real) {
  if (real <= 0) return real;
  const T = TABLE;
  const x = real * HZ;
  const i = Math.floor(x);
  if (i >= T.length - 1) return T[T.length - 1] + (real - (T.length - 1) / HZ);
  return T[i] + (T[i + 1] - T[i]) * (x - i);
}

export function realOf(scene) {
  const T = TABLE;
  let lo = 0;
  let hi = T.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (T[m] <= scene) lo = m;
    else hi = m;
  }
  return (lo + (T[hi] > T[lo] ? (scene - T[lo]) / (T[hi] - T[lo]) : 0)) / HZ;
}

export const T = {
  fade: [1.45, 2.15], freeze: 8.6, ring: [8.7, 9.5], lock: 9.5, still: [9.5, 10.4], form: [15.3, 17.0],
  close: [17.0, 17.8], fire: [17.9, 19.5], tunnel: [18.6, 19.4], rv: 19.5, clear: [19.5, 20.2],
};
export const TL = {
  sign: [0.45, 1.05], impact: [1.15, 1.27], bloom: [1.15, 1.6], enter: 1.95, lineA: 2.3, move: [6.0, 6.6],
  lineB: 6.6, lineC: 10.8, credit: 20.2, collapse: [24.2, 24.6],
};
export const HIT = { impact: F(55), lock: F(301), cry: F(335), collide: F(504), fire: F(506), collapse: F(656) };
export const LINE = { A: 3.45, B: 8.55, C: 13.95, credit: 23.35 };
export const BACK = F(544);
export const DURATION = 29.85;
export const DOCK = [-44, 0, -19.4];
export const SEAL = { yaw: 0.6, scale: 1.6 };
export const GOJO = { at: [2.2, 0, -3.6], scale: 1.568 };
export const CORE = [0, 1.7, -15];
export const CHEST = 0.9;
export const RADIUS = 26;
export const ENTER = [[1.3, 0.5], [0.86, 1.14], [1.05, 0.96]];

// Live lens [eye, forward] in the rig frame: medians of livecam.mjs 30 s; flood and mid are swings (1.28 and 0.86 m per sample).
export const FOV = 68;
export const LENS = {
  island: [[-4.1835, 2.89, 6.3207], [0.5388, -0.3004, -0.787]],
  two: [[3.9616, 0.5336, -5.304], [-0.571, 0.0706, 0.8179]],
  flood: [[-7.7349, 0.7627, 4.9146], [0.804, 0.0443, -0.593]],
  mid: [[1.3983, 0.8576, -8.9926], [0.0203, 0.0236, 0.9995]],
  stop: [[0.3827, 0.8019, -6.1728], [0.0189, 0.0236, 0.9995]],
  c: [[0.3553, 0.7575, -5.6017], [0.0189, 0.0236, 0.9995]],
  home: [[0.3574, 0.3633, -5.6948], [0.0189, 0.0236, 0.9995]],
};
// STAND: the seal on the lens ray to the dock at 30% of frame height (1.67 m, fov 68), turned to the lens.
export const STAND = { two: [[1.499, 0, -2.007], 2.5], c: [[0.096, 0, -1.518], 3.078] };
// the teles keep the live eye and narrow the lens: aim at the chest (rig frame), fov per tele
export const AIM = { lock: [STAND.c[0][0], 1.05, STAND.c[0][2]], cry: [STAND.c[0][0], 1.2, STAND.c[0][2]] };
export const TELE_FOV = { lock: 34, cry: 26 };

export function orbs(tt, hR, hL, chest) {
  const grow = smooth(T.form[0], T.form[1], tt);
  const shut = smooth(T.close[0], T.close[1], tt);
  const wob = 0.04 * Math.sin(tt * 40);
  const rr = (0.05 + 0.3 * grow) * (1 + 0.5 * shut + wob) * SEAL.scale;
  const top = chest.clone().setY(chest.y + 0.4 * SEAL.scale);
  const f = Math.min(1, Math.max(0, (tt - T.fire[0]) / (T.fire[1] - T.fire[0])));
  return {
    grow, shut, f, on: tt >= T.form[0] && tt < T.close[1],
    blue: { p: hR.clone().lerp(top, shut), r: rr },
    red: { p: hL.clone().lerp(top, shut), r: rr },
    purple: { on: tt >= T.close[1] - 0.05 && f < 1 && tt < T.rv, s: 0.5 + 0.4 * smooth(T.close[1] - 0.05, T.fire[0], tt) + 5.2 * f * f, f },
  };
}
