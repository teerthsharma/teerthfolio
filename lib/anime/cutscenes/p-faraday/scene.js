// SCENE DATA for p-faraday (Railgun): the live cutscene's clock, lenses and text (clock.js), drawn as the cyanotype blueprint.
// Every beat and cut is in REAL seconds since the arrival; the picture clock (beatT) is read by the layers, not here.
import look from "../../kit/hero/looks/p-faraday.js";
import { AMBER, BEAM_CORE, BEAM_SHEATH, CREAM, CYAN, FLASH, COIN, NAVY } from "./palette.js";
import { DOCK, FOV, LENS, R, SEAL, snap } from "./clock.js";
import { NAVY_INK } from "./tone.js";

const F = (f) => f / 24;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const PUSH = { overscan: 1.06, zoom: [1, 1.045], ease: "linear" };
// a cut from eye a to eye b (rig frame), aim held or drifting between two aim points; boundaries snap to the 12 fps grid
const cut = (n, [t0, t1], eye, aim, fov, o = {}) => ({
  n, t: [snap(t0), t1 === 28.55 ? t1 : snap(t1)], law: "free", hold: true, moving: true, minFrac: 0.05,
  eye: [W(eye[0]), W(eye[eye.length - 1])], lookAt: [W(aim[0]), W(aim[aim.length - 1])], fov, ...o,
});
// a lens from clock.js LENS: [eye, forward]; the aim is 30 m down the view
const lens = (n, t, from, to, o) => {
  const aim = ([e, f]) => e.map((v, i) => v + 30 * f[i]);
  return cut(n, t, [from[0], to[0]], [aim(from), aim(to)], FOV, o);
};
const stand = (t, to, yaw) => ({ t: [snap(t[0]), snap(t[1])], to: W(to), yaw });
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({
  t: t0, name: "shake", tau: 0.16, hz: 7,
  schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })),
});
const hitFrames = (t, at, kind, strokes, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes },
];

export default {
  id: "p-faraday",
  title: "A Certain Scientific Railgun",
  anime: "A Certain Scientific Railgun",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: NAVY_INK, set: 0, paint: 0 },
  },
  frame: { ink: "#15141c", lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: 28.55,
  seed: 2401,
  far: 900,
  plates: true,
  bg: false,
  palette: { paper: CREAM, ink: NAVY, accent: AMBER, cyan: CYAN, coin: COIN, beamCore: BEAM_CORE, beamSheath: BEAM_SHEATH, flash: FLASH },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [stand([14.95, 15.5], [0, 0, 0], SEAL.yawBack)],
    track: [
      { t: 2.16, expr: "smirk", dur: 0.1, hold: 14.8, out: 0.2 },
      { t: 5.95, pose: "coin-hold", dur: 2.6, hold: 5.0, out: 0.3 },
      { t: 13.55, pose: "coin-flick", dur: 0.5, hold: 0.35, out: 0.2 },
      { t: 14.38, pose: "rail-aim", dur: 0.1, hold: 0.9, out: 0.5 },
      { t: 14.55, pose: "crouch", dur: 0.08, hold: 0.25, out: 0.3, k: 0.7 },
      { t: 13.45, set: { catch: { col: AMBER, glow: 1.6, n: 2 }, noBlink: true }, dur: 0.2, hold: 1.5, out: 0.3 },
    ],
  },
  shots: [
    cut(1, [0, 2.16], [[0.3, 1.15, 3.3], [0.15, 1.0, 2.9]], [[0, 0.85, -1.4], [0, 0.85, -1.4]], 50, PUSH),
    cut(2, [2.16, 3.35], [[0, 1.2, 3.0], [0.6, 2.0, 8.0]], [[0, 1.0, -0.4], [0.3, 1.2, 0]], [52, 60]),
    lens(3, [3.35, 5.0], LENS.a0, LENS.a, { law: "wide", ease: "smooth" }),
    cut(4, [5.0, 6.4], [[0, 2.1, 5.2]], [[0, 2.1, 0]], 42),
    cut(5, [6.4, 8.55], [[2.0, 0.9, 3.6], [2.0, 0.9, 3.2]], [[2.0, 1.0, 0], [2.0, 1.0, 0]], 55, PUSH),
    cut(6, [8.55, 9.6], [[1.7, 0.55, 2.7]], [[0.2, 0.95, 0.2]], 40),
    lens(7, [9.6, 11.4], LENS.b, LENS.b, { law: "wide" }),
    cut(8, [11.4, 13.45], [[-3.2, 1.0, 1.6], [-2.9, 1.0, 1.4]], [[2.4, 1.2, -0.5]], 48),
    cut(9, [13.45, 14.95], [[1.3, 0.95, 2.25]], [[0.1, 1.0, 0]], 32, { menace: { frac: 0.6, dark: 0, calm: 0.25 } }),
    lens(10, [14.95, 15.5], LENS.b, LENS.b, { law: "wide" }),
    cut(11, [15.5, 16.9], [[2.47, 1.0, -2.33], [2.2, 0.95, -2.1]], [[0, 1.0, 0]], 50),
    cut(12, [16.9, 17.5], [[1.9, 0.9, -1.9]], [[0, 0.95, 0]], 46),
    cut(13, [17.5, 20.34], [[2.6, 0.9, -2.4]], [[0, 0.9, 0]], 48),
    cut(14, [20.34, 22.9], [[-3.42, 0.6, 1.1], [-3.0, 0.55, 0.95]], [[0, 0.55, 0]], 50, { law: "home" }),
    cut(15, [22.9, 26.05], [[-1.9, 0.35, 0.9], [-1.7, 0.4, 0.85]], [[0, 0.55, 0]], 46, { law: "home" }),
    cut(16, [26.05, 27.2], [[-3.0, 0.55, 0.95]], [[0, 0.55, 0]], 50, { law: "home" }),
    cut(17, [27.2, 28.55], [[-3.0, 0.55, 0.95], [-1.1, 10.1, 12.3]], [[0, 0.55, 0], [0, 0, 0]], [50, 35], { law: "home", ease: "in" }),
  ],
  beats: [
    shk(2.16, 0.03, 0.2, 9),
    rumble(3.35, 5.0, 0.004, 0.01, 5),
    rumble(5.11, 8.55, 0.004, 0.012, 8),
    rumble(12.0, 14.4, 0.004, 0.012, 6),
    { t: 13.55, name: "gather", dur: 0.93, at: "hand" },
    ...hitFrames(14.55, "hand", "shot", [[0, 0, 0, 4.4, 0.24]]),
    shk(14.55, 0.04, 0.22, 9),
    shk(14.75, 0.025, 0.14, 22),
    shk(14.95, 0.02, 0.2, 9),
    { t: R.pass - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    shk(R.pass, 0.022, 0.16, 12),
    shk(R.island, 0.02, 0.2, 10),
    shk(R.collapse[0], 0.018, 0.2, 10),
    { t: 2.16, name: "panel", dur: F(2), at: "seal", kind: "turn" },
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
