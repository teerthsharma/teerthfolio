// SCENE DATA for p-separatrix: the live fresco as the site draws it, paced by clock.js. Every time is a REAL second from TR, R, TURN or BACK.
// Engine defaults that add glow, grain, cosmos or a grade are off; the seal is the approved Giorno look from the turn to the return.
import look from "../../kit/hero/looks/p-separatrix.js";
import { BACK, DOCK, DURATION, HOLD1, HOLD2, LINE, SEAL, TR, TURN, g24, R } from "./clock.js";
import { LENS } from "./lens.js";
import { GOLD, OCHRE, PLASTER, UMBER } from "./tone.js";

const P = look.poses;
const F = (f) => f / 24;
const ENTER = g24(R(1.3));
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
const hit = (t, at, kind, amp, strokes, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, dutch: 3.44, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, L, o) => shot(n, t, L.eye, L.aim, L.fov, o);
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });
const PUSH = { overscan: 1.06, zoom: [1, 1.04], ease: "linear" };
const MENACE = { frac: 0.7, dark: 0, calm: 0.25 };

export default {
  id: "p-separatrix",
  title: "JoJo, Gold Experience Requiem",
  anime: "JoJo's Bizarre Adventure Part 5, David Production",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, aberration: 0, vignette: 0, paper: PLASTER, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: UMBER, set: 0, paint: 0 },
  },
  frame: { ink: UMBER, lift: [0.008, 0.03] },
  hold: false,
  fps: 24,
  duration: DURATION,
  seed: 5005,
  far: 900,
  plates: true,
  bg: false,
  palette: { plaster: PLASTER, ink: UMBER, gold: GOLD, sinopia: OCHRE, accent: GOLD },
  seal: {
    at: W([0, 0, 0]), yaw: 0, scale: SEAL.scale, hero: look, shadow: false,
    moves: [
      { t: [TR.turn[0], TR.turn[1]], to: W([0, 0, 0]), yaw: SEAL.face },
      { t: [TR.gogogo, g24(TR.gogogo + 0.57)], to: W([0, 0, 0]), yaw: 0 },
    ],
    track: [
      on(TURN + F(2), ENTER, P.sign),
      { t: TURN + F(2), expr: "determined", dur: 0.1, hold: 99 },
      on(TR.jump - F(3), TR.arrow[0] - F(4), P.crouch),
      { t: TR.pierce, expr: "glare", dur: 0.1, hold: 3.0, out: 0.3 },
      on(TR.pierce, TR.turn[0], P.fist),
      on(TR.lastBlow - F(6), TR.lastBlow + F(10), P.point),
      on(g24(16.06), g24(21.0), P.fist),
    ],
  },
  shots: [
    live(1, [0, TURN], LENS.island),
    shot(2, [TURN, ENTER], [1.3, 1.4, 4.0], [0, 1.2, -2.1], 34),
    live(3, [ENTER, TR.kc[0]], LENS.two, { law: "wide" }),
    shot(4, [TR.kc[0], TR.jump], [-2.4, 1.5, 3.4], [2.8, 1.3, -8], 40),
    shot(5, [TR.jump, TR.arrow[0]], [-1.0, 6.5, 9.0], [2.4, 0.5, -7.0], 44),
    shot(6, [TR.arrow[0], TR.pierce], [1.6, 1.1, 2.4], [-0.5, 1.2, 0.9], 34),
    shot(7, [TR.pierce, HOLD1[0]], [1.4, 1.0, 2.2], [-0.4, 1.3, 0.3], 30),
    shot(8, HOLD1, [1.3, 1.4, 4.0], [0, 1.2, -2.1], 34, { menace: MENACE, quiet: false }),
    shot(9, [LINE.B, TR.step[0]], [-1.6, 1.4, 2.6], [3.0, 1.3, -9.0], 40),
    live(10, [TR.step[0], TR.rewind], LENS.two),
    shot(11, [TR.rewind, TR.barrage[0]], [4.5, 5.5, 4.5], [2.8, 0.6, -6.5], 44),
    shot(12, [TR.barrage[0], TR.lastBlow], [-1.0, 1.6, 3.0], [3.4, 1.7, -7.5], 42),
    shot(13, HOLD2, [0.8, 1.4, 4.0], [0.5, 1.2, -2.4], 34, { menace: MENACE, quiet: true }),
    shot(14, [HOLD2[1], TR.tbc[0]], [0.8, 1.0, 3.4], [0.8, 0.9, -8.0], 46),
    shot(15, [TR.tbc[0], BACK], [0.8, 1.0, 3.4], [0.8, 0.9, -8.0], 46, PUSH),
    shot(16, [BACK, TR.island], [1.2, 0.55, 2.4], [0, 0.45, 0], 36),
    live(17, [TR.island, DURATION], LENS.home),
  ],
  beats: [
    ...hit(TURN, "seal", "turn", 0.03, [[0.4, 0.35, 0.5, 3.0, 0.2]], 3),
    { t: TURN, name: "impact", seq: [[1, 3]], cols: [GOLD, UMBER] },
    rumble(TR.erase[0], TR.erase[1], 0.006, 0.012, 7), shk(TR.jump, 0.02, 0.2, 9),
    ...hit(TR.pierce, "slit", "pierce", 0.03, [[-0.6, 0.2, 0.4, 2.8, 0.12]], 3),
    { t: TR.pierce, name: "impact", seq: [[1, 3]], cols: [GOLD, UMBER] },
    rumble(TR.rise[0], TR.rise[1], 0.004, 0.012, 6), shk(TR.don, 0.02, 0.24, 8),
    rumble(TR.wipe[0], TR.wipe[1], 0.006, 0.014, 5), shk(TR.rewind, 0.012, 0.2, 8),
    rumble(TR.barrage[0], TR.barrage[1], 0.016, 0.03, 8),
    { t: TR.barrage[0], name: "ones", dur: 1.4, layers: ["world", "cast", "fx"] },
    ...hit(TR.lastBlow, "dv", "last", 0.04, [[-1.2, 0.1, 0.6, 3.4, 0.2], [0.4, -0.2, -0.5, 2.8, 0.1]], 3),
    shk(TR.lastBlow + 0.5, 0.03, 0.2, 9),
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] }, shk(BACK, 0.014, 0.16, 12),
    shk(TR.island, 0.01, 0.2, 9),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
