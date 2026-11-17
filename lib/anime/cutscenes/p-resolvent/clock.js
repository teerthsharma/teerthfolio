// The p-resolvent clock: the deployed live move's own timing (components/world/cutscene/moves/p-resolvent.jsx, lib/world/cutscene/clock.js PACE).
// Scene seconds are the live move's authored times; real seconds run from the arrival, and beatT / realAt convert between them.

const cum = (marks, segs) => {
  let r = 0;
  return marks.map((m, i) => [m, i ? (r += segs[i - 1]) : 0]);
};

const PACE = cum([0, 0.45, 1.6, 2.6, 6.4, 7, 11, 16.6, 19.6, 20], [0.45, 2.4, 1.0, 3.6, 2.6, 5.3, 7.7, 4.3, 2.5]);
const HZ = 60;
let TABLE = null;

// A monotone cubic (Fritsch-Carlson) through the marks: scene s at each i / HZ real s.
function table() {
  if (TABLE) return TABLE;
  const k = PACE;
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
  TABLE = T;
  return T;
}

// scene seconds at `real` seconds since the arrival
export function beatT(real) {
  if (real <= 0) return real;
  const T = table();
  const x = real * HZ;
  const i = Math.floor(x);
  if (i >= T.length - 1) return T[T.length - 1] + (real - (T.length - 1) / HZ);
  return T[i] + (T[i + 1] - T[i]) * (x - i);
}

// real seconds at which the scene reaches `scene` seconds
export function realAt(scene) {
  const T = table();
  let lo = 0;
  let hi = T.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (T[m] <= scene) lo = m;
    else hi = m;
  }
  return (lo + (T[hi] > T[lo] ? (scene - T[lo]) / (T[hi] - T[lo]) : 0)) / HZ;
}

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const snap = (x) => Math.round(x * 12) / 12;
export const f24 = (n) => n / 24;

// the stage's radius (m) on the real clock: out on the bloom, back in on the collapse
export const radiusAt = (real) => {
  const t = beatT(real);
  return 34 * smooth(1.15, 1.6, t) * (1 - smooth(19.6, 19.601, t));
};

// THE LIVE MOVE'S SCENE TIMES (scene s)
export const T = {
  sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, aura: 1.75, scaleIn: 2.4, tip: 3.0, ignite: [3.1, 4.2],
  gather: 6.2, release: 7.7, swing: [7.85, 8.45], brk: 8.5, kneel: 10.3, colFade: [9.3, 10.3], word: [10.6, 12.0], flex: 10.9,
  crack: [11.4, 13.2], dis: [13.0, 15.4], dolly: [7.8, 8.7, 9.9, 10.9], collapse: 19.6, back: 13.6,
};

// THE SAME BEATS IN REAL SECONDS (scene times through the clock)
const at = realAt;
export const R = {
  sign: [at(T.sign[0]), at(T.sign[1])],
  impact: at(T.impact),
  bloom: [at(T.bloom[0]), at(T.bloom[1])],
  sfx: [at(1.27), at(T.enter)],
  enter: at(T.enter),
  aura: at(T.aura),
  scaleIn: at(T.scaleIn),
  tip: at(T.tip),
  ignite: [at(T.ignite[0]), at(T.ignite[1])],
  gather: at(T.gather),
  release: at(T.release),
  swing: [at(T.swing[0]), at(T.swing[1])],
  brk: at(T.brk),
  pakiin: [at(T.brk), at(T.brk + 1.2)],
  kneel: at(T.kneel),
  colFade: [at(T.colFade[0]), at(T.colFade[1])],
  word: [at(T.word[0]), at(T.word[1])],
  flex: at(T.flex),
  crack: [at(T.crack[0]), at(T.crack[1])],
  dis: [at(T.dis[0]), at(T.dis[1])],
  pill: [at(T.dis[0] + 0.4), at(T.dis[1] + 3.2)],
  wipe: [at(16.0), at(16.6)],
  credit: [at(16.6), at(T.collapse)],
  collapse: at(T.collapse),
  end: at(20),
};

// picture drawings on the 24 grid: the release, the break, the return
export const HIT = { rel: f24(273), brk: f24(298) };
export const IMPACT = f24(48);
export const BACK = f24(453);
export const HOLD = [f24(273), f24(311)];

export const LINES = [
  { id: "A", t: [3.85, 9.7], who: "aura", kind: "oval", tail: [2.3, 3.3, -4.85], text: "Your mana is so small. The scale will decide. Obey me." },
  { id: "B", t: [10.05, 15.35], who: "seal", kind: "burst", tail: [0, 1.0, 0], text: "Okay. Let me pull away my limiters too." },
  { id: "C", t: [15.35, 23.05], who: "seal", kind: "burst", tail: [0, 1.0, 0], text: "Softmax and a Markov path. Two weights on your scale. One operator. 175 declarations, zero sorry." },
];
export const BOLD = ["so small", "Obey me", "limiters", "One operator", "175 declarations", "zero sorry"];
export const PILL = { t: [18.613, 25.528], text: "The scale broke, so Aura's judgement is void. The court unmakes itself, and this is home." };
export const CREDIT = {
  t: [23.05, 27.35],
  title: "teerthsharma/resolvent · 175 declarations · zero sorry",
  sub: "Lean 4: softmax attention and Markov path composition are one operator.",
};
export const SFX = { text: "ZUUUN", t: [2.24, 3.253] };
export const IMPACT_FRAME = { t: [1.962, 2.129] };

// THE PLACE AND THE RIG (the pup at the origin, facing +z; metres)
export const DOCK = [-33, 0, 2.1];
export const HOUSE = [0, 0, -6.6];
export const FOV = 46;
export const SEAL = { scale: 1.6, wide: 2.3, close: 1.25, hold: 0.45, home: 0.6, pup: 0.6 };
export const PUP_CHEST = [0, 0.95, 0];
export const YAWAT = (t) => SEAL.pup + 1.7 * smooth(1.0, 2.2, t) * (1 - smooth(19.2, 19.6, t));
export const LIFT = (tt) => 0.42 * smooth(T.release, T.release + 0.6, tt) * (1 - smooth(T.colFade[0], T.colFade[1] + 0.6, tt));

// THE COURT (rig frame): Aura, her dais and the scale's palm (cast.js AURA, HAND; her yaw -0.25, scale 1.4)
export const AURA_AT = [2.3, 0.9, -5.0];
const AURA_YAW = -0.25;
const AURA_SCALE = 1.4;
const HAND = [1.2, 1.95, 0.12];
const rotY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
export const HW = rotY(HAND.map((v) => v * AURA_SCALE), AURA_YAW).map((v, i) => v + AURA_AT[i]);

export const LAB_SCALE = 1.7;
export const PLACE = { id: "p-resolvent", at: [-33, -4.5], radius: 5, color: "#8a5cff" };
export const WIPE = (tt) => smooth(16.0, 16.6, tt) * (1 - smooth(16.6, 17.0, tt));
// STAND: the seal sits on the lens ray, not the lens, so the court is the site's frame and the seal is as large as the live pup
export const STAND = { 4: [-2.37, 0, 5.04], 6: [-2.37, 0, 5.04], 8: [-0.95, 0, 3.0], 12: [5.27, 0, 3.64], 14: [5.27, 0, 3.64] };
