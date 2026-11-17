// SCENE DATA for pr-anyps5-12609: a Vice Beach storm surge drains off a drowned skyline, drawn as painted key art (the look of the GTA VI trailers).
// 12 s, 144 drawings on twos; the B5 merge (8.0 to 8.5 s) on ones. Held world cameras live in cams.js; the plates, HUD and grade are in world/.
import { shotData } from "./cams.js";
import { vice } from "./cast/looks.js";
import { BACK, TURN } from "./clock.js";

const FONT = "Anton, 'Bebas Neue', Impact, 'Arial Black', sans-serif";

export default {
  id: "pr-anyps5-12609",
  title: "Storm surge over Vice Beach",
  anime: "Grand Theft Auto VI trailers (painted key art)",
  style: "spider-verse-comic",
  look: {
    photo: "none",
    fill: { tone: 1, toneScale: 6, toneAmt: 0.8, sat: 1.15, rim: 0.7, t: 0.5, t2: 0.2, lumaMax: 0.92 },
    lines: { px: 3.2, ink: "#0b0a10", inkMix: 1, setCol: "#0b0a10", set: 0, paint: 0 },
    post: { misreg: 0, grain: 0, bloom: 0.5, diffuse: 0, shafts: 0, vig: 0, ca: 0, sat: 1, satsuei: { shadowAmt: 0, paraDark: { amt: 0 }, paraLight: { amt: 0 }, wrap: { amt: 0 } } },
  },
  fps: 12,
  duration: 12,
  seed: 12609,
  far: 400,
  plates: true,
  bg: false,
  hold: false,
  palette: { ink: "#0b0a10", sky: "#4a2a6a", sun: "#fff0c8", water: "#1fb5b0", deep: "#0f6a86", neon: "#ff3ea0", cyan: "#2ae6ff" },
  frame: {
    ink: "#0b0a10",
    box: { ratio: 2.39, slide: 0 },
    split: { shadow: "#0f3a4a", high: "#ff9a4a", amt: 0.3 },
    grain: { amt: 0.025, luma: 1, fps: 12 },
  },
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1, hero: vice, moves: [],
    track: [
      { t: 0, expr: "vice", dur: 0.02, hold: 100, out: 0.02 },
      { t: 0.0, pose: "raise", dur: 0.2, hold: 0.7, out: 0.2 },
      { t: 1.0, pose: "point", dur: 0.15, hold: 0.8, out: 0.1 },
      { t: 2.0, move: "bellyFlop", dur: 0.9, to: { pose: "idle", expr: "vice", hold: 1.5 } },
      { t: 4.5, pose: "point", dur: 0.1, hold: 0.9, out: 0.2 },
      { t: 3.5, move: "slide", dur: 1.0, from: [-0.6, 0, 0.3], to: { pose: "sit", expr: "vice", hold: 2 } },
      { t: 4.0, pose: "crouch", dur: 0.1, hold: 0.15, out: 0.15, k: 0.4 },
      { t: 4.8, pose: "crouch", dur: 0.1, hold: 0.15, out: 0.15, k: 0.4 },
      { t: 5.5, move: "spin", dur: 0.6, to: { pose: "sit", expr: "vice", hold: 2.4 } },
      { t: 8.0, pose: "point", dur: 0.1, hold: 0.45, out: 0.1 },
      { t: 8.0, set: { head: { ry: 0.7 } }, dur: 0.29, hold: 1.2, out: 0.3 },
      { t: 9.2, pose: "idle", dur: 0.1, hold: 0.2, out: 0.1 },
      { t: 9.5, pose: "salute", dur: 0.5, hold: 0.4, out: 0.4, k: 1.0 },
      { t: 10.5, move: "slide", dur: 1.0, from: [-0.6, 0, 0.3], to: { pose: "sit", expr: "vice", hold: 5 } },
    ],
  },
  shots: shotData(),
  beats: [
    { t: TURN - 2 / 24, name: "ones", dur: 0.25, layers: ["world", "cast", "fx"] },
    { t: TURN, name: "shake", amp: 0.012, tau: 0.14, hz: 20 },
    { t: 8.0, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    { t: 8.0, name: "grade", dur: 0.5, mono: 1.0, amt: 0, in: 7 / 24, out: 0 },
    { t: 8.5, name: "grade", dur: 0.5, mono: 1.0, amt: 0, in: 0, out: 0.5 },
    { t: 8 + 8 / 24, name: "shake", amp: 0.02, tau: 0.14, hz: 20 },
    { t: 11.167, name: "iris", dur: 0.833, from: 1.4, to: 0.62, at: "seal", ease: "in" },
    { t: BACK - 2 / 24, name: "ones", dur: 0.25, layers: ["world", "cast", "fx"] },
    { t: BACK, name: "shake", amp: 0.01, tau: 0.14, hz: 20 },
  ],
  bubbles: [
    { t: [2.25, 3.5], who: "seal", tone: "bar", col: "#e6e2d8", text: "Five stars and the whole city's underwater. Classic Leonida." },
    { t: [7.4, 8.292], who: "foe", tone: "bar", col: "#e6e2d8", text: "Every frame you drop, I'm writing you up for it." },
    { t: [8.667, 10.0], who: "seal", tone: "bar", col: "#e6e2d8", text: "One stall, one line. It went under where it met a taller one." },
  ],
  lines: [],
  sfx: [
    { t: [0, 1], text: "storm coming in", at: [0.5, 0.8], size: 0.03, rot: 0, col: "#e6e2d8", ink: "#0b0a10" },
    { t: [200 / 24 - 0.01, 202 / 24], text: "MERGED", at: [0.5, 0.26], size: 0.13, rot: 0, col: "#c8202a", ink: "#0b0a10", font: FONT },
    { t: [202 / 24, 204 / 24], text: "MERGED", at: [0.5, 0.26], size: 0.116, rot: 0, col: "#c8202a", ink: "#0b0a10", font: FONT },
    { t: [11.0, 12.0], text: "REPORTED ONCE", at: [0.5, 0.79], size: 0.1, rot: 0, col: "#f2c14e", ink: "#0b0a10", font: FONT },
  ],
  credit: {
    t: [10.0, 10.95], text: "boykopovar/AnyPS5 #12609",
    sub: "Each stall once, with its height above the fastest frame that separates it from a longer one.",
    style: { col: "#e6e2d8", size: 0.034, subSize: 0.02, fade: 0.1, y: "bar" },
  },
};
