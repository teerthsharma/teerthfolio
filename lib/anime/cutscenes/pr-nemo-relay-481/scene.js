// SCENE DATA for pr-nemo-relay-481: the live Ultra Instinct cutscene as data; every engine pass that adds colour, haze, glow or a grade is off.
import base, { black, grey } from "../../kit/hero/looks/pr-nemo-relay-481.js";
import { BACK, DOCK, ORB, SEAL, passReal } from "./clock.js";
import { dodgeMoves, dodgeTrack } from "./cast/character.js";
import { FOV, LENS, STAND } from "./lens.js";

const INK = "#0a0a1e", ALL = ["world", "cast", "fx"];
const F = (f) => f / 24;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, [eye, f], o) => shot(n, t, eye, eye.map((v, i) => v + 30 * f[i]), FOV, o);
// a camera `r` m from the stand at azimuth `a`, `h` up, aimed at a rig-frame point
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [STAND[0] + Math.sin(a) * r, h, STAND[2] + Math.cos(a) * r], aim, fov, o);

const orbBeats = Array.from({ length: ORB.n }, (_, i) => {
  const p = passReal(i), out = [shk(p, [0.022, 0.024, 0.022, 0.03, 0.024, 0.026, 0.028, 0.026, 0.034][i], 0.16, 12), { t: p, name: "ones", dur: 0.25, layers: ALL }];
  if (i % 3 === 2) out.push({ t: p, name: "impact", seq: [[1, 1]], cols: [ORB.colors[i], INK] }, { t: p - F(2), name: "freeze", dur: F(2), layers: ["world"] });
  return out;
}).flat();

export default {
  id: "pr-nemo-relay-481",
  title: "Dragon Ball Super, Ultra Instinct (Tournament of Power)",
  anime: "Dragon Ball Super, Toei: Tournament of Power, Ultra Instinct",
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
  duration: 25.8,
  seed: 481,
  far: 1500,
  plates: true,
  bg: false,
  palette: { ink: INK, accent: "#6f7fe0", violet: "#a46bff" },
  seal: {
    at: W(STAND), yaw: SEAL.yaw, scale: SEAL.scale, hero: { ...black, variants: { black, grey, silver: base } }, shadow: false,
    moves: dodgeMoves(W(STAND)),
    track: [
      { t: 1.15, expr: "calmCut", dur: 0.1, hold: 2.0, out: 0.2 },
      { t: 1.9, pose: "crouch", dur: 0.4, hold: 0.8, out: 0.25, k: 0.4 },
      { t: 2.85, form: "grey" }, { t: 3.0, form: "silver" },
      { t: 3.0, set: { catch: { col: "#e8f0ff", glow: 2.5, n: 2 }, whisker: 1 }, dur: 0.1, hold: 15.6 },
      { t: 3.2, pose: "uiGuard", dur: 0.25, hold: 15.4 },
      { t: 3.45, expr: "shut", dur: 0.1, hold: 15.3 }, { t: 3.45, noBlink: 15.5 },
      ...dodgeTrack(),
      { t: 18.6, form: "grey" }, { t: 18.7, form: "silver" }, { t: 18.78, form: "black" },
      { t: 18.7, pose: "crouch", dur: 0.1, hold: 0.3, k: 0.85 },
    ],
  },
  shots: [
    live(1, [0, 1.15], LENS.island),
    live(2, [1.15, 1.95], LENS.bloom),
    live(3, [1.95, 2.7], LENS.a),
    at(4, [2.7, 3.55], 0.25, 2.5, 0.45, [0, 1.1, 1.6], 34),
    live(5, [3.55, 5.0], LENS.a, { overscan: 1.05, zoom: [1, 1.035], ease: "linear" }),
    at(6, [5.0, 7.0], 0.55, 3.3, 0.9, [0, 1.0, 1.6], 36),
    live(7, [7.0, 8.1], LENS.a),
    live(8, [8.1, 11.9], LENS.b),
    at(9, [11.9, 13.5], 0.3, 2.4, 0.9, [-0.1, 1.2, 1.6], 34, { menace: { frac: 0.6, dark: 0, calm: 0.25 } }),
    live(10, [13.5, 16.0], LENS.c),
    at(11, [16.0, 18.6], 0.2, 4.5, 1.4, [0.4, 1.2, 0.2], 40),
    at(12, [18.6, 18.9], 0.1, 1.9, 0.7, [0, 1.25, 1.6], 30),
    live(13, [18.9, 20.8], LENS.spent),
    live(14, [20.8, 22.2], LENS.credit),
    live(15, [22.2, 25.0], LENS.credit, { overscan: 1.06, zoom: [1, 1.03], ease: "linear" }),
    live(16, [25.0, 25.8], LENS.home),
  ],
  beats: [
    shk(1.15, 0.03, 0.2, 9),
    rumble(1.9, 2.7, 0.004, 0.012, 5),
    { t: 2.7 - F(2), name: "freeze", dur: F(2), layers: ["world"] },
    { t: 2.7, name: "ones", dur: 0.5, layers: ALL },
    shk(2.7, 0.035, 0.22, 9), shk(2.95, 0.02, 0.16, 12),
    { t: 2.7, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5, 0.5], strength: 1, col: "#f7f5ff", spokes: 160, taper: 1 },
    { t: 2.7, name: "impact", seq: [[1, 1], [3, 1]], cols: ["#f7f5ff", INK] },
    rumble(3.2, 5.0, 0.006, 0.012, 6),
    ...orbBeats,
    shk(18.6, 0.012, 0.15, 14),
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ALL }, shk(BACK, 0.02, 0.16, 12),
    shk(19.1, 0.008, 0.12, 14),
    { t: 20.8 - F(2), name: "freeze", dur: F(2), layers: ["world"] },
    { t: 20.8, name: "ones", dur: 0.5, layers: ALL },
    shk(20.8, 0.04, 0.24, 9), shk(21.0, 0.03, 0.2, 10),
    { t: 20.8, name: "impact", seq: [[1, 1], [3, 1]], cols: ["#e5363a", INK] },
    rumble(21.2, 22.6, 0.012, 0.02, 5),
    shk(25.0, 0.035, 0.07, 9), shk(25.25, 0.02, 0.025, 10),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
