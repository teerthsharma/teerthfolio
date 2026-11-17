// SCENE DATA for pr-topograph-432: the live comic cover as data. Ten hard-cut panels from clock.js (no arc, no orbit); the 2D push is the
// only motion inside a panel. Every engine pass that adds colour, haze, glow or a grade is off; the page (fx/page.js) letters every word.
import look from "../../kit/hero/looks/pr-topograph-432.js";
import { DUR, HIT, PANELS, T, W } from "./clock.js";
import { BLACK, GOLD, VIOLET } from "./tone.js";

const F = (f) => f / 24;
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a hit: the world holds one frame, the impact panel is drawn on ones with n drawings, the shake comes at its first drawing and at its second
const hit = (t, at, kind, amp, n) => [
  { t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] },
  { t, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  { t, name: "panel", dur: F(n), at, kind, n },
  shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22),
];
const gather = (t, dur, at) => ({ t, name: "gather", dur, at });
// a channel set (or an expression) held over [t0, t1), eased in and out by the seal's track
const on = (t0, t1, set) => ({ t: t0 - 0.02, set, dur: 0.01, hold: t1 - t0, out: 0.01 });
// the cuts sit on the 12 grid, where the layer clocks step (framework/law.js) and the seal's place is read at the cut
const G12 = (t) => Math.round(t * 12) / 12;
// S0's wide aims at the obelisk and the dock (its clock end is the 420 m wide, aimed 43 m up: the sky)
const CUT = PANELS.map((p, i) => ({ ...p, t: [G12(p.t[0]), i === PANELS.length - 1 ? DUR : G12(p.t[1])], look: i === 0 ? [p.look[0], [0, 1.2, -6]] : p.look }));
const pull = (p, k) => p.eye[0].map((v, i) => p.look[0][i] + (v - p.look[0][i]) * k);
const P = look.poses;

// a panel as a free-key shot: the eye and aim in the rig (W adds the dock), the lens, the roll; held unless a move is named
const panel = (p, i, o = {}) => ({
  n: i + 1, t: p.t, law: "free", hold: true, moving: true, minFrac: 0.28,
  eye: [W(p.eye[0]), W(p.eye[1])], lookAt: [W(p.look[0]), W(p.look[1])],
  fov: p.fovTo ? [p.fov, p.fovTo] : p.fov, dutch: p.roll, ...o,
});
const PUSH = { overscan: 1.06, zoom: [1, 1.045], ease: "linear" };
const SHOTS = [
  { hold: false, minFrac: 0.05 }, // S0: the pull-out from the dock (a 3D move, no push)
  { ...PUSH, minFrac: 0.05 }, PUSH, PUSH, PUSH, PUSH, // S1 to S5: the 2D push
  { menace: { frac: 0.7, dark: 0, calm: 0.25 } }, // S6: the hold, calm menace at the biggest burst
  PUSH, PUSH, // S7, S8
  { hold: false, minFrac: 0.05, long: true }, // S9: the island pull-back (a 3D move, 5.2 s, no auto-cut)
];

export default {
  id: "pr-topograph-432",
  title: "Overlord, Ainz Ooal Gown: Throne Room of Nazarick",
  anime: "Overlord, Ainz in the Throne Room of Nazarick",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paper: "#ece4cc", paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: BLACK, set: 0, paint: 0 },
  },
  frame: { ink: BLACK, lift: [0.008, 0.03] },
  hold: false,
  fps: 12,
  duration: DUR,
  seed: 432,
  far: 1500,
  plates: true,
  bg: false,
  palette: { ink: BLACK, gold: GOLD, violet: VIOLET, crimson: "#d0142f", bone: "#ece4cc", accent: VIOLET },
  seal: {
    at: W([0, 0, 0]), yaw: PANELS[0].yaw, scale: 1, hero: look, shadow: false,
    moves: CUT.map((p) => ({ t: [p.t[0] - 2e-3, p.t[0] - 1e-3], to: W(p.seal), yaw: p.yaw })),
    track: [
      { t: 1.5, expr: "menace", dur: 0.1, hold: 5, out: 0.3 },
      on(T.mouth[0][0], T.mouth[0][1], { mouth: ["open", 1] }),
      on(4.9, 5.6, P["look-up"]),
      { t: T.ignite[0], set: { catch: { glow: 1.9 } }, dur: 0.05, hold: 0.4, out: 0.2 },
      on(8.5, 12.2, P.stand),
      on(12.4, 20.0, P.hold),
      { t: 12.4, pose: "raise", dur: 0.4, hold: 7.6, out: 0.2 },
      on(T.mouth[1][0], T.mouth[1][1], { mouth: ["open", 1] }),
    ],
  },
  shots: CUT.map((p, i) => panel(i === CUT.length - 1 ? { ...p, eye: [p.eye[0], pull(p, 1.25)] } : p, i, SHOTS[i])),
  beats: [
    shk(T.impact, 0.03, 0.2, 9),
    rumble(3.6, 5.0, 0.004, 0.012, 5), gather(4.6, 0.4, "skull"),
    ...hit(HIT.eyes, "skull", "ignite", 0.03, 2),
    rumble(6.2, 7.4, 0.006, 0.014, 5), gather(7.0, HIT.rise - 7.0, "throne"),
    ...hit(HIT.rise, "throne", "rise", 0.034, 3), { t: HIT.rise, name: "crack", set: "A", dur: 0.8 },
    rumble(8.0, 9.0, 0.008, 0.016, 4), gather(8.6, HIT.reveal - 8.6, [0.5, 0.42]),
    ...hit(HIT.reveal, [0.5, 0.42], "reveal", 0.04, 4),
    { t: HIT.reveal, name: "tear", dur: 1.4 }, { t: HIT.reveal, name: "bigcircle", dur: 0.9 },
    { t: HIT.reveal, name: "rings", at: "throne", dur: 1.2 }, { t: HIT.reveal, name: "shards", at: "throne", dur: 1.0 },
    rumble(11.0, 12.7, 0.008, 0.014, 5), gather(12.4, HIT.staff - 12.4, "staff"),
    ...hit(HIT.staff, "staff", "stamp", 0.034, 3), { t: HIT.staff, name: "crack", set: "B", dur: 0.12 },
    { t: HIT.staff, name: "rings", at: "foot", dur: 1.2 }, { t: HIT.staff, name: "shards", at: "foot", dur: 1.0 },
    rumble(18.6, 19.9, 0.006, 0.016, 4),
    { t: T.back - F(2), name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] }, shk(T.back, 0.022, 0.16, 12),
    shk(18.0, 0.02, 0.2, 10),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
