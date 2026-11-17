// HERO ENTRANCE MOVES: the animal moves a seal makes on the cut to its held hero shot. Each is a pure function of
// local time u in 0..1 (moveChannels(name, u, opts)) that ends exactly in the neutral upright pose, so any hero pose
// can follow. Authored as drawings: anticipation, the move, a squash held long enough for one drawing on twos to
// catch it, and a settle with a small overshoot. Positions are metres in the frame of the FINAL facing (+z ahead).
// The body rests on the ground at any angle (groundLift) and tips over its own weight (comShift), never a hinge.
import { REST_ARM, REST_WRIST, comShift, groundLift } from "./motion.js";

const D = Math.PI / 180, TAU = Math.PI * 2, P = 90 * D;
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy }), wr = (rx, ry, rz) => ({ rx, ry, rz });
const clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (k) => k * k * (3 - 2 * k), arc = (s) => Math.sin(Math.PI * clamp(s));
const mixObj = (a, b, k) => Object.fromEntries(Object.keys(a).map((c) => [c, a[c] + (b[c] - a[c]) * k]));
const mixArm = (a, b, k) => [mixObj(a[0], b[0], k), mixObj(a[1], b[1], k), k < 0.5 ? a[2] : b[2]];
// flipper targets in the pose frame, solved by IK: [arm, wrist, hand shape]. splay and plant lie on the ground when prone, hit is the clap
const ARMS = {
  rest: [REST_ARM, REST_WRIST, "flat"],
  up: [arm(2.95, -0.15, 0.21, -2.25), wr(0.2, 0.7, 0.03), "flat"],
  out: [arm(0.75, 1.44, 0.01, -0.37), wr(0.11, -0.37, 0.07), "open"],
  splay: [arm(1.65, 1.09, 0, -0.59), wr(-0.19, 0.41, 0.29), "open"],
  plant: [arm(0.64, 0.21, 1.27, -0.04), wr(0.31, -1.08, 0.84), "flat"],
  swept: [arm(-0.48, 0.44, 0.65, -0.48), wr(0.54, 0.6, -0.21), "flat"],
  brake: [arm(1.57, -0.16, 1.55, 1.04), wr(0.46, -0.25, -0.56), "open"],
  tuck: [arm(0.65, 0.31, 1.39, -1.14), wr(0.09, 0.39, -0.25), "fist"],
  wide: [arm(1.04, 0.9, 0.77, 0.7), wr(-0.18, -0.24, -0.18), "open"],
  hit: [arm(1.53, -0.46, 0.31, -1.27), wr(-0.64, 0.35, 0.85), "flat"],
};
ARMS.flap = mixArm(ARMS.rest, ARMS.out, 0.45);

// key channels: xc/zc the weight's ground path, air the height over ground contact, hx/hy/hz head, tx/ty tail, a/aR/aL an ARMS name.
// A key carries forward what it does not name; `e` eases the segment arriving at it.
const NEUTRAL = { xc: 0, zc: 0, air: 0, rx: 0, ry: 0, rz: 0, yaw: 0, sy: 1, sxz: 1, sx: 1, sz: 1, hx: 0, hy: 0, hz: 0, tx: 0, ty: 0, smear: 0, blink: 0, whisker: 0 };
const NUM = Object.keys(NEUTRAL);
const EASE = { lin: (k) => k, in: (k) => k * k, out: (k) => 1 - (1 - k) * (1 - k), io: smooth };
const END = (o) => ({ u: 1, ...NEUTRAL, a: "rest", ...o });

function play(keys, u) {
  let prev = { ...NEUTRAL, aR: "rest", aL: "rest" };
  const full = keys.map((key) => (prev = { ...prev, e: "io", ...key, aR: key.aR ?? key.a ?? prev.aR, aL: key.aL ?? key.a ?? prev.aL }));
  let i = 0;
  while (i < full.length - 2 && u >= full[i + 1].u) i++;
  const A = full[i], B = full[i + 1], k = EASE[B.e](clamp((u - A.u) / Math.max(1e-6, B.u - A.u))), v = {};
  for (const c of NUM) v[c] = A[c] + (B[c] - A[c]) * k;
  v.aR = mixArm(ARMS[A.aR], ARMS[B.aR], k); v.aL = mixArm(ARMS[A.aL], ARMS[B.aL], k);
  return v;
}

function channels(v) {
  const c = { rx: v.rx, ry: v.ry, rz: v.rz, yaw: v.yaw, sy: v.sy, sxz: v.sxz, sx: v.sx, sz: v.sz }, [dx, dz] = comShift(c);
  return { ...c, x: v.xc + dx, z: v.zc + dz, y: v.air + groundLift(c), smear: v.smear, smearDir: v.smearDir, blink: v.blink, whisker: v.whisker,
    head: { rx: v.hx, ry: v.hy, rz: v.hz }, tail: { rx: v.tx, ry: v.ty },
    armR: v.aR[0], wristR: v.aR[1], handR: v.aR[2], armL: v.aL[0], wristL: v.aL[1], handL: v.aL[2] };
}

const far = (f) => Math.hypot(f[0], f[2]) > 0.15;
// the push-up every prone move ends on: a held flat beat, the rear stays down while the chest swings up past upright, then settles
const rise = (a, b, H = 0) => [
  { u: a, rx: P, sy: 1, sxz: 1, sz: 0.84, sx: 1.08, hx: -1.1, a: "plant", tx: 0.5, yaw: H },
  { u: a + 0.4 * (b - a), sz: 0.9, sx: 1.05, hx: -1.15, tx: 0.3 },
  { u: b, rx: -9 * D, sz: 1, sx: 1, sy: 1.07, sxz: 0.96, hx: 0.25, a: "rest", tx: -0.3, yaw: 0 },
  { u: b + 0.55 * (1 - b), rx: 3 * D, sy: 0.96, sxz: 1.02, hx: -0.08, tx: 0.12 },
  END(),
];

// { dur: default seconds, own: sets its own heading (the others ease in from the previous yaw), fn(u, options) }; options in API.md section 4
export const HERO_MOVES = {
  bellyFlop: { dur: 0.9, own: true, fn(u, o) {
    const f = o.from ?? [0, 0.95, -0.55], H = far(f) ? Math.atan2(-f[0], -f[2]) : 0;
    const v = play([
      { u: 0, rx: 60 * D, yaw: H, sy: 1.08, sxz: 0.96, hx: -0.45, a: "up", tx: 0.5 },
      { u: 0.12, rx: 56 * D, sy: 1.03, sxz: 0.99, hx: -0.3, a: "splay", tx: -0.15, e: "out" },
      { u: 0.34, rx: 86 * D, sy: 1.14, sxz: 0.94, hx: -0.7, tx: 0.6, smear: 0.1, e: "in" },
      { u: 0.37, rx: P, sy: 1.1, sxz: 1, sz: 0.66, sx: 1.2, hx: -0.15, tx: 0.95, blink: 1, whisker: -0.7, smear: 0, e: "lin" },
      { u: 0.48, sz: 0.72, sx: 1.16, hx: -0.3, tx: 0.8 },
      { u: 0.6, rx: 84 * D, sy: 0.98, sz: 1.1, sx: 0.96, hx: -1.1, tx: 0.2, blink: 0, whisker: 0.5, e: "out" },
      { u: 0.7, rx: P, sy: 1, sz: 0.86, sx: 1.08, hx: -1.0, a: "plant", tx: 0.55, whisker: 0, yaw: H, e: "in" },
      ...rise(0.74, 0.9, H),
    ], u);
    const drop = u < 0.12 ? 1 + 0.05 * arc(u / 0.12) : 1 - clamp((u - 0.12) / 0.24) ** 2, h = 1 - clamp(u / 0.36);
    v.air = u < 0.36 ? f[1] * drop : u > 0.48 && u < 0.7 ? 0.1 * arc((u - 0.48) / 0.22) : 0.03 * arc((u - 0.76) / 0.16);
    v.xc = f[0] * h; v.zc = f[2] * h; v.smearDir = [0, 0, 1];
    return v;
  } },
  roll: { dur: 0.9, own: true, fn(u, o) {
    const f = o.from ?? [-1.7 * (o.turns ?? 1), 0, 0], side = f[0] > 0 ? 1 : -1, turns = o.turns ?? 1, dist = Math.hypot(f[0], f[2]);
    const v = play([
      { u: 0, rx: P, a: "tuck", hx: -1.05, tx: 0.2, sy: 1.03, sxz: 0.98 },
      { u: 0.58, e: "lin" },
      { u: 0.64, hx: -1.0, hz: 0.16 * side, a: "plant", tx: 0.7, sy: 1, sxz: 1, e: "out" },
      ...rise(0.7, 0.89),
    ], u);
    const left = (1 - clamp(u / 0.58)) ** 1.6, rock = 0.22 * arc((u - 0.58) / 0.12);
    v.ry = -side * TAU * turns * left + side * rock; v.xc = side * dist * left - side * 0.27 * rock;
    // the head spots like a dancer: it holds its look at the lens while the body turns under it, tucks as the back comes round
    const w = v.ry - TAU * Math.round(v.ry / TAU), aw = Math.abs(w);
    if (u < 0.58) { v.hy = -Math.sign(w) * (aw <= 1.1 ? aw : 1.1 * (Math.PI - aw) / (Math.PI - 1.1)); v.hx = -0.15 - 0.9 * Math.max(0, Math.cos(w)) ** 2; }
    return v;
  } },
  spin: { dur: 0.6, own: true, fn(u, o) {
    const dir = o.dir ?? 1, A = dir * TAU * (o.turns ?? 1), hop = o.hop ?? 0, t0 = o.turn ?? 0;
    const v = play([
      { u: 0 },
      { u: 0.16, sy: 0.86, sxz: 1.1, hx: 0.15, hy: dir * 0.2, a: "tuck", ty: -dir * 0.5, e: "out" },
      { u: 0.4, sy: 1.1, sxz: 0.94, hx: -0.1, hy: -dir * 0.55, a: "out", ty: dir * 0.7, e: "in" },
      { u: 0.64, sy: hop ? 1.1 : 1.04, sxz: 0.96, hy: -dir * 0.4, ty: dir * 0.5, e: "lin" },
      { u: 0.68, sy: 0.87, sxz: 1.1, hy: -dir * 0.3, hx: 0.12, a: "flap", ty: dir * 0.3, e: "lin" },
      { u: 0.76, sy: 0.9, sxz: 1.08 },
      { u: 0.87, sy: 1.04, sxz: 0.98, hy: dir * 0.22, hx: -0.05, a: "rest", ty: -dir * 0.2 },
      { u: 0.94, sy: 0.99, sxz: 1, hy: -dir * 0.06 },
      END(),
    ], u);
    const wind = t0 - dir * 0.45, over = A + dir * 0.3;
    v.ry = u < 0.16 ? t0 + (wind - t0) * EASE.out(u / 0.16) : u < 0.66 ? wind + (over - wind) * smooth((u - 0.16) / 0.5)
      : u < 0.87 ? over + (A - dir * 0.08 - over) * smooth((u - 0.66) / 0.21) : A - dir * 0.08 * (1 - smooth((u - 0.87) / 0.13));
    v.air = hop * arc((u - 0.18) / 0.48);
    return v;
  } },
  flipperClap: { dur: 0.8, fn(u, o) {
    const n = o.claps ?? 2, w = 0.6 / n, keys = [{ u: 0 }, { u: 0.14, rx: -12 * D, sy: 1.06, sxz: 0.97, hx: -0.3, a: "wide", tx: 0.4, e: "out" }];
    for (let i = 0; i < n; i++) {
      const s = 0.14 + i * w, last = i === n - 1;
      keys.push({ u: s + 0.3 * w, rx: 7 * D, sy: 0.9, sxz: 1.07, hx: 0.1, a: "hit", tx: -0.2, air: 0, whisker: 0.6, e: "in" }, { u: s + 0.62 * w, sy: 0.93, sxz: 1.05 },
        { u: s + w, rx: last ? -4 * D : -11 * D, sy: 1.06, sxz: 0.97, hx: -0.28, a: last ? "flap" : "wide", air: last ? 0 : 0.05, tx: 0.4, whisker: 0, e: "out" });
    }
    return play([...keys, { u: 0.86, rx: 3 * D, sy: 0.96, sxz: 1.03, hx: 0.06, a: "rest", tx: 0 }, { u: 0.94, rx: 0, sy: 1.01, sxz: 1, hx: 0 }, END()], u);
  } },
  slide: { dur: 1.0, own: true, fn(u, o) {
    const f = o.from ?? [-2.2, 0, -0.5], H = far(f) ? Math.atan2(-f[0], -f[2]) : 0, left = (1 - clamp(u / 0.58)) ** 3;
    const v = play([
      { u: 0, rx: P, yaw: H, sy: 1.14, sxz: 0.93, hx: -0.9, a: "swept", tx: -0.4, smear: 0.06 },
      { u: 0.32, sy: 1.1, sxz: 0.95, smear: 0.05, e: "lin" },
      { u: 0.42, yaw: 0.6 * H, sy: 0.85, sxz: 1.1, hx: -1.0, a: "brake", tx: 0.9, smear: 0, e: "out" },
      { u: 0.52, yaw: 0.2 * H, sy: 0.88, sxz: 1.08, tx: 0.7, smear: 0 },
      { u: 0.62, yaw: -0.14 * Math.sign(H), sy: 0.96, sxz: 1.03, hx: -1.05, a: "plant", tx: 0.25 },
      ...rise(0.68, 0.87),
    ], u);
    v.xc = f[0] * left; v.zc = f[2] * left; v.smearDir = [0, 1, 0];
    return v;
  } },
  shimmy: { dur: 0.7, fn(u, o) {
    const n = o.shakes ?? 6, p = clamp((u - 0.14) / 0.56), on = p > 0 && p < 1 ? 1 - 0.4 * p : 0, sq = (x) => Math.max(-1, Math.min(1, 4 * Math.sin(Math.PI * x)));
    const s = on * sq(p * n), late = on * sq(p * n - 0.5);
    const v = play([
      { u: 0 },
      { u: 0.14, sy: 0.88, sxz: 1.08, hx: 0.25, blink: 1, a: "tuck", whisker: -0.4, e: "out" },
      { u: 0.7, sy: 0.93, sxz: 1.05, hx: 0.1, a: "rest", e: "lin" },
      { u: 0.82, sy: 1.08, sxz: 0.95, hx: -0.2, blink: 0, whisker: 0.6, air: 0.03 },
      { u: 0.92, sy: 0.97, sxz: 1.02, hx: 0.05, whisker: 0, air: 0 },
      END(),
    ], u);
    v.ry += 0.5 * late; v.rz += 0.08 * late; v.hy += 0.85 * s - 0.5 * late; v.hz += 0.25 * s; v.ty -= 0.9 * s; v.xc += 0.015 * late; v.whisker += 0.8 * s;
    v.aR = mixArm(v.aR, ARMS.out, on * (0.35 + 0.35 * Math.max(0, late))); v.aL = mixArm(v.aL, ARMS.out, on * (0.35 + 0.35 * Math.max(0, -late)));
    return v;
  } },
  backRoll: { dur: 0.9, own: true, fn(u, o) {
    const f = o.from ?? [0, 0, 1.2], H = far(f) ? Math.atan2(f[0], f[2]) : 0, left = 1 - smooth(clamp((u - 0.1) / 0.6));
    const v = play([
      { u: 0, rx: 14 * D, yaw: H, sy: 0.86, sxz: 1.1, hx: 0.3, a: "tuck" },
      { u: 0.12, rx: 20 * D, sy: 0.82, sxz: 1.12, hx: 0.4, e: "out" },
      { u: 0.4, rx: -150 * D, sy: 0.9, sxz: 1.06, hx: 0.5, e: "in" },
      { u: 0.68, rx: -340 * D, sy: 1.03, sxz: 0.99, hx: 0.1, a: "flap", tx: 0.3, e: "lin" },
      { u: 0.74, rx: -372 * D, yaw: 0.5 * H, sy: 0.88, sxz: 1.08, hx: 0.22, tx: 0.5, e: "out" },
      { u: 0.81, sy: 0.9, sxz: 1.07 },
      { u: 0.92, rx: -356 * D, yaw: 0, sy: 1.04, sxz: 0.98, hx: -0.08, a: "rest", tx: -0.1 },
      END({ rx: -TAU }),
    ], u);
    v.xc = f[0] * left; v.zc = f[2] * left;
    return v;
  } },
  popUp: { dur: 0.6, fn(u, o) {
    const d = o.depth ?? 0, hop = o.hop ?? (d ? 0.3 : 0.16);
    const low = d ? [{ u: 0, hx: -0.35, a: "swept", tx: 0.1 }, { u: 0.12, hx: -0.3, e: "out" }]
      : [{ u: 0, sy: 0.56, sxz: 1.24, hx: 0.45, a: "tuck", tx: -0.2 }, { u: 0.14, sy: 0.48, sxz: 1.3, hx: 0.55, e: "out" }];
    const v = play([...low,
      { u: 0.34, sy: 1.28, sxz: 0.87, hx: 0.3, a: "up", tx: -0.3, smear: 0.05, e: "in" },
      { u: 0.47, sy: 1.1, sxz: 0.96, hx: -0.3, tx: 0.5, smear: 0, e: "out" },
      { u: 0.64, sy: 1.06, sxz: 0.97, hx: -0.1, a: "out", tx: 0.3, e: "in" },
      { u: 0.67, sy: 0.82, sxz: 1.13, hx: 0.14, a: "flap", tx: 0.1, e: "lin" },
      { u: 0.78, sy: 0.86, sxz: 1.1 },
      { u: 0.9, sy: 1.05, sxz: 0.98, hx: -0.06, a: "rest", tx: 0 },
      END(),
    ], u);
    const up = hop * arc((u - 0.2) / 0.45), rising = EASE.out(clamp((u - 0.12) / 0.35));
    v.air = !d ? up : u < 0.12 ? -d - 0.04 * arc(u / 0.12) : u < 0.47 ? -d + (d + hop) * rising : hop * (1 - clamp((u - 0.47) / 0.18) ** 2);
    v.smearDir = [0, 1, 0];
    return v;
  } },
};
export const MOVE_NAMES = Object.keys(HERO_MOVES);

export function moveChannels(name, u, o = {}) {
  const m = HERO_MOVES[name];
  if (!m) return null;
  const k = clamp(u), v = m.fn(k, o);
  if (o.turn && !m.own) v.ry += o.turn * (1 - smooth(clamp(k / 0.4)));
  return channels(v);
}
