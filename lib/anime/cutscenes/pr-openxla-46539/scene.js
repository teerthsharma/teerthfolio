// SCENE DATA for pr-openxla-46539: All Might's UNITED STATES OF SMASH as the live site plays it (My Hero Academia, a golden-age comic page).
// Pure data: the live clock and lens come from clock.js (measured on the site), the seal's look from the approved kit. Every engine pass that
// would add colour, haze, glow or a grade is off here; the balloons and the lettering are the page layer (fx/page.js, fx/screen.js).
import look from "../../kit/hero/looks/pr-openxla-46539.js";
import { BRK, DASH_TO, DOCK, FOV, FRZ, HIT, LAW, LENS, SEAL, STAND, G } from "./clock.js";
import { BLACK } from "./tone.js";

const INK = "#120E1A", PAPER = "#F7F0DB", YEL = "#FFE31A", MAG = "#ED2A8A";
const P = look.poses;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const ORIGIN = [[0, 0, 0], SEAL.yaw];
const LAYERS = ["world", "cast", "fx"];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a camera: the live lens (rig frame, measured), from and to when it moves; aimed 30 m along its forward
const fromTo = (L) => {
  const two = Array.isArray(L[0][0]), E = two ? L[0] : [L[0], L[0]], Fw = two ? L[1] : [L[1], L[1]];
  return { eye: E.map(W), lookAt: E.map((e, i) => W(e.map((v, k) => v + 30 * Fw[i][k]))) };
};
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, L, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, fov: FOV, ...fromTo(L), ...o });
// a held close shot at azimuth a (0 = +z), r m from the seal, h m up, aimed at a rig point
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [Math.sin(a) * r, h, Math.cos(a) * r], aim, fov, o);
// the seal's place: a teleport 1 to 2 ms before a cut, so it is redrawn on the cut's own drawing
const stand = (t, [p, yaw]) => ({ t: [t - 2e-3, t - 1e-3], to: W(p), yaw });
const pose = (t0, name, dur, hold, out) => ({ t: t0, pose: name, dur, hold, out });
const DASH_YAW = STAND.w[1] + 2.45;
const DASH_BASE = STAND.w[0];

export default {
  id: "pr-openxla-46539",
  title: "My Hero Academia, All Might: United States of SMASH (openxla #46539)",
  anime: "My Hero Academia, All Might's UNITED STATES OF SMASH against a Nomu, in a golden-age comic",
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
  duration: LAW.duration,
  seed: 46539,
  far: 1500,
  plates: true,
  bg: false,
  palette: { paper: PAPER, ink: INK, c: "#009EE0", m: MAG, y: YEL, accent: MAG },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [
      stand(G(23), STAND.w), stand(G(92), ORIGIN), stand(G(108), STAND.w),
      // the Detroit Smash: from the stand to the Nomu and back to the stand (the dash target keeps the live impact point)
      { t: [9.75, 9.9], to: W(DASH_BASE), yaw: DASH_YAW },
      { t: [9.9, 10.5], to: W([DASH_TO[0], 0, DASH_TO[1]]), yaw: DASH_YAW },
      { t: [10.7, 11.4], to: W(DASH_BASE), yaw: DASH_YAW },
      { t: [11.4, 11.6], to: W(DASH_BASE), yaw: STAND.w[1] },
      stand(G(137), STAND.w2), stand(G(147), ORIGIN), stand(G(161), STAND.w2), stand(G(169), ORIGIN), stand(15.6, STAND.w3), stand(G(233), ORIGIN),
    ],
    track: [
      { t: 1.15, expr: "hero_grin", dur: 0.1, hold: 16.35, out: 0.2 },
      pose(7.7, "cock", 0.8, 0.9, 0.25),
      pose(9.4, "crouch", 0.35, 0.05, 0.1),
      pose(9.8, "smash", 0.1, 0.6, 0.1),
      pose(10.5, "usfist", 0.2, 0.9, 0.5),
      pose(12.9, "cock", 0.5, 1.0, 0.2),
      pose(13.4, "crouch", 0.4, 0.5, 0.1),
      pose(14.4, "usfist", 0.12, 2.6, 0.8),
    ],
  },
  shots: [
    live(1, [0, G(14)], LENS.arr0),
    live(2, [G(14), G(23)], LENS.land),
    live(3, [G(23), G(92)], LENS.w, { law: "wide" }),
    at(4, [G(92), G(108)], 0.4, 2.6, 0.7, [-0.1, 0.8, 0], 38),
    live(5, [G(108), G(113)], LENS.w, { law: "wide" }),
    live(6, [G(113), 10.5], LENS.dash, { law: "kill" }),
    live(7, [10.5, G(137)], LENS.dash2, { law: "kill" }),
    live(8, [G(137), G(147)], LENS.w2),
    at(9, [G(147), G(161)], 0.25, 3.2, 0.55, [-0.4, 1.1, -1.0], 40),
    live(10, [G(161), G(169)], LENS.w2),
    live(11, [G(169), 15.6], LENS.pull, { law: "kill", menace: { frac: 0.6, dark: 0, calm: 0.25 } }),
    live(12, [15.6, G(233)], LENS.w3),
    live(13, [G(233), LAW.duration], LENS.home, { law: "home" }),
  ],
  beats: [
    shk(2.1, 0.012, 0.18, 10), shk(2.5, 0.01, 0.18, 10),
    rumble(7.0, 9.4, 0.004, 0.014, 6),
    // the Detroit Smash's impact: two drawings on twos (white, then yellow on ink), the world holds for one drawing
    { t: HIT, name: "freeze", dur: FRZ, layers: ["cast"] },
    { t: HIT, name: "ones", dur: 0.5, layers: LAYERS },
    { t: HIT, name: "flat", frames: 2, col: "#FFF4E4" },
    { t: HIT + 2 / 24, name: "impact", seq: [[1, 2], [3, 2]], cols: [YEL, INK] },
    shk(HIT, 0.04, 0.22, 12), shk(HIT + 1 / 6, 0.03, 0.14, 22), shk(HIT + 2 / 6, 0.02, 0.1, 22),
    { t: HIT + 1 / 6, name: "shake", amp: 0.04, tau: 0.5, hz: 8 },
    // the screen punch: an impact in magenta and yellow, the held frame, the crack's shake on its own steps
    { t: LAW.lineC, name: "ones", dur: 0.5, layers: LAYERS },
    { t: LAW.lineC, name: "impact", seq: [[2, 1], [1, 1]], cols: [MAG, YEL] },
    { t: LAW.lineC, name: "shake", tau: 0.16, hz: 10, schedule: [0.04, 0.034, 0.026, 0.018, 0.01].map((amp, k) => ({ t: LAW.lineC + 0.17 * k, amp })) },
    shk(BRK, 0.025, 0.2, 9),
    { t: BRK, name: "ones", dur: 1.1, layers: LAYERS },
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
