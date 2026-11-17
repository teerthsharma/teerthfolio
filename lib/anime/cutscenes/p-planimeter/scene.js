// SCENE DATA for p-planimeter (Classroom of the Elite, "Exactly Fifty", Class 1-D at sunset). The live order, beat seconds, words and camera
// are the deployed site's (clock.js: the PACE row at 460bafd and the lens measured on evilseal.si). Every engine pass that adds haze, glow,
// grain or outlines is off by data: the room is flat cel. The seal is the approved character from the turn to the return; the pale pup opens it.
import look from "../../kit/hero/looks/p-planimeter.js";
import { ACCENT, BARS, CHECK, CREAM, INK } from "./palette.js";
import { BACK, BD, BELL, COL, END, ENTER, F, GL, IMP, KEY, MT, PUP_YAW, TURN, W } from "./clock.js";
import { SEAL_SCALE } from "./cast/scale.js";

const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({
  t: t0, name: "shake", tau: 0.16, hz: 7,
  schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })),
});
const ones = (t, dur = 0.5) => ({ t, name: "ones", dur, layers: ["world", "cast", "fx"] });
const freeze = (t) => ({ t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] });
const flat = (t) => ({ t, name: "flat", frames: 1, col: "#fbf6ea", bars: "keep" });

const fwd = (E) => E[0].map((v, i) => v + 30 * E[1][i]);
const lens = (t, A, B, o = {}) => ({
  t, law: "free", moving: true, minFrac: 0.05, step: 12, long: true, ease: "linear",
  eye: [W(A[0]), W(B[0])], lookAt: [W(fwd(A)), W(fwd(B))], fov: [A[2], B[2]], ...o,
});
const poly = (ts, o = {}) => ts.slice(1).map((b, i) => lens([ts[i], b], KEY(ts[i]), KEY(b), o));
const hold = (t, eye, aim, fov, o = {}) => ({
  t, law: "free", hold: true, moving: true, minFrac: 0.05, long: true,
  eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov: [fov, fov], ...o,
});
const HOLD_EYE = [Math.sin(0.35) * 2.6, 1.0, Math.cos(0.35) * 2.6], HOLD_AIM = [0, 1.35, 0];
const TURN_SHOTS = poly([3.792, 3.9, 4.0, 4.1, 4.2, 4.3, ENTER, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.2, 5.5]);
TURN_SHOTS.forEach((s) => { if (s.t[0] >= 4.0 && s.t[1] <= 4.2 + 1e-9) s.law = "wide"; });
const END_SHOTS = poly([24.4, 24.6, 24.8, 25.0, 25.2, 25.4, 25.6, 25.8, 26.0, 26.2, 26.5, 26.8, 27.0, END]);
END_SHOTS[END_SHOTS.length - 1].law = "home";

export default {
  id: "p-planimeter",
  title: "Classroom of the Elite: Exactly Fifty (Class 1-D at sunset)",
  anime: "Classroom of the Elite, Lerche: Ayanokoji's exact fifty, Class 1-D",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: "#4a2a22", set: 0, paint: 0 },
  },
  frame: { ink: BARS, lift: [0, 0.02] },
  hold: false,
  fps: 12,
  duration: END,
  seed: 1,
  far: 1500,
  plates: true,
  bg: false,
  palette: { paper: CREAM, ink: INK, red: CHECK, accent: ACCENT },
  seal: {
    at: W([0, 0, 0]), yaw: PUP_YAW + TURN, scale: SEAL_SCALE, hero: look, shadow: false, moves: [],
    track: [
      { t: ENTER - 0.01, pose: "sit", dur: 0.2, hold: BACK - ENTER, out: 0.1, k: 0.8 },
      { t: ENTER, expr: "halflid", dur: 0.2, hold: BACK - ENTER, out: 0.1 },
      { t: ENTER, set: { rim: 0.6 }, dur: 0.2, hold: BACK - ENTER, out: 0.1 },
      { t: 6.0, blink: true }, { t: 12.2, blink: true }, { t: 17.0, blink: true },
      { t: GL, set: { catch: { col: "#fffdf2", glow: 2.2, n: 1 }, pinpoint: 0.35 }, dur: 0.1, hold: 1.5, out: 0.3 },
    ],
  },
  shots: [
    ...poly([0, 0.3, 0.6, 1.0, 1.5, 2.0, 2.4, 3.0]),
    ...poly([3.0, 3.3, 3.6, 3.792]),
    ...TURN_SHOTS,
    lens([5.5, GL], KEY(5.5), KEY(5.5)),
    hold([GL, 9.958], HOLD_EYE, HOLD_AIM, 34, { law: "kill", menace: { frac: 0.8, dark: 0, calm: 0.25 } }),
    lens([9.958, 10.2], KEY(10.0), KEY(10.2)),
    ...poly([10.2, 10.3, 10.4, 10.5]),
    lens([10.5, 15.25], KEY(10.5), KEY(14.7)),
    ...poly([15.25, 17.0, 18.7, 20.5]),
    lens([20.5, 24.4], KEY(20.5), KEY(23.0)),
    ...END_SHOTS,
  ].map((s, i) => ({ n: i + 1, ...s })),
  beats: [
    shk(IMP, 0.026, 0.22, 9),
    { t: IMP, name: "speedlines", dur: 0.45, kind: "radial", at: [0.5, 0.62], strength: 0.3, col: "#fbf6ea", spokes: 48, taper: 0.5 },
    freeze(ENTER), flat(ENTER),
    rumble(7.0, GL, 0.004, 0.012, 6),
    freeze(GL), flat(GL), ones(GL), shk(GL, 0.022, 0.22, 9),
    { t: GL, name: "speedlines", dur: F(4), kind: "radial", at: [0.5, 0.4], strength: 0.35, col: "#ffffff", converge: [0.5, 0.4] },
    flat(BD), ones(BD), shk(BD, 0.03, 0.2, 10),
    freeze(MT), { t: MT, name: "invert", frames: 1 }, ones(MT), shk(MT, 0.04, 0.22, 9), shk(MT + F(3), 0.024, 0.14, 22),
    { t: MT, name: "speedlines", dur: 0.25, kind: "radial", at: [0.5, 0.46], strength: 0.4, col: "#fbf6ea", converge: [0.5, 0.3] },
    freeze(BELL), shk(BELL, 0.012, 0.2, 10),
    ones(BACK - F(2)), shk(BACK, 0.022, 0.16, 12),
    ones(COL), shk(COL, 0.02, 0.2, 10),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
