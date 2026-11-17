// The camera, made first: every shot, the DIO seal's places (STAND) and the cuts. The lenses are the live camera's (clock.js LENS); the seal is moved, not the lens.
import { DUR, HIT, K, LENS, LINE, HOLD, P as PT, PUP0, SEAL, SWAP, W, Y, g, lensAt, rollDeg } from "./clock.js";

const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, [eye, f, fov], o) => shot(n, t, eye, eye.map((v, i) => v + 30 * f[i]), fov, o);
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [Math.sin(a) * r, h, Math.cos(a) * r], aim, fov, o);
const dim = (t) => ({ dutch: rollDeg(t) });
const IMPACT = LINE.impact, RIVAL = HIT.rival;
const sec = g;
const STAND_CHEST = [PT.standBase[0], 2.6 * K, PT.standBase[2]];
// the opening push: KA picks the lens between the live's two island lenses, ZM the 2D zoom at its end (ticket 3)
const KA = 1, ZM = 1.6;
// the seat fraction s of the DIO seal on each dimension lens (ticket 4)
const SEAT_S = 0.55;
// the lateral offset (rig metres, along the lens right) that puts the seal low right, as in the live
const SEAT_X = 1.0;

// a seat on the lens ray: the fraction s of the way from the dock to the eye, turned to face the lens (rig yaw)
const seat = (lens, s) => {
  const [e, f] = lens;
  const r = [-f[2], 0, f[0]];
  const p = [e[0] * s + r[0] * SEAT_X, 0, e[2] * s + r[2] * SEAT_X];
  return [p, Math.atan2(e[0] - p[0], e[2] - p[2])];
};
export const STAND = { a: seat(LENS.dim, SEAT_S), b: seat(LENS.dimStop, SEAT_S), b2: seat(LENS.dimResume, SEAT_S) };

export const SHOTS = [
  live(1, [0, 10 / 12], lensAt("isl", KA), { zoom: [1, ZM], ease: "linear", overscan: 1.5 }),
  at(2, [10 / 12, IMPACT], PUP0.open + 0.55, 6.5, 0.5, [0, 0.35, 0], 40),
  live(4, [IMPACT, 23 / 12], lensAt("dim"), { ...dim(IMPACT), law: "wide" }),
  live(5, [23 / 12, RIVAL], lensAt("dim"), dim(23 / 12)),
  at(6, [RIVAL, LINE.A], -0.14, 7.5, 1.2, PT.tower, 42, dim(RIVAL)),
  live(7, [LINE.A, sec(3.5)], lensAt("dim"), { ...dim(LINE.A), law: "wide" }),
  at(8, [sec(3.5), sec(3.9)], -0.3, 7.5, 0.3, [PT.coral[0], 3.0, PT.coral[2]], 40, dim(sec(3.5))),
  at(9, [sec(3.9), sec(4.4)], 0.35, 6.5, 0.6, [PT.coral[0], 3.0, PT.coral[2]], 52, { ...dim(sec(3.9)), law: "arc" }),
  at(10, [sec(4.4), sec(4.8)], 0.3, 6.3, 0.7, STAND_CHEST, 40, dim(sec(4.4))),
  live("10b", [sec(4.8), 5], lensAt("dim"), dim(sec(4.8))),
  live("11a", [5, 64 / 12], lensAt("dimStop"), dim(5)),
  shot(11, HOLD, [0.15, 1.0, 2.7], [-0.1, 1.45, -3.5], 34, { ...dim(5), menace: { frac: 0.8, dark: 0, calm: 0.25 }, quiet: true, law: "kill" }),
  at(12, [HOLD[1], HIT.resume], 0.12, 3, 0.55, PT.clock, 40, { ...dim(HOLD[1]), quiet: true }),
  live(13, [HIT.resume, 92 / 12], lensAt("dimResume"), { ...dim(HIT.resume), law: "kill" }),
  at(14, [92 / 12, SWAP], -0.5, 5.2, 1.2, [0, 2.4, PT.drown[2]], 56, dim(HIT.drown)),
  live(15, [SWAP, 9], lensAt("isl2"), { law: "home" }),
  live(16, [9, LINE.credit], lensAt("isl2"), { zoom: [1, 1.18], ease: "linear", overscan: 1.3, law: "home" }),
  live(17, [LINE.credit, DUR], lensAt("credit"), { zoom: [1.18, 1.3], pan: [[0.5, 0.5], [0.5, 0.56]], ease: "linear", overscan: 1.3, law: "home" }),
];

// the DIO seal's seat per cut (shot n): a STAND key, or the dock (the default)
const SEAT = { 4: "a", 5: "a", 7: "a", "10b": "b2", "11a": "b", 13: "b2" };
export const CUTS = SHOTS.map((s) => ({ n: s.n, t: s.t[0] }));
export const MOVES = CUTS.map((c) => {
  const k = SEAT[c.n];
  const [pos, rigYaw] = k ? STAND[k] : [[0, 0, 0], null];
  return { t: [c.t - 2e-3, c.t - 1e-3], to: W(pos), yaw: rigYaw === null ? SEAL.yaw : Y(rigYaw) };
});
