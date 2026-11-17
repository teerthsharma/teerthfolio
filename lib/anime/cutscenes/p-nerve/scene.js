// SCENE DATA for p-nerve (Death Note, the bells on the rooftop): the live move's clock, shots, hits and seal track, data only.
// Frames are real frames at 24 fps (f / 24); every cut that turns the seal lands on its own drawing. The engine's photography, post,
// lines and background are off by data, so the page keeps the live style's umber, ivory and crimson alone.
import look from "../../kit/hero/looks/p-nerve.js";
import { DOCK, HOLD_END, ISL, LIVE_WIDE, REAL, SEAL } from "./clock.js";
import { ACCENT, IVORY, UMBER } from "./palette.js";

const F = (f) => f / 24;
const HOLD = Math.round(HOLD_END * 24);
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a toll: the world holds two frames and the shake kicks; the drawn toll is fx/hits.js
const hit = (t, amp) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] }, shk(t, amp, 0.2, 9), shk(t + F(3), amp * 0.6, 0.14, 22),
];
const PUSH = { overscan: 1.06, zoom: [1, 1.045], ease: "linear" };
const shot = (n, f0, f1, eye, aim, fov, o = {}) => ({ n, t: [F(f0), F(f1)], law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const stand = (f, yaw) => ({ t: [F(f) - 2e-3, F(f) - 1e-3], to: W([0, 0, 0]), yaw });
const pose = (name, t0, t1) => ({ t: t0, pose: name, dur: 0.2, hold: t1 - t0 - 0.2, out: 0.1 });
const chan = (t0, set, dur = 0.1, hold = 0.5, out = 0.5) => ({ t: t0, set, dur, hold, out });
const lit = (t0, t1) => ({ t: t0 - 0.02, set: { catch: { glow: 1.3 } }, dur: 0.01, hold: t1 - t0, out: 0.01 });
const TOLLS = [243, 285, 326].map(F);
const L8 = LIVE_WIDE(0.8), L65 = LIVE_WIDE(0.65);

export default {
  id: "p-nerve",
  title: "Death Note, Ryuk and the bells on the rooftop (the live cutscene, drawn better)",
  anime: "Death Note, Madhouse: E25 Silence, the Task Force tower, the three bells and the page",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: UMBER, set: 0, paint: 0 },
  },
  frame: { ink: UMBER, lift: [0.008, 0.03] },
  hold: false,
  fps: 24,
  duration: 31,
  seed: 25,
  far: 1500,
  plates: true,
  bg: false,
  palette: { ink: UMBER, umber: UMBER, ivory: IVORY, red: ACCENT, accent: ACCENT },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [
      stand(29, 0.35), stand(50, 1.15), stand(109, 0.35), stand(152, 0.35), stand(182, 0.35), stand(240, -0.25), stand(264, 0.0), stand(298, 0.35),
      stand(317, -0.3), stand(351, 0.8), stand(370, 0.35), stand(389, -0.15), stand(421, 0.0), stand(HOLD, -0.1), stand(525, 0.0), stand(586, 0.6),
      stand(624, 0.6), stand(725, 0.6),
    ],
    track: [
      { t: F(29), expr: "kira", dur: 0.2, hold: 13.5, out: 0.2 },
      pose("offer", F(50), 4.6),
      pose("write", 4.6, 7.0),
      pose("nerve-hold", 7.0, 16.29),
      ...[10.128, 11.865, 13.602].map((w) => chan(w - 0.05, { head: { ry: -0.35 } })),
      { t: REAL.survive, expr: "stare", dur: 0.15, hold: 1.4, out: 0.3 },
      pose("fist", 16.29, 17.4),
      pose("nerve-show", 17.55, 20.4),
      chan(17.55, { head: { rz: 0.21 } }, 0.25, 0.3, 0.25),
      pose("nerve-hold", 20.4, 23.4),
      pose("eat", 23.4, 24.4),
      lit(F(29), F(50)), lit(F(109), F(152)), lit(F(421), HOLD_END),
    ],
  },
  shots: [
    shot(1, 0, 29, [2.3, 0.6, 5.4], [0.45, 0.95, 0], 40, PUSH),
    shot(2, 29, 50, LIVE_WIDE(0.5).eye, [0.7, 1.0, -1.0], 44, { law: "wide" }),
    shot(3, 50, 109, [-2.6, 0.95, 3.4], [0.9, 1.3, -1.4], 38, { law: "arc" }),
    shot(4, 109, 152, LIVE_WIDE(0.8).eye, [1.0, 3.4, -6.0], 48),
    shot(5, 152, 182, [1.0, 1.2, 2.6], [-0.2, 1.05, -0.4], 34),
    shot(6, 182, 240, LIVE_WIDE(0.6).eye, [0.5, 1.1, -1.6], 44),
    shot(7, 240, 264, [-0.4, 1.15, 2.5], [-0.9, 1.2, -2.0], 34),
    shot(8, 264, 298, [2.5, 1.1, 2.0], [-2.0, 1.1, -1.6], 40, { law: "kill" }),
    shot(9, 298, 317, LIVE_WIDE(0.6).eye, [0.2, 1.1, -1.6], 44),
    shot(10, 317, 351, [0.4, 1.15, 2.4], [-0.9, 1.2, -2.0], 32),
    shot(11, 351, 370, [1.9, 1.7, 0.9], [0.5, 2.15, -2.1], 28),
    shot(12, 370, 389, LIVE_WIDE(0.6).eye, [1.2, 1.6, -2.2], 46),
    shot(13, 389, 421, [0.3, 1.05, 2.1], [0, 1.0, 0], 32),
    shot(14, 421, HOLD, [0.0, 1.3, 2.45], [0.55, 1.2, -0.1], 34, { menace: { frac: 0.62, dark: 0, calm: 0.25 } }),
    shot(15, HOLD, 525, L8.eye, L8.aim, L8.fov, { zoom: [1, 1.05], overscan: 1.06, ease: "linear" }),
    shot(16, 525, 586, L65.eye, L65.aim, L65.fov, { zoom: [1, 1.08], overscan: 1.08, ease: "linear" }),
    shot(17, 586, 624, ISL.eye, ISL.aim, ISL.fov, { law: "home", zoom: [1, 1.04], overscan: 1.06 }),
    shot(18, 624, 725, ISL.eye, ISL.aim, ISL.fov, { zoom: [1.04, 1.07], overscan: 1.08 }),
    shot(19, 725, 744, [0.6, 0.5, 6.2], [3.1, 0.4, -11.62], 42),
  ],
  beats: [
    ...hit(TOLLS[0], 0.014),
    ...hit(TOLLS[1], 0.022),
    ...hit(TOLLS[2], 0.032),
    shk(F(490), 0.012, 0.18, 9),
    rumble(F(525), F(586), 0.003, 0.018, 8),
    { t: F(586) - F(2), name: "freeze", dur: F(2), layers: ["world"] },
    shk(F(586), 0.04, 0.22, 9), shk(F(587) + 0.2, 0.026, 0.2, 9), shk(24.8, 0.012, 0.2, 9),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
