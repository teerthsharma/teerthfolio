// The live clock of pr-openxla-46539: the deployed timeline (card beats, no pacing, no return law) and the
// picture clock of the site's moves/pr-openxla-46539/world.js update, as pure functions. Times are card seconds.
// LENS holds the measured site camera (verification/faithful/pr-openxla-46539/livecam.json, rig frame, seal at origin).

export const LAW = { duration: 24.9, sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, lineA: 2.6, move: [8.6, 9.4], lineB: 9.4, lineC: 14.4, credit: 19.4, collapse: [24.1, 24.5] };
export const HIT = LAW.lineB + 1.1, FRZ = 2 / 12, BRK = LAW.credit - 0.6, BACK = 19.0, RADIUS = 56;
export const STRIKES = [0.9, 2.45, 4.15, 5.7, 6.55, 7.9, 9.0], IMP = [1.4, 1.0, -7.2], PILLAR = [1.4, -10.5, 7];
export const DASH_TO = [1.4, -7.2], NOMU_AT = [1.7, -12.5], CORE_Y = 0.9, BEAK = [3.3, 4.6, -9.9];
export const DOCK = [-12, 0, -19.4];
export const FOV = 62;

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const onTwos = (t) => Math.floor(t * 12 + 1e-6) / 12;
export const G = (g) => g / 12;
export const F = (f) => f / 24;
export const picT = (t) => (t < HIT ? t : t < HIT + FRZ ? HIT : t - FRZ * (1 - smooth(HIT + FRZ, HIT + FRZ + 1, t)));
export const radiusAt = (t) => RADIUS * smooth(LAW.bloom[0], LAW.bloom[1], t) * (1 - smooth(LAW.collapse[0], LAW.collapse[1], t));
export const signAt = (t) => smooth(LAW.sign[0], LAW.sign[1], t) * (1 - smooth(LAW.collapse[1], LAW.duration, t));
export const OFF = new Set((typeof location === "undefined" ? "" : new URLSearchParams(location.search).get("off") ?? "").split(",").filter(Boolean));

export function phase(t, tr = t, out = 1) {
  const tt = onTwos(picT(t));
  const trq = onTwos(tr);
  const T0 = LAW.lineB, hit = HIT, hit2 = LAW.lineC, W0 = hit - 2.8;
  const brk = tt - BRK;
  const broken = brk > 0;
  const age = tt - hit;
  const age2 = tt - hit2;
  let fl = 0;
  if (age < 0) for (const k of STRIKES) fl = Math.max(fl, tt >= k && tt < k + 0.34 ? (Math.floor((tt - k) * 12) % 2 ? 0.45 : 1) * (1 - (tt - k) / 0.34) : 0);
  const windRaw = age < 0 ? 0.3 + 0.2 * Math.sin(tt * 1.3) : 0.6 + 2.6 * Math.exp(-age * 0.9);
  const rise = smooth(LAW.enter, LAW.enter + 1.15, tt);
  const stag = smooth(hit, hit + 0.1, tt);
  const bl = Math.max(0, Math.min(1.4, age));
  const thrA = smooth(3.1, 3.55, tt) * (1 - smooth(3.55, 4.4, tt));
  const thrB = smooth(3.55, 4.0, tt) * (1 - smooth(4.0, 4.9, tt));
  const guard = smooth(hit, hit + 0.25, tt);
  const hold = 1 - smooth(hit2 + 2.6, hit2 + 3.4, tt);
  const du = tt - T0;
  const e1 = smooth(0.4, 1.1, du);
  const e2 = smooth(1.3, 2.0, du);
  const dk = e1 - e2;
  const flying = e1 > 0.02 && e1 < 0.98 ? 1 : 0;
  const flyingBack = e2 > 0.02 && e2 < 0.98 ? 1 : 0;
  const dashK2 = Math.max(flying, flyingBack) * Math.sin(Math.PI * Math.min(1, Math.max(0, flying ? (du - 0.4) / 0.7 : (du - 1.3) / 0.7)));
  const wind = Math.min(2.4, 0.28 + (windRaw - 0.3) * 0.6 + 1.6 * (flying + flyingBack));
  const pk = Math.max(smooth(hit - 0.04, hit + 0.06, tt) * (1 - smooth(hit + 0.55, hit + 0.9, tt)), smooth(BRK - 1.0, BRK - 0.6, tt));
  const fk = smooth(hit2 - 0.35, hit2 - 0.02, tt) * (1 - smooth(hit2 + 0.4, hit2 + 0.85, tt));
  const pull = smooth(hit2 - 0.35, hit2 - 0.05, tt) * (1 - smooth(hit2 + 0.4, hit2 + 0.85, tt));
  const punch = Math.max(smooth(hit - 1.9, hit - 0.9, tt) * 0.5, smooth(hit - 0.05, hit + 0.12, tt) * (1 - smooth(hit + 0.8, hit + 1.2, tt)), smooth(hit2 - 0.05, hit2 + 0.1, tt)) * hold * out;
  const ar = trq - hit;
  const ia = Math.floor(ar * 12 + 1e-6);
  return {
    tt, tr: trq, age, age2, brk, broken, du, e1, e2, dk, dashX: DASH_TO[0] * dk, dashZ: DASH_TO[1] * dk,
    flying, flyingBack, dashK2, rise, stag, bl, guard, thrA, thrB, pk, fk, pull, hold, punch,
    windRaw, wind, fl, sun: smooth(hit + 0.2, hit + 1.9, tt), open: smooth(hit, hit + 2.2, tt),
    swirl: age > 0 ? 0.55 * age : 0, blast: age > 0 ? smooth(0, 1.6, age) : 0,
    sign: signAt(t) * (1 - smooth(1.4, 1.8, tt)),
    fist: Math.max(smooth(W0, W0 + 0.8, tt) * (1 - smooth(T0 - 0.2, T0, tt)), smooth(hit2 - 1.5, hit2 - 0.9, tt) * (1 - smooth(hit2 - 0.12, hit2, tt))) * out,
    raise: Math.max(smooth(hit - 0.05, hit + 0.1, tt) * (1 - smooth(hit + 0.8, hit + 1.1, tt)), smooth(hit2 - 0.05, hit2 + 0.1, tt) * hold),
    crouch: Math.max(smooth(T0, T0 + 0.35, tt) * (1 - smooth(T0 + 0.4, T0 + 0.5, tt)) * 0.95, smooth(hit2 - 1.0, hit2 - 0.3, tt) * (1 - smooth(hit2 - 0.12, hit2, tt)) * 0.7) * out,
    pupY: (0.5 * Math.sin(Math.PI * Math.min(1, Math.max(0, (du - 0.4) / 0.7))) + 0.35 * Math.sin(Math.PI * Math.min(1, Math.max(0, (du - 1.3) / 0.7)))) * out,
    yaw: Math.min(1, smooth(0.35, 0.5, du) * (1 - smooth(1.3, 1.5, du))),
    held: brk > 0.2,
    capeOn: !(brk > 0.2) && tt > 1.3,
    billow: Math.min(1, smooth(W0, hit - 0.6, tt) * 0.35 + smooth(hit - 0.05, hit + 0.18, tt) * 0.65 - smooth(hit + 0.9, hit + 1.6, tt) * 0.4 + smooth(hit2 - 0.1, hit2 + 0.2, tt) * 0.5 - smooth(hit2 + 2.4, hit2 + 3.4, tt) * 0.5),
    auraOn: !(brk > 0.2) && tt > W0 - 0.1,
    auraK: smooth(W0, hit - 0.9, tt) * (1 + (age > 0 ? 0.5 * Math.exp(-age * 4) : 0) + (age2 > 0 ? 0.6 * Math.exp(-age2 * 4) : 0)) * (1 - smooth(hit2 + 2.6, hit2 + 3.4, tt)),
    flashWhite: (ia === 0 && ar >= 0 ? 1 : 0) + Math.max(0, 1 - Math.abs(age2 - 0.04) / 0.09) * 0.2 + Math.max(0, 1 - Math.abs(brk) / 0.1) * 0.14,
    flashBlack: ia === 1 && ar >= 0 ? 1 : 0,
    focus: Math.max(flying, flyingBack) * 0.8 + (age > 0.17 && age < 0.45 ? 0.5 : 0),
    gk: Math.max(0.5 * smooth(LAW.enter - 0.4, LAW.enter + 0.4, tt), smooth(hit + 0.2, hit + 0.6, tt)) * (1 - smooth(hit + 3.2, hit + 4.2, tt)),
    reveal: tt > BRK && tt < LAW.collapse[0],
  };
}

export const LENS = {
  arr0: [[[-2.293, 13.594, 20.754], [-1.765, 2.504, 16.839]], [[0.018, -0.435, -0.9], [0.103, -0.165, -0.981]]],
  land: [[[-1.718, 2.299, 16.394], [-1.5, 8.334, 32.376]], [[0.105, -0.158, -0.982], [0.053, -0.132, -0.99]]],
  w: [[2.033, 1.092, 8.149], [-0.109, 0, -0.994]],
  dash: [[-2.059, 1.371, 6.642], [0.313, -0.043, -0.948]],
  dash2: [[-2.166, 1.551, 5.305], [0.341, -0.045, -0.938]],
  w2: [[-2.948, 1.574, 8.194], [0.354, -0.038, -0.934]],
  pull: [[-0.829, 0.679, 2.788], [0.332, 0.06, -0.941]],
  w3: [[-3.461, 1.789, 9.799], [0.354, -0.038, -0.934]],
  home: [[-2.132, 1.339, 6.048], [0.354, -0.038, -0.934]],
};
export const SEAL = { yaw: Math.atan2(LENS.w[0][0], LENS.w[0][2]), scale: 1.6 };
const standAt = (eye, k = 0.3) => {
  const p = [eye[0] * k, 0, eye[2] * k];
  return [p, Math.atan2(eye[0] - p[0], eye[2] - p[2])];
};
export const STAND = { w: standAt(LENS.w[0]), w2: standAt(LENS.w2[0]), w3: standAt(LENS.w3[0]) };
