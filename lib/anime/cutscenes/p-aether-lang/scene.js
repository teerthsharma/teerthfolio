// SCENE DATA for p-aether-lang: Gojo's Infinite Void into Hollow Purple as the live site draws it (commit 995cc0c), in the engine's frame.
// Every engine pass that adds colour, haze, bloom or grade is off. The clock is clock.js (the site's PACE); the camera is held, pushed or cut.
import look from "../../kit/hero/looks/p-aether-lang.js";
import { BACK, DOCK, DURATION, FOV, HIT, LENS, LINE, SEAL, STAND, realOf } from "./clock.js";
import { BLACK, FLOOR } from "./tone.js";

const F = (n) => n / 24, G = (n) => n / 12;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const ORIGIN = [0, 0, 0];
const PLACE = (t) => (t >= G(138) ? STAND.c[0] : t >= G(40) ? STAND.two[0] : ORIGIN); // the seal's rig place at real t
const N = { impact: 3, lock: 2, cry: 3, collide: 4, back: 2 };
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, [eye, f], o) => shot(n, t, eye, eye.map((v, i) => v + 30 * f[i]), FOV, o);
const at = (n, t, a, r, h, aim, fov, o) => {
  const c = PLACE(t[0]);
  return shot(n, t, [c[0] + Math.sin(a) * r, h, c[2] + Math.cos(a) * r], [c[0] + aim[0], aim[1], c[2] + aim[2]], fov, o);
};
const PUSH = { overscan: 1.06, zoom: [1, 1.04], ease: "linear" };
const PUSH_HOME = { overscan: 1.06, zoom: [1.02, 1.05], ease: "linear" };
const HOLD = { menace: { frac: 0.75, dark: 0, calm: 0.25 }, quiet: true };
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
const hit = (t, at, kind, amp, n = N[kind]) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const stand = (t, [p, yaw]) => ({ t: [t - 2e-3, t - 1e-3], to: W(p), yaw });
const span = (t0, t1, key, name) => ({ t: t0, [key]: name, dur: 0.1, hold: t1 - t0 - 0.2, out: 0.1 });

export default {
  id: "p-aether-lang",
  title: "Jujutsu Kaisen, Gojo: Infinite Void into Hollow Purple",
  anime: "Jujutsu Kaisen, MAPPA: Shibuya Incident, Infinite Void, Hollow Purple",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: "#120d38", set: 0, paint: 0 },
  },
  frame: { ink: BLACK, floor: FLOOR, lift: [0.0, 0.02] },
  hold: false,
  fps: 12,
  duration: DURATION,
  seed: 2001,
  far: 2000,
  plates: true,
  bg: false,
  palette: { ink: BLACK, accent: "#e94bff", paper: "#fbfaf7" },
  seal: {
    at: DOCK, yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [stand(G(40), STAND.two), stand(G(138), STAND.c)],
    track: [
      { t: HIT.impact, pose: "gojo-domain", dur: F(1), hold: LINE.C - HIT.impact, out: 0.2 },
      span(LINE.A, 8.55, "expr", "gojo"), span(8.55, 11.5, "expr", "gojo-focus"), span(11.5, 13.45, "expr", "gojo-narrow"),
      span(13.45, 18.6, "pose", "point"), span(18.6, 20.24, "pose", "gojo-open"), span(20.24, 21.1, "pose", "gojo-meet"), span(21.1, 22.6, "pose", "point"),
    ],
  },
  shots: [
    live(1, [0, G(28)], LENS.island, PUSH),
    at(2, [G(28), G(40)], 0.35, 6.5, 1.3, [0, 1.4, 0], 50),
    live(3, [G(40), G(66)], LENS.two),
    at(4, [G(66), G(90)], 0.25, 2.4, 0.55, [0, 1.3, 0], 38),
    live(5, [G(90), G(102)], LENS.two),
    live(6, [G(102), G(110)], LENS.flood),
    live(7, [G(110), G(138)], LENS.mid),
    live(8, [G(138), G(150)], LENS.stop),
    at(9, [G(150), G(161)], 0.6, 3.2, 1.0, [0, 1.2, 0], 42),
    at(10, [G(161), G(178)], 0.1, 2.2, 0.35, [0, 1.5, 0], 36),
    live(11, [G(178), G(222)], LENS.c),
    at(12, [G(222), G(237)], 0.3, 2.6, 1.1, [0, 1.2, 0], 40),
    at(13, [G(237), G(258)], 0.15, 1.9, 1.35, [0, 1.5, 0], 30, HOLD),
    at(14, [G(258), G(272)], 0.0, 3.4, 1.2, [0, 1.4, 0], 54),
    live(15, [G(272), G(300)], LENS.home),
    live(16, [G(300), DURATION], LENS.home, PUSH_HOME),
  ],
  beats: [
    rumble(3.31, 3.45, 0.004, 0.01),
    ...hit(HIT.impact, "seal", "impact", 0.03),
    shk(realOf(8.6), 0.012),
    ...hit(HIT.lock, "seal", "lock", 0.024, 2),
    { t: 13.45, name: "gather", dur: 0.5, at: "seal" },
    ...hit(HIT.cry, "seal", "cry", 0.028),
    rumble(18.6, 20.24, 0.004, 0.012),
    ...hit(HIT.collide, "chest", "collide", 0.04, 4),
    rumble(HIT.fire, 21.78, 0.012, 0.03),
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    { t: BACK, name: "panel", dur: F(2), at: "seal", kind: "back" },
    shk(BACK, 0.022),
    shk(HIT.collapse, 0.02),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
