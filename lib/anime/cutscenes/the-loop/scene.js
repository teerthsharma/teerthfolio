// SCENE DATA for the-loop: Anos Voldigoad wakes on the third clean ice loop, drawn the way SILVER LINK. draws a Misfit power beat.
// Pure data over clock.js (the beat times), palette.js (the hex values) and the look (kit/hero/looks/the-loop.js): the numbers live there.
import look, { speak } from "../../kit/hero/looks/the-loop.js";
import { awakeCredit } from "../../../world/awakening.js";
import { DOCK, F, LINE, PLATE as PLATE_T, SEAL, T } from "./clock.js";
import { CARD, CORE, CREAM, FLOOR, INK, LINE as LINE_HEX, MAG, PLATE, ZEN } from "./palette.js";

const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// an impact: the world holds two drawings before the window w, then the two-tone frame on ones with the cast and fx
const impact = (t, seq, cols, w = t) => [
  { t: w - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "impact", seq, cols },
  { t: w, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
];
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const move = (n, t, [e0, e1], [a0, a1], fov, o = {}) => ({ n, t, law: "free", hold: false, moving: true, minFrac: 0.05, eye: [W(e0), W(e1)], lookAt: [W(a0), W(a1)], fov, step: 12, ...o });
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [Math.sin(a) * r, h, Math.cos(a) * r], aim, fov, o);
const stand = (t, [p, yaw] = [[0, 0, 0], SEAL.yaw]) => ({ t: [t - 2e-3, t - 1e-3], to: W(p), yaw });
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });
const CR = awakeCredit();

export default {
  id: "the-loop",
  title: "The Misfit of Demon King Academy, Anos Voldigoad: The Loop (hidden)",
  anime: "The Misfit of Demon King Academy, SILVER LINK.: S1 E1 calm close, S1 E4 summon, S1 E13 Delsgade, S1 E8 the rude awakening",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: LINE_HEX, set: 0, paint: 0 },
  },
  frame: { ink: INK, lift: [0.035, 0.08], box: { ratio: 2.39, slide: 11 } },
  palette: { sky: ZEN, ground: FLOOR, key: CORE, accent: MAG, ink: INK },
  hold: false,
  fps: 12,
  duration: T.end,
  seed: 39,
  far: 1500,
  plates: true,
  bg: false,
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [
      { t: [9.0, 128 / 12], to: W([0, 45, 0]) },
      { t: [128 / 12, T.calm], to: W([0, 60, 0]) },
      stand(T.cut, [[0, 6, 0], 0]),
      { t: [T.cut, T.back], to: W([0, 0, 0]) },
    ],
    track: [
      { t: T.impactA, pose: "loop-power", dur: 0.2, hold: 7.0, out: 0.2 },
      { t: T.impactA, expr: "loop-set", dur: 0.1, hold: 7.0, out: 0.2 },
      { t: T.rise[0], pose: "loop-fly", dur: 0.4, hold: 2.5, out: 0.3 },
      { t: T.calm, expr: "loop-calm", dur: 0.1, hold: 5.4, out: 0.1 },
      ...speak(T.speak[0], T.speak[1]),
      { t: 18.2, expr: "loop-smile", dur: 0.2, hold: 3.3, out: 0.2 },
      { t: T.cut, expr: "loop-calm", dur: 0.05, hold: 0.7, out: 0.05 },
      on(T.impactA, T.calm, { catch: { glow: 1.3 } }),
    ],
  },
  shots: [
    at(1, [0, T.impactA], 0.12, 6.0, 0.55, [0, 0.5, 0], 30, { overscan: 1.05, zoom: [1, 1.03], ease: "linear" }),
    at(2, [T.impactA, 3.0], 0.0, 4.2, 1.0, [0, 0.65, 0], 28, { law: "arc" }),
    at(3, [3.0, 5.0], 0.35, 5.4, 1.0, [0, 1.3, 0], 38, { overscan: 1.12, zoom: [1.1, 1.0], ease: "linear" }),
    at(4, [5.0, T.impactB], 0.3, 4.8, 0.5, [0, 1.6, 0], 40, { law: "arc" }),
    at(5, [T.impactB, T.impactBEnd], 0.0, 2.0, 1.0, [0, 1.2, 0], 22, { ease: "cut" }),
    move(6, [T.impactBEnd, 9.0], [[3.0, 0.9, 5.0], [2.2, 2.4, 4.6]], [[0, 1.3, 0], [0, 1.5, 0]], 40, { law: "arc" }),
    move(7, [9.0, 128 / 12], [[3.0, -1.0, 5.2], [3.0, 44.0, 5.2]], [[0, 1.0, 0], [0, 46.0, 0]], 38),
    move(8, [128 / 12, T.calm], [[0, 44.3, 3.8], [0, 59.3, 3.8]], [[0, 45.96, 0], [0, 60.96, 0]], 30),
    shot(9, [T.calm, 14.9], [-0.6, 61.0, 3.4], [-0.39, 60.915, 0], 28, { law: "kill" }),
    move(10, [14.9, T.card[0]], [[-0.5, 61.2, 3.4], [-0.4, 61.15, 6.0]], [[-0.33, 60.98, 0], [1.1, 61.0, 0]], [28, 24], { hold: false }),
    shot(11, [T.card[0], T.cut], [-0.4, 61.15, 10.0], [1.1, 61.0, 0], 26, { long: false }),
    move(12, [T.cut, 23.0], [[5, 9, 11], [4, 3, 9]], [[0, 5.1, 0], [0, 1, 0]], 58, { law: "kill" }),
    at(13, [23.0, T.end], 0.15, 3.0, 0.6, [0, 0.55, 0], 32, { law: "home", overscan: 1.06, zoom: [1, 1.025], ease: "linear" }),
  ],
  beats: [
    ...impact(PLATE_T[1], [[1, 2]], [PLATE, INK], T.impactA),
    shk(T.impactA, 0.03, 0.2, 9), shk(T.impactAEnd, 0.018, 0.14, 22),
    rumble(2.2, 3.4, 0.004, 0.012, 6),
    ...impact(T.impactB, [[1, 2], [3, 2]], [CREAM, INK]),
    shk(T.impactB, 0.036, 0.2, 9),
    shk(T.sky, 0.02, 0.2, 9), rumble(9.3, 11.6, 0.006, 0.014, 6),
    { t: T.impactA, name: "grade", dur: T.calm - T.impactA, split: { shadow: ZEN, high: CORE, amt: 0.35 }, in: 0.083, out: 0.083 },
    { t: T.back, name: "flat", frames: 2, col: CREAM, bypass: false },
    { t: T.back - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    shk(T.back, 0.022, 0.16, 12),
    { t: T.iris[0], name: "iris", dur: T.iris[1] - T.iris[0], from: 1.4, to: 0, at: "seal", ones: true },
  ],
  bubbles: [{ t: [12.5, 17.0], text: LINE.text, who: "seal", tone: "bar", col: "#e9dfe2" }],
  lines: [],
  sfx: [],
  credit: {
    t: T.card,
    text: `${CR.upstream} contributions · ${CR.merged} merged · ${CR.orgs} orgs\n${CR.lab} projects`,
    sub: CR.results.map((r) => `${r.repo}  ${r.quote}`).join("\n"),
    style: { size: 0.036, subSize: 0.022, y: 0.82, x: 0.5, fade: 0.083, card: { bg: CARD, border: INK, w: 2, radius: 4, pad: "10px 26px" } },
  },
};
