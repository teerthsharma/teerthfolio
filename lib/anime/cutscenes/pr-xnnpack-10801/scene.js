// SCENE DATA for pr-xnnpack-10801 (Bleach, Aizen: Illusion Broken): the live cutscene's clock, lenses and beats (clock.js, from the live jsx
// and livecam), drawn as a manga page. Every engine pass that adds colour, haze, glow or a grade is off. The seal is the approved look in its
// own colours from the turn, printed in the page's ink until the break; then the pale playable pup lands on the island.
import look from "../../kit/hero/looks/pr-xnnpack-10801.js";
import { BACK, F, FOV, G, HIT, ICHIGO, INK_ON, LENS, LENS_FOV, LINE, SEAL, SEAT, TURN, TURN_T, W, liftAt } from "./clock.js";
import { BLACK } from "./tone.js";

const INK = "#080a0f", PAPER = "#f4f4f0", BLUE = "#5fb6ff";
const SEATED = [0, SEAT + 1.0, 0], CHEST = [0, SEAT + 1.2, 0];
const band = (a) => Math.min(0.04, Math.max(0.02, a)); // every shake sits in the page's band
const shk = (t, a, tau = 0.18, hz = 10) => ({ t, name: "shake", amp: band(a), tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: band(a0 + ((a1 - a0) * i) / (n - 1)) })) });
// a hit as the page draws it: the world holds two frames, one frame in negative, the impact panel on ones, then the shake
const hit = (t, at, kind, a, strokes, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes },
  shk(t, a, 0.22, 9), shk(t + F(n), a * 0.6, 0.14, 22),
];
// the site's shots: a free camera held over its own interval; `live` is the lens livecam measured, `at` a camera on the rig's ring
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, lens, o = {}) => { const [eye, f] = LENS[lens]; return shot(n, t, eye, eye.map((v, i) => v + 30 * f[i]), LENS_FOV[lens] ?? FOV, o); };
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [Math.sin(a) * r, h, Math.cos(a) * r], aim, fov, o);
// a channel held over [t0, t1): `key` is pose or expr, the envelope is the seal's own (dur in, hold, out)
const chan = (key, name, t0, t1) => ({ t: t0 - 0.02, [key]: name, dur: 0.01, hold: t1 - t0, out: 0.01 });

// the seal's height on the throne, sampled on the 12 grid from the rise (real 2.9 s) and on the 24 grid through the break
const lift = [];
for (let g = 36; g <= 50; g++) lift.push({ t: [G(g - 1), G(g)], to: W([0, liftAt(G(g)), 0]) });
for (let f = 403; f <= 421; f += 2) lift.push({ t: [F(f - 2), F(f)], to: W([0, liftAt(F(f)), 0]) });

export default {
  id: "pr-xnnpack-10801",
  title: "Bleach, Aizen: Illusion Broken",
  anime: "Bleach: Thousand-Year Blood War, Aizen, Kyoka Suigetsu",
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
  duration: 29.25,
  seed: 10801,
  far: 1500,
  plates: true,
  bg: false,
  palette: { paper: PAPER, ink: INK, accent: BLUE },
  seal: {
    at: W([0, 0, 0]), yaw: TURN + SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: lift,
    track: [
      chan("pose", "aizen-sit", 4.17, HIT.snap - 0.65),
      chan("pose", "aizen-look", 12.0, G(167)),
      chan("pose", "aizen-sweep", 15.476, HIT.brk),
      chan("expr", "aizen-calm", TURN_T, 13.0),
      chan("expr", "aizen-smile", 13.0, BACK),
    ],
  },
  shots: [
    live(1, [0, 1.0], "island"),
    live(2, [1.0, TURN_T], "island"),
    at(3, [TURN_T, INK_ON], 0.35, 3.4, 0.8, [0, 0.9, 0], 40),
    live(4, [INK_ON, 3.75], "dimWide"),
    at(5, [3.75, 4.5], 0.15, 4.6, 0.4, SEATED, 44),
    at(6, [4.5, 6.0], 0.3, 4.8, SEAT + 0.7, [0, SEAT + 0.6, 0], 38),
    live(7, [6.0, G(83)], "lineA"),
    shot(8, [G(83), HIT.crack], ICHIGO.map((v, i) => v + [1.2, 0.6, 1.4][i]), SEATED, 46),
    at(9, [HIT.crack, 9.0], -0.2, 4.2, SEAT + 0.6, SEATED, 42),
    live(10, [9.0, G(122)], "mend"),
    live(11, [G(122), 12.0], "lineB"),
    at(12, [12.0, G(167)], 0.45, 2.4, SEAT + 0.95, CHEST, 36),
    live(13, [G(167), G(183)], "lineB", { zoom: [1, 1.06], ease: "linear" }),
    at(14, [G(183), HIT.brk], 0.25, 2.5, SEAT + 1.0, [0, SEAT + 1.2, 0], 34, { menace: { frac: 0.75, dark: 0, calm: 0.25 }, quiet: true }),
    at(15, [HIT.brk, G(215)], 0.2, 5.0, 2.2, [0, 2.0, 0], 46),
    at(16, [G(215), LINE.credit], 0.3, 3.0, 0.6, [0, 0.55, 0], 40),
    live(17, [LINE.credit, 29.25], "credit"),
  ],
  beats: [
    rumble(3.0, 4.15, 0.008, 0.02, 6), shk(G(50), 0.022),
    ...hit(HIT.crack, [0.3, 0.72], "crack", 0.034, [[-0.6, 0.4, -0.5, 3.0, 0.18]], 3),
    rumble(13.93, 15.25, 0.006, 0.016, 6),
    { t: 15.25, name: "gather", dur: HIT.snap - 15.25, at: "hand" },
    ...hit(HIT.snap, "hand", "snap", 0.036, [[1.2, 0.5, 0.6, 3.6, 0.22]], 3),
    { t: HIT.brk, name: "invert", dur: F(1) },
    ...hit(HIT.brk, [0.5, 0.5], "break", 0.04, [[0, 0, 0.8, 4.2, 0.26]], 2),
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] }, shk(BACK, 0.022, 0.16, 12),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
