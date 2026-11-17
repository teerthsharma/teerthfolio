// SCENE DATA for p-monodromy (Sinbad, Baararaq Saiqa): the live move's clock, twelve held shots, the four hits and the seal's track.
// Data only. The lettering is the page layer (fx/page.js) and every world, cast and fx object is built from ./clock.js.
import look, { baal } from "../../kit/hero/looks/p-monodromy.js";
import { DOCK, F, G, HIT, R, SEAL } from "./clock.js";
import { INK } from "./tone.js";

const P = look.poses;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a hit as the page draws it: the world holds one drawing, the panel runs on ones, the shake follows
const hit = (t, at, kind, amp, strokes, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
// the seal is placed one to two milliseconds before a cut, so it is redrawn on the cut's own drawing
const stand = (t, p = [0, 0, 0], yaw = SEAL.yaw) => ({ t: [t - 2e-3, t - 1e-3], to: W(p), yaw });
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });

export default {
  id: "p-monodromy",
  title: "Magi, Sinbad: Baararaq Saiqa (PROTECTED style)",
  anime: "Magi: The Labyrinth of Magic, A-1 Pictures: Sinbad, Baal, Baararaq Saiqa",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: INK, set: 0, paint: 0 },
  },
  frame: { ink: INK, lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: 28.15,
  seed: 2701,
  far: 1500,
  plates: true,
  bg: false,
  palette: { ink: "#140f3a", gold: "#e9b23a", crimson: "#b3123a", teal: "#1fbdb4", accent: "#e9b23a" },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: { ...look, variants: { baal } }, shadow: false,
    moves: [
      stand(G(27), [0.6, 0, 2.6], 0.5), stand(3.0, [0, 0, 0], 0.25), stand(3.75, [0, 0, 0], 0.3), stand(4.75, [0, 0, 0], 0),
      stand(G(106), [0, 0, 0], 0), stand(G(145), [0, 0, 0], SEAL.yaw),
    ],
    track: [
      { t: 1.25, expr: "smirk", dur: 0.1, hold: 3, out: 0.2 },
      { t: G(35), form: "baal", dur: 0.33 },
      { t: G(35), set: P.grip, dur: 0.3, hold: 0.8, out: 0.2 },
      { t: 3.917, set: P.raiseOne, dur: 0.6, hold: 4.5, out: 0.3 },
      { t: 4.75, expr: "sinbad-cry", dur: 0.08, hold: 0.55, out: 0.2 },
      { t: 5.6, set: P.stare, dur: 0.4, hold: 8, out: 0.3 },
      { t: 8.85, expr: "smirk", dur: 0.2, hold: 0.5, out: 0.2 },
      { t: 11.5, noBlink: 2 },
      on(4.75, 5.4, { catch: { col: "#7fd8ff", glow: 1.9 } }),
    ],
  },
  shots: [
    shot(1, [0, G(18)], [1.4, 0.9, 3.8], [0, 1.3, -6.6], 40, { overscan: 1.06, zoom: [1, 1.04], ease: "linear" }),
    shot(2, [G(18), G(27)], [2.8, 3.6, 13.5], [0, 1.4, -5], 44),
    shot(3, [G(27), 3.0], [-0.4, 1.1, 7.8], [0.4, 1.3, -1.0], 44),
    shot(4, [3.0, 3.75], [1.6, 1.0, 3.6], [0, 1.1, 0], 40),
    shot(5, [3.75, 4.75], [0.9, 0.55, 3.3], [0, 1.5, -5], 40),
    shot(6, [4.75, G(106)], [1.08, 0.58, 3.6], [0, 1.0, 0], 34, { menace: { frac: 0.55, dark: 0, calm: 0.25 } }),
    shot(7, [G(106), G(145)], [0.5, 0.35, 3.8], [0, 3.2, -3], 46),
    shot(8, [G(145), R.pop], [2.43, 0.86, 6.2], [0, 0.45, 0], 36),
    shot(9, [R.pop, G(257)], [2.43, 0.86, 6.2], [0, 0.45, 0], 36, { overscan: 1.06, zoom: [1, 1.03], ease: "linear" }),
    shot(10, [G(257), G(307)], [2.43, 0.86, 6.2], [0, 0.45, 0], 36, { overscan: 1.06, zoom: [1.03, 1.05], ease: "linear" }),
    shot(11, [G(307), G(323)], [2.43, 0.86, 6.2], [0, 0.45, 0], 36),
    shot(12, [G(323), 28.15], [4.0, 7.0, 15.0], [0, 1.2, -3], 44),
  ],
  beats: [
    ...hit(HIT.equip, "seal", "equip", 0.02, [], 3),
    { t: R.strike - 0.833, name: "gather", dur: 0.833, at: "hand" },
    ...hit(HIT.strike, "hand", "strike", 0.04, [[0.6, 0.5, 0.9, 3.6, 0.1]], 4),
    ...hit(HIT.crack, [0.55, 0.47], "crack", 0.03, [], 3),
    ...hit(HIT.fall, [0.5, 0.5], "shatter", 0.034, [], 3),
    { t: R.pop - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] }, shk(R.pop, 0.022, 0.16, 12),
    { t: 3.0, name: "shake", tau: 0.16, hz: 7, schedule: [{ t: 3.0, amp: 0.004 }, { t: 3.4, amp: 0.007 }, { t: 3.8, amp: 0.01 }, { t: 4.2, amp: 0.012 }] },
    rumble(4.9, 8.5, 0.006, 0.006, 6),
    shk(R.fall + 0.6, 0.02, 0.2, 10), shk(R.locked, 0.026, 0.2, 9),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
