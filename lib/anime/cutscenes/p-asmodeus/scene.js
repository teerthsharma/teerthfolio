// SCENE DATA for p-asmodeus: Asmodeus, "From zero" (The Devil Is a Part-Timer!, White Fox, 2013). The pale playable pup opens before the throne,
// becomes Sadao Maou at the Gate, is the crew form in Sasazuka, grows back into the Demon Lord for the kill, mends the city and turns back into the pup.
// Clock, cameras and layout are code (clock.js, cams.js, layout.js); this file is the data the framework reads.
import look, { grow1, grow2, redEyes, satan } from "../../kit/hero/looks/p-asmodeus.js";
import { shotData } from "./cams.js";
import { FORMS, K, TURN_OUT } from "./clock.js";

const INK = "#120c14", SKY = "#0b1430", SODIUM = "#ffb04a", RED = "#ff2a3a", PAPER = "#ebe6e6";
const RED_SPLIT = { shadow: "#2a0610", high: RED, amt: 0.45 }, SODIUM_SPLIT = { shadow: SKY, high: SODIUM, amt: 0.3 };

export default {
  id: "p-asmodeus",
  title: "Asmodeus: From zero",
  anime: "The Devil Is a Part-Timer!, White Fox, 2013: Sadao Maou, the Demon Lord Satan",
  style: "modern-anime",
  look: {
    photo: false,
    lines: { px: 2.6, ink: INK, set: 1.2 },
    post: { bloom: 0, diffuse: 0, shafts: 0, grain: 0, vig: 0, ca: 0 },
  },
  fps: 12,
  duration: 12.0,
  seed: 47,
  far: 400,
  plates: true,
  bg: false,
  // no default calm-menace hold: it would replace shots 9 and 10 (kill and mend) with the chest-up rig the cams.js wide is built against
  hold: false,
  palette: { ink: INK, sky: SKY, sodium: SODIUM, red: RED },
  frame: {
    ink: INK,
    lift: [0.035, 0.08],
    box: { ratio: 2.39, slide: 0 },
    split: SODIUM_SPLIT,
    grain: { amt: 0.03, luma: 1, fps: 12 },
  },
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1, shadow: false,
    hero: { ...look, variants: { redEyes, grow1, grow2, satan } },
    track: [
      ...FORMS.map(({ t, form }) => ({ t, form })),
      { t: 1.0, pose: "idle", dur: 0.1, hold: 1.0 },
      { t: 1.0, expr: "maou-glare", dur: 0.1, hold: 1.0 },
      { t: 2.3, pose: "maou-shrug", dur: 0.15, hold: 0.8, out: 0.2 },
      { t: 4.5, expr: "awe", dur: 0.15, hold: 1.0 },
      { t: 5.0, pose: "crouch", dur: 0.2, hold: 0.4, out: 0.2, k: 0.4 },
      { t: 5.5, set: { catch: { col: "#ff6a6a", glow: 2.2, n: 1 } }, dur: 0.1, hold: 5.0, out: 0.2 },
      { t: 7.5, pose: "maou-palm", dur: 0.4, hold: 0.9, out: 0.2 },
      { t: K(8), expr: "maou-glare", dur: 0.1, hold: 1.0, out: 0.2 },
      { t: 10.5, set: { catch: { glow: 0 } }, dur: 0.1, hold: 1.5 },
    ],
  },
  shots: shotData().map((s) => (s.n <= 2 ? { ...s, grade: { split: RED_SPLIT } } : s)),
  beats: [
    { t: 0, name: "iris", dur: 0.5, from: 0, to: 1.4, at: "seal" },
    { t: 1.0, name: "flat", dur: 1.5 / 24, col: PAPER, bars: "keep" },
    { t: 1.0, name: "shake", amp: 0.02, tau: 0.18, hz: 10 },
    { t: 4.5, name: "grade", dur: 2.0, split: RED_SPLIT, in: 2.0, out: 0, hold: true },
    { t: 5.5, name: "shake", amp: 0.012, tau: 0.12, hz: 14 },
    { t: 6.5, name: "speedlines", dur: 1.0, kind: "radial", at: [0.5, 0.55], col: RED, strength: 0.7, taper: 0.6 },
    { t: 7.5, name: "shake", amp: 0.026, tau: 0.2, hz: 9 },
    { t: 7.5, name: "shock", dur: 0.4, at: [0.5, 0.55], amp: 0.02, r1: 0.5 },
    { t: 8.0, name: "ones", dur: 0.5, layers: ["world", "cast", "fx"] },
    { t: 8.0, name: "speedlines", dur: 1 / 3, kind: "radial", at: [0.55, 0.55], col: RED, strength: 0.5 },
    { t: K(8), name: "shake", amp: 0.034, tau: 0.22, hz: 9 },
    { t: K(9), name: "invert", frames: 1 },
    { t: K(10), name: "flat", dur: 0.5 / 24, col: PAPER, bars: "keep" },
    { t: 8.5, name: "grade", dur: 2.0, split: SODIUM_SPLIT, in: 2.0, out: 0, hold: true },
    { t: 11.0, name: "iris", dur: 1.0, to: 1.15, unit: "seal", at: "seal", ease: "in" },
    { t: TURN_OUT, name: "flat", dur: 1.5 / 24, col: PAPER, bars: "keep" },
  ],
  bubbles: [
    { t: [2.3, 4.3], who: "seal", tone: "bar", text: "Zero magic. Minimum wage. Still the Demon Lord." },
    { t: [6.8, 8.0], who: "foe", tone: "bar", text: "Lord Satan, powerless? This city is mine." },
    { t: [K(8) - 1 / 24, 9.0], who: "seal", tone: "bar", text: "The fear is mine now." },
    { t: [9.0, 9.58], who: "seal", tone: "bar", text: "And so is the repair bill." },
  ],
  credit: {
    t: [9.6, 12.0],
    text: "teerthsharma/Asmodeus ०",
    sub: "A new artificial intelligence, invented from zero.",
    style: { y: "bar", size: 0.04, subSize: 0.024, col: "#d8d2c4" },
  },
  lines: [],
  sfx: [],
};
