// SCENE DATA for p-aether-lang: Gojo's Infinite Void into Hollow Purple as the live site draws it (commit 995cc0c), in the engine's frame.
// Every engine pass that adds colour, haze, bloom or grade is off. The clock is clock.js (the site's PACE); the camera is the live lens, held, pushed or cut.
import look from "../../kit/hero/looks/p-aether-lang.js";
import { AIM, BACK, DOCK, DURATION, FOV, HIT, LENS, LINE, SEAL, STAND, TELE_FOV, realOf } from "./clock.js";
import { BLACK, FLOOR } from "./tone.js";

const F = (n) => n / 24, G = (n) => n / 12;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const N = { impact: 3, lock: 2, cry: 3, collide: 4, back: 2 };
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, [eye, f], o) => shot(n, t, eye, eye.map((v, i) => v + 30 * f[i]), FOV, o);
const tele = (n, t, [eye], aim, fov, o) => shot(n, t, eye, aim, fov, o);
const swing = (n, t, [e0, f0], [e1, f1], o = {}) => ({ n, t, law: "free", moving: true, minFrac: 0.05, eye: [W(e0), W(e1)], lookAt: [W(e0.map((v, i) => v + 30 * f0[i])), W(e1.map((v, i) => v + 30 * f1[i]))], fov: FOV, ...o });
const PUSH = { overscan: 1.06, zoom: [1, 1.04], ease: "linear" };
const PUSH_HOME = { overscan: 1.06, zoom: [1.02, 1.05], ease: "linear" };
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
    lines: { ink: "#dbc7ff", set: 0, paint: 0 },
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
    moves: [stand(G(40), STAND.two), stand(G(119), STAND.c)],
    track: [
      { t: HIT.impact, pose: "gojo-domain", dur: F(1), hold: LINE.C - HIT.impact, out: 0.2 },
      span(LINE.A, 8.55, "expr", "gojo"), span(8.55, 11.5, "expr", "gojo-focus"), span(11.5, 13.45, "expr", "gojo-narrow"),
      span(13.45, 18.6, "pose", "point"), span(18.6, 20.24, "pose", "gojo-open"), span(20.24, 21.1, "pose", "gojo-meet"), span(21.1, 22.6, "pose", "point"),
    ],
  },
  shots: [
    live(1, [0, G(28)], LENS.island, { ...PUSH, law: "wide" }),
    live(2, [G(28), G(40)], LENS.island),
    live(3, [G(40), G(108)], LENS.two, { law: "wide" }),
    swing(4, [G(108), G(119)], LENS.flood, LENS.mid, { law: "arc" }),
    live(5, [G(119), G(150)], LENS.stop),
    tele(6, [G(150), G(166)], LENS.stop, AIM.lock, TELE_FOV.lock, { law: "kill" }),
    tele(7, [G(166), G(190)], LENS.c, AIM.cry, TELE_FOV.cry, { menace: { frac: 0.62, dark: 0, calm: 0.25 } }),
    live(8, [G(190), G(252)], LENS.c),
    live(9, [G(252), G(272)], LENS.c, { law: "kill" }),
    live(10, [G(272), G(300)], LENS.home, { law: "home" }),
    live(11, [G(300), DURATION], LENS.home, { ...PUSH_HOME, law: "home" }),
  ],
  beats: [
    rumble(3.31, 3.45, 0.01, 0.02),
    ...hit(HIT.impact, "seal", "impact", 0.03),
    shk(realOf(8.6), 0.02),
    ...hit(HIT.lock, "seal", "lock", 0.024, 2),
    { t: 13.45, name: "gather", dur: 0.5, at: "seal" },
    ...hit(HIT.cry, "seal", "cry", 0.028),
    rumble(18.6, 20.24, 0.008, 0.02),
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
