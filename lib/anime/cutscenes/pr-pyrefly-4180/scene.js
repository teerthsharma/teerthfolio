// SCENE DATA for pr-pyrefly-4180 (Minato and the Nine-Tails): the live paper theatre's own clock and lens as data, every engine pass that adds
// colour, haze, glow or a grade switched off, the approved seal as the character on the live's kunai hops, and the hits as frame-law beats.
import look from "../../kit/hero/looks/pr-pyrefly-4180.js";
import { BACK, DOCK, FOV, FOV_SITE, FTG, HIT, KUNAI, LEN, LENS, TURN } from "./clock.js";
import { PAL } from "./palette.js";

const F = (f) => f / 24, G = (g) => g / 12; // a time on the 24 grid; on the 12 grid, where the seal is redrawn (a cut that moves it lands there)
const C = Math.cos(TURN), S = Math.sin(TURN);
const W = (p) => [C * p[0] + S * p[2] + DOCK[0], p[1] + DOCK[1], -S * p[0] + C * p[2] + DOCK[2]]; // rig frame to world
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a hit: the world holds for `frames` drawings, the cast and the marks go on ones, the shake
const hit = (t, amp, frames = 2) => [
  { t: t - F(frames), name: "freeze", dur: F(frames), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  shk(t, amp, 0.085, 12),
];
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, [eye, fwd], o) => shot(n, t, eye, eye.map((v, i) => v + 30 * fwd[i]), FOV, o);
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [Math.sin(a) * r, h, Math.cos(a) * r], aim, fov, o);
const stand = (t, p) => ({ t: [t - 2e-3, t - 1e-3], to: W(p), yaw: TURN });
const set = (t, s, hold = 0.3, out = 0.1) => ({ t, set: s, dur: 0.1, hold, out });
const near = ([eye], k = 0.4) => eye.map((v) => v * k); // the seal stands toward a wide's lens, so its box reaches 0.30
const toward = ([eye], k, p) => [p[0] + k * (eye[0] - p[0]), 0, p[2] + k * (eye[2] - p[2])]; // k of the way from p to the lens, on the ray
const PUSH = { overscan: 1.06, zoom: [1, 1.045], ease: "linear" };

export default {
  id: "pr-pyrefly-4180",
  title: "Naruto: the Night of the Nine-Tails (pyrefly #4180)",
  anime: "Naruto, Minato Namikaze and the Nine-Tails, Flying Thunder God, Kushina's chains",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paper: PAL.cream, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: "#0b0618", set: 0, paint: 0 },
  },
  frame: { ink: "#0b0618", lift: [0.004, 0.02] },
  hold: false,
  fps: 12,
  duration: LEN,
  seed: 4180,
  far: 1500,
  plates: true,
  bg: false,
  palette: { paper: PAL.cream, ink: PAL.ink, accent: PAL.accent },
  seal: {
    at: W([0, 0, 0]), yaw: TURN, scale: 1.5, hero: look, shadow: false,
    moves: [
      stand(G(23), near(LENS.a)), stand(G(37), [0, 0, 0]), stand(4.0, near(LENS.a)),
      stand(G(95), toward(LENS.b, 0.6, KUNAI[0])), stand(G(109), toward(LENS.b, 0.6, KUNAI[1])), stand(G(123), toward(LENS.b, 0.6, KUNAI[2])), stand(G(148), [0, 0, 0]),
      stand(G(155), near(LENS.b)), stand(G(225), [-1.7, 0, 0.6]), stand(G(245), near(LENS.c)), stand(27.6, [0, 0, 0]),
    ],
    track: [
      { t: G(14), expr: "minato-calm", dur: 0.15, hold: 21.4, out: 0.2 },
      { t: 3.1, pose: "minato-throw", dur: 0.15, hold: 0.55, out: 0.25 },
      ...[7.9167, 9.0833, 10.25, 12.333].map((h) => set(h, { head: { rz: 0.3 } })),
      { t: 9.56, pose: "raise", dur: 0.4, hold: 4.9, out: 0.1 },
      { t: 14.98, pose: "crouch", dur: 0.6, hold: 4.9, out: 0.85, k: 0.8 },
      { t: 21.19, pose: "fist", dur: 0.68, hold: 0.85, out: 0.1 },
      ...FTG.map((h) => ({ t: h - 0.02, set: { catch: { col: "#a8d4ff", glow: 1.6 } }, dur: 0.01, hold: 0.45, out: 0.01 })),
    ],
  },
  shots: [
    live(1, [0, G(14)], LENS.dock, { law: "wide" }),
    at(2, [G(14), G(23)], 0.35, 3.4, 0.75, [0.2, 0.95, -1.0], 42, { overscan: 1.06, zoom: [1, 1.045], ease: "linear", law: "wide" }),
    live(3, [G(23), G(37)], LENS.a, { law: "wide" }),
    at(4, [G(37), 4.0], 0.25, 3.1, 0.8, [0.5, 1.0, -1.8], 44, { law: "wide" }),
    live(5, [4.0, G(95)], LENS.a, { law: "wide" }),
    live(6, [G(95), G(123)], LENS.b, { law: "wide" }),
    shot(7, [G(123), 11.0], [0.9, 0.9, -0.6], [0, 1.0, -3.0], 40, { law: "kill" }),
    live(8, [11.0, G(148)], LENS.b, { law: "free" }),
    shot(9, [G(148), G(155)], [1.5, 0.9, 2.7], [0, 1.0, 0], 44, { law: "free" }),
    live(10, [G(155), 15.0], LENS.b, { law: "free" }),
    live(11, [15.0, 16.0], LENS.c, { law: "free" }),
    live(12, [16.0, G(225)], LENS.c, { law: "free" }),
    shot(13, [G(225), G(245)], [-3.3, 1.0, 2.75], [-2.0, 0.85, -0.45], 42, { law: "kill", menace: { frac: 0.6, dark: 0, calm: 0.25 } }),
    live(14, [G(245), G(273)], LENS.c, { law: "free" }),
    live(15, [G(273), 26.0], LENS.d, { law: "home" }),
    live(16, [26.0, 27.6], LENS.home, { law: "home", overscan: 1.06, zoom: [1, 1.03], ease: "linear" }),
    live(17, [27.6, LEN], LENS.site, { law: "home", fov: FOV_SITE }),
  ],
  beats: [
    shk(G(14), 0.03, 0.2, 9),
    rumble(2.3, 4.75, 0.004, 0.012, 6),
    rumble(12.12, 14.9, 0.006, 0.016, 6),
    ...FTG.flatMap((f) => [{ t: f, name: "ones", dur: 0.45, layers: ["cast", "fx"] }, shk(f, 0.02, 0.085, 12)]),
    ...hit(HIT.hoop, 0.04),
    shk(HIT.bolt, 0.03, 0.085, 12),
    ...hit(HIT.burst, 0.04, 3),
    { t: HIT.burst, name: "flat", frames: 1, col: "#ff6b57", bars: "keep" },
    ...hit(HIT.pin, 0.034, 3),
    { t: HIT.pin, name: "flat", frames: 1, col: "#e9dcc0", bars: "keep" },
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] }, shk(BACK, 0.022, 0.16, 12),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
