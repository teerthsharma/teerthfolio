// SCENE DATA for spawn-seal: the live cutscene's cave, war plain and island on the site's clock and camera (clock.js), a manga-free comic page.
// The original pup opens and closes the cutscene; the approved character stands from the turn to BACK. Every pass that adds colour, haze, glow or grade is off.
import look from "../../kit/hero/looks/spawn-seal.js";
import { BACK, BREAK, DOCK, F, FOV, G, LENS, LINE, SEAL, TURN_T } from "./clock.js";
import { BLACK } from "./tone.js";

const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a hit: the world holds one frame, the impact panel is drawn on ones, the shake lands and fades
const hit = (t, at, kind, amp, n = 3) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] }, { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind }, shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const live = (n, t, [eye, fwd], o) => shot(n, t, eye, eye.map((v, i) => v + 30 * fwd[i]), FOV, o);
const stand = (t) => ({ t: [t - 2e-3, t - 1e-3], to: W([0, 0, 0]), yaw: SEAL.yaw });
const PUSH = (z) => ({ overscan: 1.05, zoom: [1, z], ease: "linear" });
// livecam's island window (one sample, rig frame): the statue behind the pup, the pup about a tenth of the frame
const ISLAND = [[5.5108, 1.1491, 9.6337], [-0.5735, 0.0273, -0.8188]];

export default {
  id: "spawn-seal",
  title: "That Time I Got Reincarnated as a Slime, Rimuru: the Sealed Cave, Megiddo, Predator",
  anime: "Tensei shitara Slime Datta Ken, 8bit: Sealed Cave, Veldora, Megiddo, Predator",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: BLACK, set: 0, paint: 0 },
  },
  frame: { ink: BLACK, lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: 30.0,
  seed: 3501,
  far: 1500,
  plates: true,
  bg: false,
  palette: { ink: "#06101c", accent: "#1fb8ff", cyan: "#37e8ff", gold: "#ffd37a", flash: "#9fe6ff", flash2: "#e6b8ff" },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [stand(1.0), stand(F(348)), stand(18.0), stand(22.6)],
    track: [
      { t: TURN_T, expr: "rimuru-gaze", dur: 0.1, hold: BACK - TURN_T - 0.3, out: 0.2 },
      { t: TURN_T, set: { rim: 1 }, dur: 0.1, hold: BACK - TURN_T, out: 0.1 },
      { t: 12.6, pose: "rimuru-draw", dur: 0.2, hold: 0.25, out: 0.05 },
      { t: 13.05, pose: "rimuru-punch", dur: 0.12, hold: 0.45, out: 0.3 },
      { t: 13.05, expr: "shout", dur: 0.08, hold: 0.4, out: 0.2 },
      { t: 2.8, set: { head: { rx: -0.2 } }, dur: 0.3, hold: 1.4, out: 0.3 },
    ],
  },
  shots: [
    live(1, [0, 1.0], ISLAND),
    live(2, [1.0, 3.4], LENS.cave),
    live(3, [3.4, 4.4], LENS.lineA, PUSH(1.04)),
    shot(4, [4.4, 6.4], [0.7, 0.75, 1.8], [0, 0.55, 0], 36),
    shot(5, [6.4, 8.6], [-1.0, 0.6, 2.2], [-1.8, 1.6, 0], 46),
    shot(6, [8.6, G(112)], [0.3, 0.7, 2.0], [0, 0.5, 0], 40),
    shot(7, [G(112), 10.4], [0.4, 0.95, 2.7], [0, 0.75, 0], 44),
    shot(8, [10.4, 12.0], [-0.8, 0.8, 3.2], [0.1, 1.0, -0.4], 42),
    shot(9, [12.0, F(348)], [0.77, 0.9, 2.48], [-0.1, 1.2, 0], 34, { menace: { frac: 0.6, dark: 0, calm: 0.25 }, quiet: true }),
    shot(10, [F(348), 18.0], [-1.8, 0.6, 2.6], [0.1, 0.9, -0.8], 46),
    shot(11, [18.0, 22.6], [-1.8, 0.6, 2.6], [0.1, 0.9, -0.8], 46, PUSH(1.03)),
    shot(12, [22.6, 26.9], [0.6, 0.5, 5.2], [0.1, 1.0, -1.5], 42),
    { ...shot(13, [26.9, 27.7], [0.6, 0.5, 5.2], [0, 1.9, -1.2], 50), eye: [W([0.6, 0.5, 5.2]), W([0.9, 1.9, 4.9])], lookAt: [W([0.1, 1.0, -1.5]), W([0, 1.9, -1.2])] },
    shot(14, [27.7, 30.0], [0.9, 1.9, 4.9], [0, 1.9, -1.2], 50),
  ],
  beats: [
    shk(1.0, 0.03, 0.2, 9), rumble(2.0, 3.4, 0.004, 0.012, 6),
    shk(4.0, 0.016), shk(6.0, 0.014),
    rumble(8.6, TURN_T, 0.006, 0.02, 6), { t: 8.8, name: "gather", dur: TURN_T - 8.8, at: "seal" },
    ...hit(TURN_T, "seal", "turn", 0.03, 3),
    rumble(10.0, 12.6, 0.008, 0.012, 6), shk(10.4, 0.02),
    { t: 12.6, name: "gather", dur: 13.05 - 12.6, at: "seal" },
    ...hit(BREAK, [0.5, 0.5], "punch", 0.04, 4),
    rumble(13.6, 14.4, 0.012, 0.03, 5),
    ...hit(BACK, "seal", "devour", 0.034, 3),
    shk(24.4, 0.01), shk(26.9, 0.012),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
