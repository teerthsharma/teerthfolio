// SCENE DATA for p-caustic: Naruto, Madara in the Fourth Shinobi War, as the live site plays it. A sepia painted war, a red moon, a blue
// Susanoo, then the pastel island back. Every engine pass that adds colour, haze, glow or a grade is off; the picture is the site's.
import look from "../../kit/hero/looks/madara.js";
import { BLACK } from "./tone.js";
import { CAM, DOCK, DURATION, HIT, R, SEAL, standAt } from "./clock.js";

// the beats: shake, the freeze and the ones of a hit, the impact frames, the flat of a cut and the speed lines (real seconds)
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
const hit = (t, seq, cols, a0, a1) => [
  { t: t - 2 / 24, name: "freeze", dur: 2 / 24, layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "impact", seq, cols },
  shk(t, a0, 0.22, 9), shk(t + 3 / 24, a1, 0.14, 22),
];
const TURN_BEATS = [
  { t: HIT.turn - 1 / 24, name: "flat", frames: 2, col: "#fff4e4" },
  { t: HIT.turn, name: "speedlines", kind: "radial", at: [0.5, 0.5], dur: 0.3, col: "#1d1813" },
  shk(HIT.turn, 0.026, 0.2, 9),
];
const BEATS = [
  ...TURN_BEATS,
  shk(R(3.3), 0.02, 0.2, 9), rumble(R(1.7), R(2.8), 0.005, 0.012, 6),
  ...hit(HIT.m1, [[1, 1]], ["#fff4e4", "#2a241f"], 0.03, 0.018),
  rumble(R(6.1), HIT.m2, 0.006, 0.022, 8),
  ...hit(HIT.m2, [[1, 1], [2, 1], [1, 1]], ["#fff4e4", "#120a0b"], 0.04, 0.026),
  { t: HIT.m2, name: "speedlines", kind: "radial", at: [0.5, 0.5], dur: 0.45, strength: 0.9, col: "#120a0b", spokes: 200 },
  shk(HIT.m2 + 0.4, 0.014, 0.3, 7),
  { t: HIT.brk, name: "flat", frames: 1, col: "#fff4e4" }, shk(HIT.brk, 0.03, 0.24, 10),
  shk(HIT.back, 0.022, 0.16, 12),
];

// the live camera as held shots (world frame, the site's own rows), the seal walked onto each row's lens ray
const f30 = (e, f) => e.map((v, i) => v + 30 * f[i]);
const SLOW = [1, 9, 12]; // the rows that push in slowly
const shots = CAM.map(([r0, r1, e, f, fov, , law], i) => ({ n: i + 1, t: [r0, r1], law, hold: true, moving: true, minFrac: 0, eye: [e, e], lookAt: [f30(e, f), f30(e, f)], fov, ...(SLOW.includes(i) ? { zoom: [1, 1.04], overscan: 1.06, ease: "linear" } : {}) }));
const moves = CAM.map(([r0]) => { const s = standAt(r0 + 1e-3); return { t: [r0 - 2e-3, r0 - 1e-3], to: s.p, yaw: s.yaw }; });

// the Madara track: each pose, expression or channel set over its window
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });
const pose = (name, t0, t1) => ({ t: t0, pose: name, dur: 0.2, hold: Math.max(0, t1 - t0 - 0.4), out: 0.2 });
const expr = (name, t0, t1) => ({ t: t0, expr: name, dur: 0.2, hold: Math.max(0, t1 - t0 - 0.4), out: 0.2 });
const lit = (t0, t1) => on(t0, t1, { catch: { glow: 1.3 } });

export default {
  id: "p-caustic",
  title: "Naruto, Madara: the Fourth Shinobi War, Tengai Shinsei (PROTECTED)",
  anime: "Naruto Shippuden, Pierrot: Madara, Perfect Susanoo, Tengai Shinsei",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0.045, vig: 0.32, ca: 0.002, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: BLACK, set: 0, paint: 0 },
  },
  frame: { ink: BLACK, lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: DURATION,
  seed: 4101,
  far: 1500,
  plates: true,
  bg: false,
  palette: { sky: "#2a241f", haze: "#bfa98b", ash: "#9c8a72", moon: "#b3122a", blue: "#1f4dff", pink: "#e0559b", ink: "#1d1813", doom: "#120a0b", ember: "#ffb347" },
  seal: {
    at: DOCK, yaw: standAt(1.3).yaw, scale: SEAL.scale, hero: look, shadow: false, moves,
    track: [
      expr("madara-calm", HIT.turn, 3.29), pose("fist", 2.05, 2.35), pose("madara-gunbai", 2.35, 3.29), pose("madara-cast", 3.29, 8.90),
      expr("madara-smirk", 4.63, 9.50), pose("madara-cross", 8.90, 9.50),
      lit(1.70, 2.31), lit(3.82, 7.00), lit(8.90, 9.50),
    ],
  },
  shots,
  beats: BEATS,
  bubbles: [],
  lines: [],
  sfx: [],
};
