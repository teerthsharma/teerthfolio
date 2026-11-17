// Clock of p-faraday (Railgun): real seconds since the arrival, and the move's scene seconds on the live PACE.
const cum = (marks, segs) => {
  let r = 0;
  return marks.map((m, i) => [m, i ? (r += segs[i - 1]) : 0]);
};

const PACE = cum([0, 0.45, 1.6, 1.8, 6.4, 6.8, 12.0, 16.7, 20.0, 20.8], [0.45, 2.7, 0.2, 2.6, 2.6, 6.0, 7.5, 4.0, 2.5]);
const HZ = 60;
const M = PACE.length - 1;
const D = Array.from({ length: M }, (_, i) => (PACE[i + 1][0] - PACE[i][0]) / (PACE[i + 1][1] - PACE[i][1]));
const G = Array.from({ length: M + 1 }, (_, i) => (i === 0 ? D[0] : i === M ? D[M - 1] : (2 * D[i - 1] * D[i]) / (D[i - 1] + D[i])));
const N = Math.ceil(PACE[M][1] * HZ) + 1;

const TBL = new Float64Array(N);
{
  let s = 0;
  for (let i = 0; i < N; i++) {
    const r = Math.min(i / HZ, PACE[M][1]);
    while (s < M - 1 && r >= PACE[s + 1][1]) s++;
    const h = PACE[s + 1][1] - PACE[s][1];
    const u = (r - PACE[s][1]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    TBL[i] = (2 * u3 - 3 * u2 + 1) * PACE[s][0] + (u3 - 2 * u2 + u) * h * G[s] + (-2 * u3 + 3 * u2) * PACE[s + 1][0] + (u3 - u2) * h * G[s + 1];
  }
}

export function beatT(real) {
  if (real <= 0) return real;
  const x = real * HZ;
  const i = Math.floor(x);
  if (i >= TBL.length - 1) return TBL[TBL.length - 1] + (real - (TBL.length - 1) / HZ);
  return TBL[i] + (TBL[i + 1] - TBL[i]) * (x - i);
}

export function realAt(scene) {
  let lo = 0;
  let hi = TBL.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (TBL[mid] <= scene) lo = mid;
    else hi = mid;
  }
  return (lo + (TBL[hi] > TBL[lo] ? (scene - TBL[lo]) / (TBL[hi] - TBL[lo]) : 0)) / HZ;
}

export const smooth = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

export const snap = (x) => Math.round(x * 12) / 12;

export const R = {
  sign: [0.45, 1.87],
  impact: snap(2.16),
  bloom: [2.16, 3.15],
  cut: snap(3.35),
  charge: [3.35, 5.01],
  amber: [5.11, 8.55],
  coin: 7.18,
  toss: [13.55, 14.42],
  flick: 14.48,
  shot: 14.55,
  glow: 15.79,
  pass: snap(17.05),
  burn: [18.62, 21.98],
  island: snap(20.34),
  cheer: [16.9, 21.8],
  flex: [22.9, 25.85],
  collapse: [26.05, 27.15],
  end: 28.55,
  back: [14.2, 15.5],
  hold: [snap(13.45), snap(14.95)],
};

export const T = {
  jacket: [0.55, 1.1],
  toss: [11.15, 11.9],
  flick: 11.95,
  burn: [12.85, 14.55, 16.65],
  coin: 6.6,
  cheer: [13.55, 16.55],
  come: [1.8, 5.2, 7.0, 2.6],
};

export const radiusAt = (real) => 30 * smooth(R.bloom[0], R.bloom[1], real) * (1 - smooth(R.collapse[0], R.collapse[1], real));

export const LINES = [
  { id: "A", t: [1.8, 6.8], who: "touma", kind: "oval", text: "Electric and magnetic? You're just assuming they couple." },
  { id: "B", t: [6.8, 11.8], who: "seal", kind: "burst", text: "Not assumed. Found." },
  { id: "K", t: [12.6, 17.6], who: "kuroko", kind: "oval", text: "Onee-sama… I mean, Seal-sama!!" },
  { id: "C", t: [17.6, 25.3], who: "seal", kind: "burst", text: "The field coupling, found rather than assumed. Computational Faraday tensor, topology-fixed-point projection." },
];
export const PILL = [15.6, 23.6];
export const PILL_TEXT = "The railgun burned the blueprint away. That is the island under it. Home.";
export const DOCK_AT = 1.6;
export const CREDIT = {
  t: [22.05, 26.05],
  title: "teerthsharma/faraday",
  sub: "computational Faraday tensor · topology-fixed-point projection · coupling, not assumption",
};
export const BOLD = ["assuming", "Found.", "Onee-sama", "Seal-sama!!", "The field coupling, found rather than assumed."];

export const DOCK = [-42, 0, 39.6];
export const PHI = 0.1;
export const FOV = 55;
export const ISLAND = [0.727, -0.686];
export const SEAL = { yaw: 1.5, scale: 1.5, yawBack: 2.33, yawHome: -1.256, pupYaw: 0.4 };
export const LENS = {
  a: [[12.2, 0.56, -0.6], [-0.998, 0.069, 0]],
  a0: [[10.4, -0.5, -4.0], [-0.998, 0.069, 0]],
  b: [[-7.6, 1.1, 2.65], [0.951, 0.02, -0.309]],
  back: [[5.39, 1.2, -5.08], [-0.726, -0.074, 0.684]],
  home: [[-7.59, 0.48, 2.65], [0.951, 0.02, -0.309]],
  rise: [[-1.1, 10.1, 12.3], [0.12, -0.475, -0.872]],
};
export const HOMEDIR = [0.951, -0.309];
export const BEAM_LINE = { y: 0.75, z: -0.95 };
