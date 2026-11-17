// SCENE DATA for pr-triton-kernels-22: Sukuna's Malevolent Shrine as the live cutscene draws it, a manga page; every engine pass that adds
// colour, haze, glow or a grade is off. The clock and the wides are the site's (clock.js); between them the engine cuts to the seal, large, in ink.
import look from "../../kit/hero/looks/sukuna.js";
import { BACK, DOCK, FOV, HIT, LENS, LINE, SEAL, STAND } from "./clock.js";
import { BLACK } from "./tone.js";

const INK = "#0e0b0d", PAPER = "#ece5d2", RED = "#cc0a17", P = look.poses;
const F = (f) => f / 24, G = (g) => g / 12; // a time on the 24 grid; on the 12 grid, where the seal is redrawn (a cut that moves it lands there)
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a hit, as the page draws it: the world holds its breath, one frame of the picture in negative, the impact panels on ones, the shake
const hit = (t, at, kind, amp, strokes, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, [eye, f], o) => shot(n, t, eye, eye.map((v, i) => v + 30 * f[i]), FOV, o);
// a camera `r` m from the dock at world azimuth `a` (0 = +z; the seal faces 0.6), `h` m up, aimed at a rig point
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [Math.sin(a) * r, h, Math.cos(a) * r], aim, fov, o);
const PUSH = { overscan: 1.06, zoom: [1, 1.045], ease: "linear" };
const TWO = [[0.4, 1.2, 3.98], [1.6, 1.1, -0.8], 44], HOME = [[0.6, 0.5, 6.2], [3.1, 0.4, -11.62], 42];
// the seal's place and turn from a cut on (it is redrawn on the cut's own drawing), and a channel set held over the drawings of [t0, t1)
const stand = (t, [p, yaw] = [[0, 0, 0], SEAL.yaw]) => ({ t: [t - 2e-3, t - 1e-3], to: W(p), yaw });
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });
const lit = (t0, t1) => on(t0, t1, { catch: { glow: 1.3 } }); // in a wide the eyes' red is printed larger

export default {
  id: "pr-triton-kernels-22",
  title: "Jujutsu Kaisen, Sukuna: Malevolent Shrine (PROTECTED)",
  anime: "Jujutsu Kaisen, MAPPA: Shibuya Incident, Malevolent Shrine, Dismantle and Cleave",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paper: PAPER, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: BLACK, set: 0, paint: 0 },
  },
  frame: { ink: BLACK, lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: 29.3,
  seed: 2201,
  far: 1500,
  plates: true,
  bg: false,
  palette: { paper: PAPER, ink: INK, red: RED, accent: RED },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [
      stand(G(23), STAND.a), stand(G(33)), stand(G(50), STAND.a), stand(7.0), stand(LINE.B, STAND.b), stand(G(115)), stand(G(140), STAND.b2), stand(G(162)),
      stand(G(182), STAND.b2), stand(G(191)), stand(F(395), STAND.back), stand(G(203)),
    ],
    track: [
      on(0.5, G(85), P.sign),
      { t: 1.15, expr: "menace", dur: 0.1, hold: 6.0, out: 0.2 },
      on(G(85), HIT.rel, P.cock), on(HIT.rel, G(105), P.flick), on(G(105), G(107), P.cock), on(G(107), G(114), P.flick),
      { t: 8.0, expr: "grin", dur: 0.1, hold: 7.3, out: 0.3 },
      on(G(117), HIT.clv, P.cock), on(HIT.clv, 11.5, P.flick),
      on(11.5, G(191), P.sign),
      on(G(191), HIT.last, P.cock), on(HIT.last, 16.75, P.flick),
      { t: 16.75, pose: "hands-in-pockets", dur: 0.2, hold: 1.0, out: 0.25 },
      { t: 15.4, expr: "smirk", dur: 0.2, hold: 2.4, out: 0.2 },
      on(HIT.hvy, HIT.hvy + 0.42, { catch: { glow: 1.9 } }), lit(G(23), G(33)), lit(G(50), 7.0), lit(LINE.B, G(115)), lit(G(140), G(162)), lit(G(182), G(191)), lit(F(395), G(203)),
    ],
  },
  shots: [
    shot(1, [0, G(14)], [2.3, 0.6, 5.4], [0.45, 0.95, 0], 40, PUSH),
    at(2, [G(14), G(23)], 0.42, 3.9, 0.45, [-2.11, 1.5, -1.17], 46),
    live(3, [G(23), G(33)], LENS.a, { law: "wide" }),
    at(4, [G(33), G(50)], 0.2, 3.4, 0.5, [1.5, 1.6, -3.2], 42, PUSH),
    live(5, [G(50), 7.0], LENS.a, { law: "wide", overscan: 1.05, zoom: [1, 1.035], ease: "linear" }),
    shot(6, [7.0, LINE.B], ...TWO, { law: "arc" }),
    live(7, [LINE.B, G(115)], LENS.b, { law: "kill" }),
    shot(8, [G(115), G(140)], ...TWO),
    live(9, [G(140), G(162)], LENS.b2, { law: "kill" }),
    at(10, [G(162), G(182)], 0.3, 2.6, 0.9, [-0.1, 1.2, -2.16], 34, { menace: { frac: 0.6, dark: 0, calm: 0.25 }, quiet: true }),
    live(11, [G(182), G(191)], LENS.b3, { law: "kill" }),
    at(12, [G(191), F(395)], 0.12, 3.0, 0.55, [0.95, 1.2, -2.2], 40, { quiet: true }),
    live(13, [F(395), G(203)], LENS.back, { law: "kill" }),
    at(14, [G(203), 18.0], 0.5, 4.6, 0.75, [0.82, 1.25, -1.8], 42, { quiet: true, ...PUSH }),
    live(15, [18.0, 20.5], LENS.c, { law: "home", overscan: 1.08, zoom: [1, 1.03], ease: "linear" }),
    shot(16, [20.5, 24.0], ...HOME, { law: "home", overscan: 1.06, zoom: [1, 1.02], ease: "linear" }),
    shot(17, [24.0, 29.3], ...HOME, { law: "home", overscan: 1.06, zoom: [1.02, 1.035], ease: "linear" }),
  ],
  beats: [
    shk(G(14), 0.03, 0.2, 9),
    rumble(2.0, 3.8, 0.005, 0.012, 7), shk(3.9, 0.026, 0.26, 8), shk(4.15, 0.012, 0.2, 8), { t: F(94), name: "gather", dur: F(6), at: "mouth", rev: true },
    rumble(7.0, 8.0, 0.004, 0.014, 6), { t: 7.0, name: "gather", dur: HIT.rel - 7.0, at: "hand" },
    ...hit(HIT.rel, "hand", "release", 0.034, [[1.5, 0.35, 0.5, 3.4, 0.2], [0.6, -0.2, -0.75, 2.6, 0.1]]),
    rumble(8.6, 9.6, 0.012, 0.012, 4),
    { t: G(115), name: "gather", dur: HIT.clv - G(115), at: "tri" },
    ...hit(HIT.clv, "tri", "cleave", 0.036, [[0, 0.1, 0.72, 3.2, 0.2], [0.1, -0.1, -0.5, 2.4, 0.08]], 4),
    rumble(11.0, 13.0, 0.012, 0.008, 6),
    ...hit(HIT.hvy, [0.74, 0.36], "heavy", 0.034, [[-0.85, -0.1, -0.5, 4.4, 0.24]]),
    shk(15.2, 0.024, 0.2, 9),
    rumble(G(191), 16.25, 0.004, 0.012, 4), { t: G(191), name: "gather", dur: HIT.last - G(191), at: "hand" },
    ...hit(HIT.last, "hand", "last", 0.04, [[1.66, -1.02, -0.55, 3.9, 0.26]], 3),
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] }, shk(BACK, 0.022, 0.16, 12),
    shk(18.0, 0.02, 0.2, 10),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
