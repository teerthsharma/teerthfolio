// SCENE DATA for p-topological-ml-toolkit: the live cutscene's clock, lenses, beats and seal, as data. Every engine pass that adds colour, haze,
// glow or a grade is off; the picture is the live's flat daylight, and the lettering and the credit are drawn by fx/ in the page.
import look from "../../kit/hero/looks/p-topological-ml-toolkit.js";
import { BACK, DOCK, HIT, LENS, LINE, SEAL } from "./clock.js";
import { PAL } from "./tone.js";

const F = (f) => f / 24, G = (g) => g / 12;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
const hit = (t, at, kind, amp, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, [eye, f, fov], o) => shot(n, t, eye, eye.map((v, i) => v + 30 * f[i]), fov, o);
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [Math.sin(a) * r, h, Math.cos(a) * r], aim, fov, o);
const PUSH = { overscan: 1.06, zoom: [1, 1.04], ease: "linear" };

export default {
  id: "p-topological-ml-toolkit",
  title: "A Certain Magical Index, Accelerator: Vector Reversal",
  anime: "A Certain Magical Index, J.C.Staff: Accelerator's vector manipulation, reflection and the vector field",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: "#16307a", set: 0, paint: 0 },
  },
  frame: { ink: PAL.ink, lift: [0.004, 0.02] },
  hold: false,
  fps: 12,
  duration: 29.85,
  seed: 4131,
  far: 900,
  plates: true,
  bg: false,
  palette: { ink: PAL.ink, red: PAL.red, accent: PAL.stage },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [{ t: [G(116) - 2e-3, G(116) - 1e-3], to: W([0, 0, 0]), yaw: SEAL.yawLens }],
    track: [
      { t: LINE.impact + 0.1, expr: "smirk", dur: 0.2, hold: 1.0, out: 0.2 },
      { t: 3.375, pose: "raise", dur: 0.12, hold: 1.2, out: 0.1 },
      { t: HIT.train, pose: "crouch", dur: 0.08, hold: 0.1, out: 0.25, k: 0.45 },
      { t: HIT.ray, pose: "crouch", dur: 0.08, hold: 0.1, out: 0.25, k: 0.45 },
      { t: 4.6, pose: "wind", dur: 0.3, hold: 6.0, out: 0.1 },
      { t: 4.6, expr: "menace", dur: 0.2, hold: 9.0, out: 0.2 },
      { t: 4.6, set: { aura: 1 }, dur: 0.4, hold: 6.0, out: 0.3 },
      { t: HIT.release, set: { aura: 0.5 }, dur: 0.1, hold: 4.7, out: 0.3 },
      { t: HIT.release, pose: "release", dur: 0.1, hold: 0.5, out: 0.3 },
      { t: G(143), set: { catch: { col: "#ffffff", glow: 1.6 } }, dur: 0.1, hold: 1.5, out: 0.2 },
      { t: 13.0, expr: "smirk", dur: 0.2, hold: 2.4, out: 0.2 },
    ],
  },
  shots: [
    shot(1, [0, 1.0], [0, 4.4, 9.6], [0, 0.6, 0], 49, { ...PUSH, law: "wide" }),
    at(2, [1.0, G(28)], -0.01, 10.2, 3.9, [0, 0.5, 0], 49, { law: "wide" }),
    live(3, [G(28), G(38)], LENS.w1, { law: "wide" }),
    live(4, [G(38), G(47)], LENS.w1, { law: "wide" }),
    at(5, [G(47), HIT.train], -0.5, 3.4, 1.0, [0.3, 0.95, 0], 44),
    live(6, [HIT.train, 4.5], LENS.a),
    at(7, [4.5, G(66)], -0.44, 4.2, 1.1, [0.35, 1.25, 0], 44, { ...PUSH, law: "arc" }),
    at(8, [G(66), G(83)], 0.5, 3.0, 0.5, [0.1, 2.0, -0.5], 48),
    live(9, [G(83), G(101)], LENS.a, { law: "kill" }),
    at(10, [G(101), G(116)], 0.3, 5.0, 1.2, [0.2, 1.8, -0.6], 44),
    at(11, [G(116), HIT.release], -0.065, 6.33, 1.16, [0, 0.85, 0], 46),
    live(12, [HIT.release, G(136)], LENS.a),
    live(13, [G(136), G(143)], LENS.b),
    at(14, [G(143), G(163)], 0.3, 2.6, 0.9, [0, 1.2, 0], 34, { menace: { frac: 0.6, dark: 0, calm: 0.25 }, quiet: true }),
    live(15, [G(163), G(185)], LENS.b, { law: "kill" }),
    at(16, [G(185), G(204)], 0.35, 4.6, 0.8, [0, 0.45, 0], 42, { ...PUSH, law: "home" }),
    at(17, [G(204), G(252)], 0.5, 4.8, 0.8, [0, 0.45, 0], 42, { ...PUSH, law: "home" }),
    at(18, [G(252), 23.25], -0.4, 5.2, 0.9, [0, 0.45, 0], 40),
    at(19, [23.25, G(328)], 0.25, 4.6, 0.9, [0, 0.2, 0], 42, { law: "home" }),
    live(20, [G(328), G(343)], LENS.rise, { ...PUSH, law: "home" }),
    live(21, [G(343), 29.85], [[1.36, 9.15, 12.4], [-0.08, -0.43, -0.9], 36.7], { law: "home" }),
  ],
  beats: [
    shk(LINE.impact, 0.03, 0.2, 9),
    rumble(3.4, 4.1, 0.006, 0.016, 6),
    ...HIT.bullets.map((t) => shk(t, 0.006, 0.1, 12)),
    ...HIT.missiles.map((t) => shk(t, 0.016, 0.12, 12)),
    ...HIT.beams.map((t) => shk(t, 0.019, 0.12, 12)),
    { t: HIT.train - 0.5, name: "gather", dur: 0.5, at: "seal" },
    ...hit(HIT.train, "seal", "train", 0.04),
    ...hit(HIT.ray, [0.7, 0.45], "ray", 0.03),
    shk(HIT.fall, 0.03, 0.18, 10),
    rumble(4.7, 7.1, 0.004, 0.01, 6),
    { t: HIT.release - 0.5, name: "gather", dur: 0.5, at: "hand" },
    ...hit(HIT.release, "hand", "release", 0.034),
    rumble(11.0, 12.7, 0.006, 0.012, 6),
    { t: HIT.pop - 0.5, name: "gather", dur: 0.5, at: [0.5, 0.04] },
    ...hit(HIT.pop, [0.5, 0.04], "pop", 0.04, 4),
    shk(HIT.pop + 0.25, 0.024, 0.2, 8),
    rumble(HIT.fold, 15.17, 0.012, 0.006, 8),
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    shk(BACK, 0.022, 0.16, 12),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
