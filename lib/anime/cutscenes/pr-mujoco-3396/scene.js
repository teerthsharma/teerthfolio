// SCENE DATA for pr-mujoco-3396: the deployed cutscene (460bafd) as data. Every time is a real second on the beat clock (clock.js R); the seal is the
// approved Eren look, the pale playable pup opens and closes the cutscene (cast/index.js). The engine's photography, bloom, lines and bg are off.
import look from "../../kit/hero/looks/pr-mujoco-3396.js";
import { PAL } from "./ink.js";
import { CUT, DOCK, END, FOOT, LENS, LINE, R, SEAL, STAND, T_BURN, T_FLEX2 } from "./clock.js";
import { BLACK } from "./tone.js";

const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
// a cut that moves the seal lands on the 12-frame drawing the cast layer is redrawn on (the first one at or after t)
const G = (t) => Math.ceil(t * 12 - 1e-6) / 12;
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const F = (f) => f / 24;
const hit = (t, at, kind, amp, strokes, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, strokes },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const PUSH = { overscan: 1.06, zoom: [1, 1.045], ease: "linear" }; // shot 1 only: no painting is up yet (the painting's frame is never pushed)
const stand = (t, [p, yaw]) => ({ t: [t - 2e-3, t - 1e-3], to: W(p), yaw });

const T_CREST = G(5.87), T_FOOT_CROUCH = G(R.crouch[0]), T_EAT = G(10.95), T_STAND_SHRINK = G(R.shrink[0]), T_FLEX = G(LINE.C);

export default {
  id: "pr-mujoco-3396",
  title: "Attack on Titan, the Walls were Titans (umber and gold painting)",
  anime: "Attack on Titan, the Walls were Titans, and the Rumbling",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: BLACK, set: 0, paint: 0 },
  },
  frame: { ink: BLACK, lift: [0.004, 0.02] },
  hold: false,
  fps: 12,
  duration: 29.35,
  seed: 3396,
  far: 1500,
  plates: true,
  bg: false,
  palette: { paper: PAL.base, ink: PAL.ink, red: PAL.vermilion, accent: PAL.ember },
  seal: {
    at: W(STAND.island[0]), yaw: STAND.island[1], scale: SEAL.scale, hero: look, shadow: false,
    moves: [
      stand(CUT, STAND.wide), stand(T_CREST, STAND.crest), stand(T_FOOT_CROUCH, STAND.ground), stand(T_EAT, STAND.eat),
      stand(T_STAND_SHRINK, STAND.ground), stand(T_FLEX, STAND.flex), stand(T_FLEX2, STAND.flex2), stand(T_BURN, STAND.burn), stand(27.0, STAND.end),
    ],
    track: [
      { t: CUT, pose: "brace", dur: 0.1, hold: 2.4, out: 0.2 },
      { t: CUT, expr: "set", dur: 0.1, hold: 21, out: 0.3 },
      { t: 5.87, pose: "lookup", dur: 0.2, hold: 0.8, out: 0.15 },
      { t: R.crouch[0], pose: "brace", dur: 0.3, hold: 0.5, out: 0.1 },
      { t: R.bolt[0], expr: "shout", dur: 0.05, hold: 0.6, out: 0.2 },
      { t: R.swell[0], pose: "raise", dur: 0.4, hold: 1.4, out: 0.3 },
      { t: R.swell[1], pose: "eat", dur: 0.2, hold: 4.2, out: 0.2 },
      { t: R.swell[1], expr: "roar", dur: 0.1, hold: 4.3, out: 0.2 },
      { t: R.shrink[0], expr: "set", dur: 0.1, hold: 1.5 },
      { t: R.flip[0], pose: "catch", dur: 0.3, hold: 0.9, out: 0.3 },
      { t: R.fist[0], pose: "fist", dur: 0.3, hold: 4.0, out: 0.4 },
      { t: R.shrink[0], set: { catch: { col: "#ffcc4d", glow: 1.6 } }, dur: 0.2, hold: 3.0, out: 0.3 },
    ],
  },
  shots: [
    shot(1, [0, CUT], [3.6, 1.0, 5.4], [-0.2, 1.0, -0.5], 40, PUSH),
    shot(2, [CUT, LINE.A], [1.2, 1.1, 9], [0, 7, -30], 44, { law: "wide" }),
    shot(3, [LINE.A, R.split[0]], [1.0, 1.1, 8], [0, 7, -30], 44, { law: "wide" }),
    shot(4, [R.split[0], T_CREST], [1.4, 1.1, 9.5], [0, 8, -30], 46),
    shot(5, [T_CREST, T_FOOT_CROUCH], [-1.0, 21.2, -17.5], [0.5, 23.5, -34], 40),
    shot(6, [T_FOOT_CROUCH, R.bolt[0]], [3, 2.4, 16], [0, 3.5, -10], 52),
    shot(7, [R.bolt[0], R.swell[0]], [2.4, 1.6, 12], [0.4, 2.2, 9.6], 40),
    shot(8, [R.swell[0], R.bolt[1]], LENS.swell.eye, LENS.swell.aim, LENS.swell.fov),
    shot(9, [R.bolt[1], T_EAT], [-4.0, 7.3, 33.6], [0.6, 6.4, 9.6], 36, { law: "kill", menace: { frac: 0, dark: 0, calm: 0.25 } }),
    shot(10, [T_EAT, 12.6], LENS.eat.eye, LENS.eat.aim, LENS.eat.fov),
    shot(11, [12.6, R.eat[1]], [9, 6, 20], [0.6, 7, 9.6], 50, { law: "kill" }),
    shot(12, [R.eat[1], T_FLEX], LENS.shrink.eye, LENS.shrink.aim, LENS.shrink.fov),
    shot(13, [T_FLEX, T_FLEX2], LENS.hold2.eye, LENS.hold2.aim, LENS.hold2.fov, { law: "kill", menace: { frac: 0.62, dark: 0, calm: 0.25 } }),
    shot(14, [T_FLEX2, 19.543], [1.4, 1.1, 7.2], [0, 4.5, -30], 44),
    shot(15, [19.543, R.restore[0]], [1.25, 1.1, 6.9], [0, 4.5, -30], 44),
    shot(16, [R.restore[0], T_BURN], LENS.credit.eye, LENS.credit.aim, LENS.credit.fov),
    shot(17, [T_BURN, 27.0], LENS.burn.eye, LENS.burn.aim, LENS.burn.fov, { law: "home" }),
    shot(18, [27.0, 28.645], LENS.home.eye, LENS.home.aim, LENS.home.fov, { law: "home" }),
    shot(19, [28.645, END], LENS.home.eye, LENS.home.aim, LENS.home.fov, { law: "home", zoom: [1.0, 1.035], ease: "linear" }),
  ],
  beats: [
    shk(0, 0.01, 0.18, 10),
    shk(CUT, 0.03, 0.2, 9),
    shk(R.split[0], 0.03, 0.2, 9), shk(R.split[1], 0.02, 0.2, 9), shk(R.split[2], 0.02, 0.2, 9),
    { t: FOOT[0], name: "shake", tau: 0.14, hz: 9, schedule: FOOT.map((t) => ({ t, amp: 0.02 })) },
    ...hit(R.bolt[0], "seal", "bolt", 0.04, 3),
    ...hit(R.swell[1], "seal", "stomp", 0.04, 4),
    ...hit(R.shrink[0], "top", "gap", 0.03, 3),
    ...hit(R.turnBack, "seal", "return", 0.02, 3),
    shk(LINE.collapse[0], 0.02, 0.2, 10),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
