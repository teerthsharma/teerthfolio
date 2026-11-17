// SCENE DATA for pr-polychrom-79 (Fate/strange Fake, Gilgamesh: Gate of Babylon): the live title card on its own clock (clock.js), 17 shots, and each hit as a gold ripple-portal panel.
// Every engine pass that adds colour, haze, glow or a grade is off; the stage prints its crimson from the sky dome (live/set.js), so no light or grade is added on top.
import look, { red } from "./look.js";
import { BACK, F, G, HIT, LENS, LINE, RIM, SEAL, T, TURN, W } from "./clock.js";
import { PAL } from "./pal.js";

const INK = PAL.sil, P = look.poses;
const C = (az, r, h) => [Math.sin(az) * r, h, Math.cos(az) * r];
const shk = (t, amp, tau = 0.2, hz = 10) => ({ t, name: "shake", amp, tau, hz });
// a rumble under a build-up: one impulse per 12 grid frame, amp ramping a0 to a1
const rumble = (t0, t1, a0, a1) => {
  const n = Math.max(2, Math.round((t1 - t0) * 12));
  return { t: t0, name: "shake", tau: 0.1, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + i / 12, amp: a0 + ((a1 - a0) * i) / (n - 1) })) };
};
// a hit as the page draws it: the world freezes two frames before, the picture takes one panel of `n` frames on ones, two shakes
const hit = (t, at, kind, amp, strokes = [], n = 3, s2 = F(n), fill = true) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes, fill },
  shk(t, amp, 0.22, 9), shk(t + s2, Math.max(0.02, amp * 0.6), 0.14, 22),
];
const shot = (n, t, eye, aim, fov, o = {}) => {
  const [e0, e1] = Array.isArray(eye[0]) ? eye : [eye, eye];
  const [a0, a1] = Array.isArray(aim[0]) ? aim : [aim, aim];
  return { n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(e0), W(e1)], lookAt: [W(a0), W(a1)], fov, ...o };
};
const cam = (n, t, az, r, h, aim, fov, o) => shot(n, t, C(az, r, h), aim, fov, o);
// a channel set held over [t0, t1), as the live's eyes and catchlight
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });
const flush = (t) => on(t, t + F(3), { catch: { col: PAL.eyeHi, glow: 0 } });

export default {
  id: "pr-polychrom-79",
  title: "Fate/strange Fake, Gilgamesh: Gate of Babylon (PROTECTED)",
  anime: "Fate/strange Fake, Gilgamesh, Gate of Babylon, Enuma Elish",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paper: PAL.crimson, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: INK, set: 0, paint: 0 },
  },
  frame: { ink: INK, lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: 28.2,
  seed: 7901,
  far: 1500,
  plates: true,
  bg: false,
  palette: { stage: PAL.crimson, gold: PAL.goldHi, ink: INK, red: PAL.red, accent: PAL.red },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: { ...look, variants: { red } }, shadow: false, moves: [],
    track: [
      { t: TURN + F(1), pose: "spread", dur: 0.3, hold: 5.5 },
      { t: HIT.kneel, form: "red", dur: F(1) },
      { t: LINE.A, expr: "glare", dur: 0.15, hold: 4 },
      { t: 3.8, expr: "smirk", dur: 0.2, hold: 4.2 },
      { t: 6.7, pose: "key", dur: 0.5, hold: 6.5 },
      { t: 14.1, pose: "ea", dur: 0.4, hold: 3.6 },
      { t: 17.8, pose: "aim", dur: 0.5, hold: 1.8 },
      ...[HIT.kneel, HIT.key, HIT.open, HIT.ea, HIT.blast, HIT.flash].map(flush),
    ],
  },
  // the pale pup's stand (rig frame): the basin foot, the Gate's centre, the rim terrace, the basin foot again.
  // The rim row keeps RIM.pup and RIM.yaw; its scale and lift are fitted to the 23.2 frame (RIM.scale 3.0 printed 0.26 of frame height).
  stand: [
    { t: 0, p: [0.6, 0, -2.0], yaw: 0.25 },
    { t: BACK, p: [0, 0, 0], yaw: SEAL.yaw },
    { t: T.edge, p: [RIM.pup[0], RIM.pup[1] + 0.5, RIM.pup[2]], yaw: RIM.yaw, s: 1.6 },
    { t: T.home, p: [0.6, 0, -2.0], yaw: 0.25 },
  ],
  shots: [
    shot(1, [0, 0.5], [[0.5, 6.1, 11.2], [0.5, 5.6, 10.0]], [0.2, 1.4, -3.0], 40, { law: "wide", overscan: 1.06, zoom: [1, 1.1], ease: "linear" }),
    shot(2, [0.5, G(14)], [[0.4, 1.1, 2.6], [0.6, 0.9, 1.9]], [0.6, 0.55, -2.0], 36),
    cam(3, [G(14), G(28)], 0.45, 2.6, 0.9, [0, 1.5, -1.2], 46),
    cam(4, [G(28), 3.5], 0.2, 2.8, 0.9, [0, 1.35, 0], 38),
    cam(5, [3.5, 5.0], -0.6, 3.8, 0.9, [0, 1.7, -3], 50),
    cam(6, [5.0, 7.0], 0.55, 3.4, 1.0, [0, 1.6, -1], 44),
    cam(7, [7.0, G(100)], 0.3, 3.0, 0.8, [0.4, 1.9, 0], 40),
    cam(8, [G(100), 10.5], -0.5, 3.4, 0.6, [0.3, 1.7, -0.5], 42),
    cam(9, [10.5, G(151)], 0, 4.0, 1.0, [0, 2.4, -6], 52),
    cam(10, [G(151), G(170)], 0.15, 3.2, 0.2, [0, 3.4, -4], 56),
    cam(11, [G(170), G(197)], 0.4, 2.9, 0.7, [1.0, 1.15, 0.3], 38),
    cam(12, [G(197), G(215)], 0.3, 3.2, 0.8, [0.7, 1.45, -1.5], 40),
    cam(13, [G(215), HIT.shatter], 0.3, 2.4, 0.9, [0.62, 1.2, -1.2], 34, { law: "kill", menace: { frac: 0.6, dark: 0, calm: 0.25 } }),
    cam(14, [HIT.shatter, BACK], 0.1, 2.4, 0.9, [0.62, 1.35, -1.2], 34),
    cam(15, [BACK, T.edge], LENS.az, LENS.r, LENS.h, LENS.aim, LENS.fov, { law: "home" }),
    { n: 16, t: [T.edge, T.home], law: "home", hold: true, moving: false, minFrac: 0.02, eye: [W(RIM.eye), W(RIM.eye)], lookAt: [W(RIM.aim), W(RIM.aim)], fov: RIM.fov },
    shot(17, [T.home, 28.2], [[0.5, 5.2, 9.0], [0.5, 7.2, 13.2]], [0.2, 1.4, -3.0], 40, { law: "home" }),
  ],
  beats: [
    ...hit(TURN, "chest", "turn", 0.03, [], 3),
    ...hit(HIT.kneel, "chest", "kneel", 0.03, [[0.9, 0.2, 0.5, 2.4, 0.14], [-0.5, -0.5, -0.7, 2.0, 0.08]], 2),
    rumble(1.27, 3.3, 0.02, 0.03),
    ...[3, 4, 5, 6].map((t) => ({ t, name: "volley", dur: 0.5, n: 6 })),
    rumble(7.0, 8.1, 0.034, 0.04),
    { t: 7.0, name: "gather", dur: HIT.key - 7.0, at: "hand" },
    ...hit(HIT.key, "hand", "key", 0.036, [], 3),
    rumble(8.6, 12.6, 0.03, 0.04),
    ...hit(HIT.open, "vault", "open", 0.04, [], 3, F(3), false),
    rumble(14.5, 16.4, 0.036, 0.04),
    ...hit(HIT.ea, "hilt", "ea", 0.036, [], 3, F(3), false),
    rumble(17.9167, 19.4167, 0.036, 0.04),
    ...hit(HIT.blast, "tip", "blast", 0.04, [], 4, F(3), false),
    { t: HIT.blast, name: "beam", dur: F(4) },
    shk(HIT.flash, 0.04, 0.2, 9),
    { t: HIT.flash + F(1), name: "freeze", dur: F(2), layers: ["world"] },
    { t: HIT.flash, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    shk(HIT.shatter, 0.04, 0.22, 9), { t: HIT.shatter, name: "tear", dur: BACK - HIT.shatter },
    ...hit(BACK, "chest", "back", 0.034, [], 10),
    { t: BACK, name: "ones", dur: 1.45, layers: ["world", "cast", "fx"] },
    { t: BACK, name: "poof", dur: F(6) },
    { t: 5.0, name: "fore", dur: 1.2, side: 1 },
    { t: 8.6, name: "fore", dur: 1.5, side: -1 },
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
