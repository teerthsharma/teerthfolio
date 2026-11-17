// SCENE DATA for home (Vinland Saga, "You have no enemies"): the live move's clock, camera, lines and beats as
// components/world/cutscene/moves/home.jsx plays them. The lens is the site's frame guard (KEYP in clock.js): the seal keeps its
// live height in every wide, and it never arcs in 3D. Every hit is a pigment event; the shake never goes above 0.03.
import look from "../../kit/hero/looks/home.js";
import { BACK, CAMT, DOCK, INTO, KEYP, SEAL, drift } from "./clock.js";
import { HAZE, INK, LILAC, PAPER } from "./tone.js";

const W = (p) => [p[0] + DOCK[0], p[1], p[2] + DOCK[2]];
const at = (k) => ({ eye: W(KEYP[k][0]), look: W(KEYP[k][1]) });
const still = (k) => { const c = at(k); return { eye: [c.eye, c.eye], look: [c.look, c.look] }; };
const glide = (a, b) => ({ eye: [at(a).eye, at(b).eye], look: [at(a).look, at(b).look] });
const drifting = (k, t0, t1) => {
  const c = at(k), d = (t) => { const [dx, dy] = drift(t); return [c.eye[0] + dx, c.eye[1] + dy, c.eye[2]]; };
  return { eye: [d(t0), d(t1)], look: [c.look, c.look] };
};
// role = the live shot's law (wide, arc, kill, home; free for glides and inserts): the director checks their order
const shot = (n, t, cam, fov, ease, role = "free", o = {}) => ({ n, t, law: role, moving: true, step: 12, minFrac: 0.1, eye: cam.eye, lookAt: cam.look, fov, ease, ...o });
const FOV = 52;
const WORLD = ["world", "cast", "fx"];

const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 6) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
const ones = (t) => ({ t, name: "ones", dur: 0.5, layers: WORLD });
const F = (f) => f / 24;
// a hit: the world freezes two drawings, a 0.5 s ones window, a panel of n drawings, and the shake kicks at the panel and again after it
const hit = (t, who, kind, amp, n) => [{ t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] }, ones(t), { t, name: "panel", dur: F(n), at: who, kind }, shk(t, amp, 0.22, 9), shk(t + F(n), amp * 0.6, 0.14, 22)];

const [toH, hold, toB, bShot, toC] = [CAMT.toH, CAMT.hold, CAMT.toB, CAMT.b, CAMT.toC];

export default {
  id: "home",
  title: "Vinland Saga, Thors: You have no enemies",
  anime: "Vinland Saga, Thors",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0, ca: 0, paper: PAPER, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: "#4a4060", set: 0, paint: 0 },
  },
  frame: { ink: "#1b1630", lift: [0, 0] },
  hold: false,
  fps: 12,
  duration: 30.2,
  seed: 11,
  far: 1500,
  plates: true,
  bg: false,
  palette: { paper: PAPER, haze: HAZE, ink: INK, accent: "#7fc8f8", lilac: LILAC },
  seal: {
    at: W([0, 0, 0]), yaw: SEAL.yaw, scale: SEAL.scale, hero: look, shadow: false,
    moves: [],
    track: [
      { t: 1.34, expr: "calm", dur: 0.1, hold: 23.3, out: 0.2 },
      { t: 2.25, pose: "sit", dur: 0.35, hold: 22.4, out: 0.3 },
      { t: 4.8, blink: 0.32 }, { t: 13.2, blink: 0.32 }, { t: 24.7, blink: 0.32 },
    ],
  },
  shots: [
    shot(1, [0, 0.8], still("I"), 38, "linear", "wide"),
    shot(2, [0.8, 1.3], glide("I", "A"), [38, FOV], "smooth"),
    shot(3, [1.3, 4.7], drifting("A", 1.3, 4.7), FOV, "linear", "wide"),
    shot(4, [4.7, 5.6], glide("A", "B"), FOV, "smooth"),
    shot(5, [5.6, toH[0]], drifting("B", 5.6, toH[0]), FOV, "linear", "arc"),
    shot(6, toH, glide("B", "H"), FOV, "smooth"),
    shot(7, hold, still("H"), 36, "linear", "kill", { menace: { frac: 0.6, dark: 0, calm: 0.25 } }),
    shot(8, toB, glide("H", "B"), FOV, "smooth"),
    shot(9, [toB[1], bShot[1]], still("B"), FOV, "linear"),
    shot(10, toC, glide("B", "C"), FOV, "smooth"),
    shot(11, [toC[1], 15.5], still("C"), FOV, "linear"),
    shot(12, [15.5, 16.4], glide("C", "E"), FOV, "smooth"),
    shot(13, [16.4, 18.1], still("E"), FOV, "linear"),
    shot(14, [18.1, 19.0], glide("E", "D"), FOV, "smooth"),
    shot(15, [19.0, 29.3], drifting("D", 19.0, 29.3), FOV, "linear", "home", { long: true }),
    shot(16, [29.3, 29.6], glide("D", "R"), FOV, "smooth"),
    shot(17, [29.6, 30.2], still("R"), FOV, "linear", "home"),
  ],
  beats: [
    { t: 4.4, name: "gather", dur: 0.517, at: "orca" },
    ...hit(5.0, "orca", "rise", 0.03, 3),
    rumble(5.8, 10.6, 0.003, 0.008, 6),
    shk(10.7, 0.02, 0.24, 8),
    ...hit(12.0, "bloop", "bloop", 0.02, 2),
    ones(INTO - 2 / 24), shk(INTO, 0.02, 0.2, 9),
    ones(BACK - 2 / 24), shk(BACK, 0.022, 0.16, 12),
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
