// SCENE DATA for pr-highway-3244: the Highway (Fate/Zero, Iskandar's Gordius Wheel) as the live move draws it; the clock, the lens and the race are the site's (clock.js, lens.js, race.js).
import look from "../../kit/hero/looks/pr-highway-3244.js";
import { BACK, C, FLING, SEAL, SH, TURN, W } from "./clock.js";
import { FIST, FOVS, HOLD, LENS } from "./lens.js";
import { CAR_S, heroState, sealMoves, sealRig } from "./race.js";
import { TRACK } from "./cast/character.js";
import { BLACK } from "./tone.js";

const F = (f) => f / 24, G = (g) => g / 12; // a time on the 24 grid; on the 12 grid, where the seal is redrawn
const shk = (t, amp, tau = 0.18, hz = 10) => ({ t, name: "shake", amp, tau, hz });
const rumble = (t0, t1, a0, a1, n = 5) => ({ t: t0, name: "shake", tau: 0.16, hz: 7, schedule: Array.from({ length: n }, (_, i) => ({ t: t0 + ((t1 - t0) * i) / n, amp: a0 + ((a1 - a0) * i) / (n - 1) })) });
// a hit: the world holds for two drawings (freeze), one 24 fps window, the engine's impact frames, the shake of the blow
const hit = (t, amp, n = 0, freeze = false, win = 0.5) => [
  ...(freeze ? [{ t: t - F(2), name: "freeze", dur: F(2), layers: ["world"] }] : []),
  { t, name: "ones", dur: win, layers: ["world", "cast", "fx"] },
  ...(n ? [{ t, name: "impact", seq: [[1, n]], cols: ["#fff1d0", BLACK] }] : []),
  shk(t, amp, 0.22, 9), shk(t + F(n || 1), amp * 0.6, 0.14, 22),
];
// the shot helpers: eye and aim in the rig frame (the dock at the origin, the pup facing +z), held, free keys in the world
const shot = (n, t, eye, aim, fov, o = {}) => ({ n, t, law: "free", hold: true, moving: true, minFrac: 0.05, eye: [W(eye), W(eye)], lookAt: [W(aim), W(aim)], fov, ...o });
const aimUp = (f, deg) => { const e = Math.asin(f[1]) + (deg * Math.PI) / 180, h = Math.hypot(f[0], f[2]); return [(f[0] / h) * Math.cos(e), Math.sin(e), (f[2] / h) * Math.cos(e)]; };
const live = (n, t, key, o = {}) => { const { tilt = 0, ...rest } = o, f = tilt ? aimUp(LENS[key][1], tilt) : LENS[key][1]; return shot(n, t, LENS[key][0], LENS[key][0].map((v, i) => v + 30 * f[i]), FOVS[key], rest); };
const at = (n, t, a, r, h, aim, fov, o) => shot(n, t, [Math.sin(a) * r, h, Math.cos(a) * r], aim, fov, o);
const PUSH = { overscan: 1.06, zoom: [1, 1.045], ease: "linear" };
const N = [0.352, 0, 0.936]; // the lens-side normal before the launch (the chariot's heading is -x, +z)
const nose = (tc) => { const h = heroState(tc); return [h.x + 2.15 * CAR_S * Math.cos(h.yaw), h.y + 0.62 * CAR_S, h.z - 2.15 * CAR_S * Math.sin(h.yaw)]; };
const sealAt = sealRig(19.0);
const FN = [N[0] * Math.cos(0.8) + N[2] * Math.sin(0.8), 0, -N[0] * Math.sin(0.8) + N[2] * Math.cos(0.8)]; // the fist camera 46 degrees to the side: the raised flipper stops hiding the face

// the seal's track is the character's (cast/character.js); the pup's own poses are driven by cast/index.js
export default {
  id: "pr-highway-3244",
  title: "Fate/Zero, Iskandar: the Gordius Wheel",
  anime: "Fate/Zero, ufotable: Iskandar, Via Expugnatio, Ionioi Hetairoi",
  style: "modern-anime",
  look: {
    photo: "none",
    post: { bloom: 0, diffuse: 0, shafts: 0, sat: 1, split: [0, 0, 0], gain: [1, 1, 1], grain: 0, vig: 0.28, ca: 0, paperAmt: 0,
      satsuei: { shadowAmt: 0, inkMix: 1, paraDark: { amt: 0 }, paraLight: { amt: 0 }, rim: { amt: 0 }, wrap: { amt: 0 } } },
    lines: { ink: BLACK, set: 0, paint: 0 },
  },
  frame: { ink: BLACK, lift: [0.004, 0.02], grain: { amt: 0.045, luma: 1, fps: 12 } },
  hold: false,
  fps: 12,
  duration: 25.8,
  seed: 3244,
  far: 900,
  plates: true,
  bg: false,
  palette: { sky: "#291480", up: "#9e4de6", rose: "#ff478f", gold: "#ff9e1f", haze: "#ffb86b", bolt: "#38a0ff", trail: "#8fd8ff", slice: "#5dffc2", word: "#ffc926", flash: "#fff1d0", flag: "#e61f1a", ink: BLACK, accent: "#ff5a3c" },
  seal: {
    at: W([0, 0, 0]), yaw: TURN, scale: SEAL.char, hero: look, shadow: false,
    moves: sealMoves(),
    track: TRACK,
  },
  shots: [
    live(1, [0, G(7)], "island", { overscan: 1.05, zoom: [1, 1.035], ease: "linear" }),
    at(2, [G(7), C.impact], 0.42, 3.2, 0.5, [0.3, 0.4, 0], 40, PUSH),
    at(3, [C.impact, G(17)], 0.42, 3.2, 0.5, [0.3, 0.4, 0], 40),
    live(4, [G(17), G(23)], "wide", { zoom: [1, 1.04], ease: "linear" }),
    shot(5, [G(23), G(33)], [0.3, 2.2, 5.0], [1.45, 2.1, -0.6], 50),
    live(6, [G(33), G(45)], "settle", { ease: "linear" }),
    shot(7, [G(45), G(60)], [1.43, 4.48, 1.6], [2.63, 4.18, -1.8], 36),
    live(8, [G(60), SH.a[0]], "settle", { ease: "linear" }),
    shot(9, SH.a, HOLD.eye, HOLD.aim, HOLD.fov, { menace: HOLD.menace, quiet: true }),
    live(10, SH.cry, "cry", { tilt: 5 }),
    shot(11, SH.brace, HOLD.eye, HOLD.aim, HOLD.fov, { menace: HOLD.menace, quiet: true }),
    live(12, SH.race, "race", { ease: "linear" }),
    shot(13, SH.nose, [nose(11.6)[0] + 4.2 * N[0], 1.2, nose(11.6)[2] + 4.2 * N[2]], nose(11.6), 40),
    live(14, [G(149), G(164)], "race", { ease: "linear" }),
    live(15, [G(164), G(177)], "race", { ease: "linear" }),
    live(16, [G(177), G(186)], "flag"),
    live(17, SH.back, "back", { tilt: 6, ease: "linear" }),
    shot(18, SH.fist, [sealAt[0] + FIST.dist * FN[0], sealAt[1] + FIST.up, sealAt[2] + FIST.dist * FN[2]], [sealAt[0], sealAt[1] + 0.12, sealAt[2]], FIST.fov),
    live(19, SH.credit, "credit", { tilt: 9 }),
    live(20, [25.0, 25.8], "home"),
  ],
  beats: [
    shk(C.impact, 0.03, 0.2, 9),
    rumble(6.32, 7.55, 0.004, 0.014, 6),
    ...hit(C.cry, 0.034, 2, true),
    { t: C.go, name: "ones", dur: 6.5, layers: ["world", "cast", "fx"] },
    shk(C.go, 0.03, 0.22, 9),
    { t: 9.2, name: "shake", tau: 0.2, hz: 8, schedule: Array.from({ length: 22 }, (_, i) => ({ t: 9.2 + i * 0.25, amp: 0.006 })) },
    ...hit(FLING[0], 0.024, 1), ...hit(FLING[1], 0.02), ...hit(FLING[2], 0.022), ...hit(FLING[3], 0.02),
    ...hit(FLING[4], 0.03, 2, true),
    ...hit(C.kachow, 0.02), ...hit(C.cross, 0.022),
    { t: C.cover[1] - 0.24, name: "shake", amp: 0.025, tau: 0.22, hz: 9 },
    { t: C.stop, name: "shake", amp: 0.016, tau: 0.18, hz: 10 },
    { t: BACK, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
  ],
  bubbles: [],
  lines: [],
  sfx: [],
};
