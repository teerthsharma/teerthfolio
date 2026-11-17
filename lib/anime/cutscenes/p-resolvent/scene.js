// SCENE DATA for p-resolvent (Frieren): the live courtyard as the deployed move draws it, on the live clock, with the lenses measured on the
// site. The pale playable seal opens and closes the cutscene; the Frieren character stands in it between the turn and the gold star.
import look from "../../kit/hero/looks/p-resolvent.js";
import { BACK, DOCK, HIT, HOLD, IMPACT, R, SEAL, STAND, realAt } from "./clock.js";
import { LENS } from "./lens.js";

const INK = "#4a2e2e", ACCENT = "#e0a043", CREAM = "#fbfaf7", GOLD = "#f3c04e";
const F = (f) => f / 24;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
const hit = (t, at, kind, amp, strokes, n = 3) => [
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const PUSH = { overscan: 1.06, zoom: [1, 1.04], ease: "linear" };
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const lens = (n, t, k, o = {}) => shot(n, t, LENS[k].eye, LENS[k].aim, LENS[k].fov, o);
const seat = (t, yaw, p = [0, 0, 0]) => ({ t: [t - 2e-3, t - 1e-3], to: W(p), yaw });

const SHOTS = [
  lens(1, [0, 1.0], "island"),
  lens(2, [1.0, 2.0], "pull"),
  lens(3, [2.0, 3.0], "pull"),
  lens(4, [3.0, 3.833], "two", { law: "wide" }),
  shot(5, [3.833, 5.333], [2.6, 1.0, 3.6], [1.1, 1.7, -1.2], 42),
  lens(6, [5.333, 7.0], "two", { law: "wide", ...PUSH }),
  shot(7, [7.0, 7.45], [2.0, 0.8, 2.6], [0, 0.9, 0], 34),
  lens(8, [7.45, 10.0], "two2", { law: "wide" }),
  shot(9, [10.0, F(273)], [2.7, 0.9, 3.2], [0.2, 1.0, 0], 36, { law: "kill" }),
  shot(10, [HOLD[0], HOLD[1]], [-1.6, 1.3, 2.5], [0.3, 1.25, 0], 34, { menace: { frac: 0.6, dark: 0, calm: 0.25 } }),
  lens(11, [HOLD[1], 14.458], "push"),
  lens(12, [14.458, F(368)], "kneel"),
  shot(13, [F(368), F(394)], [2.5, 0.9, 3.0], [0.3, 1.0, 0], 36, { law: "kill" }),
  lens(14, [F(394), BACK], "cracks"),
  lens(15, [BACK, 21.375], "home", { law: "home" }),
  lens(16, [21.375, 23.05], "credit", { law: "home" }),
  lens(17, [23.05, 27.35], "credit", { law: "home" }),
  lens(18, [27.35, 29.85], "end", { law: "home" }),
];

// the character's yaw turns on each cut that moves it (a teleport 1 to 2 ms before the cut, so it is redrawn on the cut's own drawing)
const YAWS = { 3: SEAL.wide, 4: SEAL.wide, 5: SEAL.close, 6: SEAL.wide, 7: SEAL.close, 8: SEAL.wide, 9: SEAL.close, 10: SEAL.hold, 11: SEAL.wide, 12: SEAL.wide, 13: SEAL.close, 14: SEAL.wide, 15: SEAL.home };
const MOVES = SHOTS.filter((s) => YAWS[s.n] !== undefined).map((s) => seat(s.t[0], YAWS[s.n], STAND[s.n]));

const RELEASE_STROKES = [[0.0, -0.2, 1.57, 4.4, 0.24]];
const SHATTER_STROKES = [[0.2, 0.2, -0.75, 4.4, 0.26], [0.3, 0.1, 0.9, 3.4, 0.18]];

export default {
  id: "p-resolvent",
  title: "Sousou no Frieren, Aura's Scale of Obedience",
  anime: "Sousou no Frieren (Madhouse), the judgement on the Scale of Obedience",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: INK, px: 1.5, inkMix: 1, set: 0, paint: 0 },
  },
  frame: { ink: "#1c1228", lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: 29.85,
  seed: 6101,
  far: 1500,
  plates: true,
  bg: false,
  palette: { ink: INK, accent: ACCENT, cream: CREAM, gold: GOLD },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.wide, scale: SEAL.scale, hero: look, shadow: false,
    moves: MOVES,
    track: [
      { t: IMPACT, expr: "frieren", dur: 0.1, hold: 27.0, out: 0.2 },
      { t: realAt(2.7), pose: "fist", dur: 0.3, hold: realAt(6.1) - realAt(2.7), out: 0.3 },
      { t: R.gather, expr: "fr-steady", dur: 0.2, hold: R.release - R.gather, out: 0.2 },
      { t: R.gather, pose: "crouch", dur: 0.5, hold: R.release - R.gather - 0.7, out: 0.2, k: 0.8 },
      { t: R.release, pose: "raise", dur: 0.3, hold: realAt(9.6) - R.release, out: 0.4 },
      { t: R.flex, pose: "fist", dur: 0.3, hold: BACK - R.flex - 0.6, out: 0.3 },
      { t: R.release - 0.05, set: { rim: 1, catch: { col: "#ffe9b8", glow: 1.6, n: 2 }, noBlink: true }, dur: 0.15, hold: HOLD[1] - R.release + 0.6, out: 0.4 },
    ],
  },
  shots: SHOTS,
  beats: [
    shk(IMPACT, 0.03, 0.2, 9),
    rumble(R.ignite[0], R.gather, 0.003, 0.008, 6),
    rumble(R.gather, HIT.rel, 0.004, 0.014, 8),
    { t: R.release - 0.8, name: "gather", dur: 0.8, at: "seal" },
    ...hit(HIT.rel, "seal", "release", 0.04, RELEASE_STROKES, 2),
    { t: HIT.brk - F(2), name: "freeze", dur: F(2), layers: ["world", "cast"] },
    { t: HIT.brk - 0.5, name: "gather", dur: 0.5, at: "scale" },
    ...hit(HIT.brk, "scale", "shatter", 0.04, SHATTER_STROKES, 3),
    rumble(R.kneel, R.kneel + 0.8, 0.010, 0.006, 3),
    shk(R.word[0], 0.02, 0.16, 10),
    rumble(R.crack[0], R.dis[1], 0.004, 0.012, 8),
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    shk(BACK, 0.022, 0.16, 12),
    shk(R.wipe[0], 0.012, 0.2, 10),
    shk(R.collapse, 0.018, 0.2, 10),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
