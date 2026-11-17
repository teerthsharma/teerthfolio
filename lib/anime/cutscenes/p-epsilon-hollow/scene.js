// SCENE DATA for p-epsilon-hollow: the Tensura play (Rimuru, Veldora, Predator) as the live site draws it. The pale pup opens and closes the
// cutscene on the island; the character stands where the pup stood from the turn to the return. The clock is clock.js; every engine pass that
// adds colour, haze, glow or a grade is off.
import look from "../../kit/hero/looks/p-epsilon-hollow.js";
import { POSES } from "../../kit/hero/looks/p-epsilon-hollow.parts.js";
import { AT, HIT, SEAL } from "./clock.js";
import { P } from "./palette.js";
import { INK } from "./tone.js";

const F = (f) => f / 24, G = (g) => g / 12;
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a hit, as the page draws it: the world holds one frame, the impact panel on ones, two shakes
const hit = (t, at, kind, amp, strokes, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const PUSH = { overscan: 1.06, zoom: [1, 1.045], ease: "linear" };
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [eye, eye], lookAt: [aim, aim], fov, ...o });
const RAYS = [[0, 0, Math.PI / 4, 3.0, 0.2], [0, 0, (3 * Math.PI) / 4, 3.0, 0.2], [0, 0, (5 * Math.PI) / 4, 3.0, 0.2], [0, 0, (7 * Math.PI) / 4, 3.0, 0.2]];

export default {
  id: "p-epsilon-hollow",
  title: "Tensura, Rimuru: Predator (live play)",
  anime: "That Time I Got Reincarnated as a Slime, 8Bit: the Harvest Festival, Predator, Megiddo",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: INK, set: 0, paint: 0 },
  },
  frame: { ink: INK, lift: [0.0, 0.02] },
  hold: false,
  fps: 12,
  duration: 30.0,
  seed: 3001,
  far: 700,
  plates: true,
  bg: false,
  palette: { ink: INK, paper: P.snow, accent: P.plop },
  seal: {
    at: [0, 0, 0], yaw: SEAL.yaw, scale: SEAL.rimuruScale, hero: look, shadow: false, moves: [],
    track: [
      { t: 9.3, move: "spin", dur: 0.9, turns: 1, hop: 0.2, to: { pose: "hold", expr: "menace" } },
      { t: 9.3, noBlink: 5.2 },
      { t: HIT.wind, set: POSES.wind, dur: 0.3, hold: 0.45, out: 0.1 },
      { t: HIT.strike, set: POSES.strike, dur: 0.1, hold: 0.45, out: 0.2 },
      { t: 13.9, set: { catch: { col: "#ffd37a", glow: 1.6, n: 1 } }, dur: 0.1, hold: 0.6, out: 0.2 },
      { t: 12.0, set: { rim: 1 }, dur: 0.3, hold: 2.4, out: 0.3 },
    ],
  },
  shots: [
    shot(1, [0, 1.0], [1.8, 0.8, 4.8], [0.5, 1.2, -1.2], 42, PUSH),
    shot(2, [1.0, 2.5], [0.4, 1.0, 3.5], [0.15, 1.35, -1.5], 52),
    shot(3, [2.5, 3.4], [-0.8, 0.65, 1.7], [0.05, 0.5, 0], 36),
    shot(4, [3.4, 6.0], [-0.5, 1.05, 3.9], [0.6, 1.5, -1.5], 52),
    shot(5, [6.0, 8.6], [-1.4, 0.7, 2.8], [1.6, 1.7, -1.0], 50),
    shot(6, [8.6, G(111)], [0.5, 0.7, 2.4], [0, 0.55, 0], 40),
    shot(7, [G(111), 10.0], [0.15, 0.7, 3.0], [-0.1, 0.9, 0], 48),
    shot(8, [10.0, G(143)], [-0.9, 1.1, 4.6], [0, 1.7, -2.5], 50),
    shot(9, [G(143), 14.5], [0.15, 0.95, 2.7], [-0.05, 1.0, 0], 34, { menace: { frac: 0.72, dark: 0, calm: 0.25 } }),
    shot(10, [14.5, 15.0], [-1.5, 0.7, 3.2], [0.8, 1.0, -0.6], 50),
    shot(11, [15.0, 18.5], [-0.6, 0.75, 3.0], [0.9, 1.0, -0.4], 46, { overscan: 1.06, zoom: [1, 1.03], ease: "linear" }),
    shot(12, [18.5, 22.6], [0.9, 0.85, 3.4], [0.2, 0.95, -0.3], 44, { overscan: 1.06, zoom: [1, 1.03], ease: "linear" }),
    shot(13, [22.6, 26.8], [0.2, 0.8, 3.2], [0.5, 0.9, -0.2], 42),
    shot(14, [26.8, 30.0], AT.plaqueEye, [1.0, 0.9, 0.0], 44, { ...PUSH, zoom: [1, 1.07] }),
  ],
  beats: [
    rumble(2.0, 3.4, 0.004, 0.008, 5),
    { t: 8.8, name: "gather", dur: HIT.turn - 8.8, at: "seal" },
    ...hit(HIT.plop, "seal", "plop", 0.03, [], 3),
    ...hit(HIT.turn, "seal", "turn", 0.034, [], 3),
    rumble(8.0, 9.2, 0.006, 0.016, 5),
    rumble(10.0, 11.9, 0.006, 0.01, 6),
    shk(10.4, 0.03, 0.3, 8),
    { t: HIT.wind, name: "gather", dur: HIT.punch - HIT.wind, at: "hand" },
    rumble(12.0, 13.4, 0.01, 0.016, 5),
    ...hit(HIT.punch, [0.5, 0.45], "punch", 0.04, RAYS, 4),
    shk(13.9, 0.02, 0.2, 10),
    ...hit(HIT.back, "seal", "back", 0.022, [], 2),
    shk(26.8, 0.02, 0.2, 10),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
