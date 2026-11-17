// SCENE DATA for pr-tensorflow-124410: the JoJo cut of DIO's The World on the site's island, drawn as the live cutscene draws it. Every engine pass
// that adds colour, haze, glow or a grade is off. The clock, the lens and the beats are the live site's (clock.js); the camera is shots.js.
import look from "./look.js";
import { DUR, HIT, LINE, SEAL, SWAP, W } from "./clock.js";
import { P } from "./cast/poses.js";
import { MOVES, SHOTS } from "./shots.js";
import { BLACK } from "./tone.js";

const F = (f) => f / 24;
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a hit: the world holds for two frames, the frame that hits is drawn on ones, the panel is the fx layer's own (cast flashes on it), the shake
const hit = (t, kind, amp, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), kind },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });
const IMPACT = LINE.impact, RIVAL = HIT.rival;

export default {
  id: "pr-tensorflow-124410",
  title: "JoJo's Bizarre Adventure, DIO: The World",
  anime: "JoJo's Bizarre Adventure: Stardust Crusaders, DIO stops time, MUDA (Araki cover)",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: BLACK, set: 0, paint: 0 },
  },
  frame: { ink: BLACK, lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: DUR,
  seed: 124410,
  far: 1200,
  plates: true,
  bg: false,
  palette: { ink: "#110a22", coral: "#ff5a54", mint: "#7ff5c8", cream: "#fff1d6" },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: MOVES,
    track: [
      on(IMPACT, 3.5, P.brood),
      { t: 3.5, pose: "dio-muda", dur: 0.1, hold: 1.4, out: 0.05 },
      on(5.0, HIT.resume, P.stop),
      { t: HIT.drown - 0.02, pose: "crouch", dur: 0.1, hold: 0.2, out: 0.05 },
      { t: 1.17, expr: "dio-smirk", dur: 0.1, hold: 2.13, out: 0.2 },
      { t: 3.5, expr: "dio-muda", dur: 0.1, hold: 1.4, out: 0.2 },
      { t: 5.0, expr: "dio-menace", dur: 0.1, hold: 2.1, out: 0.2 },
      { t: HIT.resume, expr: "dio-smirk", dur: 0.1, hold: 0.9, out: 0.2 },
    ],
  },
  shots: SHOTS,
  beats: [
    ...hit(IMPACT, "bloom", 0.03),
    shk(RIVAL, 0.04, 0.2, 9),
    rumble(3.5, 5.0, 0.03, 0.04),
    ...HIT.barrage.map((t) => hit(t, "barrage", 0.03, 2)).flat(),
    ...hit(HIT.crack, "crack", 0.034),
    ...hit(HIT.stop, "stop", 0.04, 4),
    ...hit(HIT.tock, "tock", 0.03, 2),
    ...hit(HIT.resume, "resume", 0.034),
    ...hit(HIT.drown, "drown", 0.04),
    ...hit(HIT.tick, "tick", 0.04),
    ...hit(SWAP, "swap", 0.03, 2),
    shk(SWAP + 0.35, 0.03, 0.2, 9),
    { ...shk(16.6, 0.02, 0.2, 10), dur: 0.4 },
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
