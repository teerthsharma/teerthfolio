// SCENE DATA for p-tangle (Your Name, kataware-doki): the live cutscene's clock, lenses, lines and hits (clock.js, measured from the site), the engine's passes off by data,
// and the shots and beats on the real clock. The seal is the approved character, cut to on the impact and back to the pale pup at BACK.
import look from "../../kit/hero/looks/p-tangle.js";
import { BACK, DOCK, DOLLY, HIT, HOLD, LENS, LINE, SEAL, T, unwarp } from "./clock.js";
import { PAL } from "./palette.js";

const P = look.poses;
const F = (f) => f / 24;
const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
const hit = (t, at, kind, amp, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const lens = (k) => { const [eye0, fwd, fov] = LENS[k], D = DOLLY[k] ?? 1, C = [0, 1, 0]; const eye = eye0.map((v, i) => C[i] + (v - C[i]) * D); return { eye, aim: eye.map((v, i) => v + 30 * fwd[i]), fov }; };
const hold = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, k, o = {}) => { const L = lens(k); return hold(n, t, L.eye, L.aim, L.fov, o); };
const move = (n, t, a, b, o = {}) => ({ n, t, law: "free", moving: true, minFrac: 0.05, eye: [W(a.eye), W(b.eye)], lookAt: [W(a.aim), W(b.aim)], fov: [a.fov, b.fov], ease: "smooth", step: 12, ...o });
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });

export default {
  id: "p-tangle",
  title: "Your Name, kataware-doki: the red cord",
  anime: "Your Name, CoMix Wave Films, Makoto Shinkai",
  style: "your-name",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, kuwa: 0, haze: null, hazeAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: "#0c1448", set: 0, paint: 0 },
    fill: { rim: 0, ring: 0 },
  },
  frame: { ink: "#0c1448", lift: [0.008, 0.03], split: { shadow: "#3b1f8f", high: "#ffe0a8", amt: 0.10 }, grain: { amt: 0.015, luma: 1, fps: 12 } },
  hold: false,
  fps: 12,
  duration: 28.6,
  seed: 3401,
  far: 1500,
  plates: true,
  bg: false,
  palette: PAL,
  tiers: { far: 3, near: 3, sparkle: 3, flies: 2, flare: 2 },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false, moves: [{ t: [HOLD.t[0] - 2e-3, HOLD.t[0] - 1e-3], to: W([0, 0, 0]), yaw: HOLD.yaw }, { t: [HOLD.t[1] - 2e-3, HOLD.t[1] - 1e-3], to: W([0, 0, 0]), yaw: SEAL.yaw }],
    track: [
      on(1.15, 1.8, P.cordTie), on(1.8, HIT.impact - 0.1, P.pressChest), on(unwarp(T.split), HIT.impact, P.cometLook),
      { t: HIT.impact, pose: "crouch", dur: 0.12, hold: 0.9, out: 0.5, k: 0.45 },
      on(22.4, BACK + F(2), P.emptyReach),
      { t: 1.15, expr: "calm", dur: 0.1, hold: 7.4, out: 0.2 },
      { t: 8.6, expr: "determined", dur: 0.2, hold: 14, out: 0.3 },
      { t: HIT.impact, set: { catch: { col: "#ffc08a", glow: 1.3 } }, dur: 0.1, hold: 1.4, out: 0.3 },
    ],
  },
  shots: [
    move(1, [0, 1.4], lens("isl"), lens("wide"), { law: "wide" }),
    live(2, [1.4, 1.6], "wide"),
    move(3, [1.6, 3.0], lens("wide"), lens("a"), { law: "wide" }),
    live(4, [3.0, 5.4], "a"),
    hold(5, [5.4, 6.7], [Math.sin(-1.9) * 3.8, 0.9, Math.cos(-1.9) * 3.8], [0.2, 1.0, -0.9], 40, { minFrac: 0.4 }),
    live(6, [6.7, 8.6], "a"),
    move(7, [8.6, 9.2], lens("a"), lens("b1"), { law: "arc" }),
    live(8, [9.2, HOLD.t[0]], "b1", { law: "kill" }),
    hold(9, HOLD.t, [Math.sin(HOLD.az) * HOLD.r, HOLD.up, Math.cos(HOLD.az) * HOLD.r], HOLD.aim, HOLD.fov, { menace: { frac: 0.6, dark: 0, calm: 0.25 }, faceAvoid: true, law: "kill" }),
    live(10, [HOLD.t[1], 19.2], "b3", { law: "kill" }),
    hold(11, [19.2, 21.0], [3.4, 0.95, -0.5], [-0.4, 1.0, -1.2], 40, { minFrac: 0.4 }),
    live(12, [21.0, 27.8], "b4"),
    move(13, [27.8, 28.4], lens("b4"), lens("home"), { ease: "smooth", law: "home" }),
    live(14, [28.4, 28.6], "home", { law: "home" }),
  ],
  beats: [
    shk(1.15, 0.03, 0.2, 9),
    rumble(unwarp(T.fall[0]), HIT.impact - 0.1, 0.004, 0.012, 6),
    { t: HIT.link - F(2), name: "freeze", dur: F(4), layers: ["world"] },
    { t: HIT.link, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    shk(HIT.link, 0.014, 0.2, 9),
    { t: HIT.link, name: "flare", dur: F(6), at: "loops", col: "#ffe0a8", size: 0.12 },
    ...hit(HIT.impact, "far", "impact", 0.034, 3),
    { t: HIT.impact, name: "shards", dur: 0.9 },
    { t: HIT.impact + 0.04, name: "speedlines", dur: 0.9, kind: "radial", at: [0.5, 0.45], strength: 0.5, col: "#ffe0a8", taper: 0.6 },
    rumble(unwarp(T.pull[0]), unwarp(T.pull[1]), 0.006, 0.012, 5),
    { t: HIT.knot - F(4), name: "freeze", dur: F(4), layers: ["world"] },
    { t: HIT.knot, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    shk(HIT.knot, 0.02, 0.2, 9),
    { t: HIT.knot, name: "flare", dur: F(6), at: "loops", col: "#ffc890", size: 0.10 },
    { t: BACK - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] }, shk(BACK, 0.022, 0.16, 12),
    shk(27.8, 0.02, 0.08, 10),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
