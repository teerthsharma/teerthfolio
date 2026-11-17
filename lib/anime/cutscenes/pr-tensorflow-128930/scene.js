// SCENE DATA for pr-tensorflow-128930: Godsealzilla, the fake ranked above the real, nine plates lock in order, one breath burns the disguise off.
// Toho kaiju night harbour, 12 s on twos, B5 on ones. Held shots only: the hero performs the entrance moves, the camera cuts.
import look from "../../kit/hero/looks/pr-tensorflow-128930.js";
import { variant } from "../../kit/hero/looks/_merge.js";

// the pup's own painted eyes (round, warm), the look's coat and fins untouched
const base = variant(look, { fur: { coat: "#4a505a", shade: "#23272e", poreCol: "#4a4f58" }, eyes: { style: "round", pupil: null, iris: "#6b4a2a", iris2: "#3a2416", glow: 0, size: 1.1, lash: "#0c0d10", sclera: "#f4eee0" }, brows: { thick: 0.9 }, mouth: { fangs: false, sharp: 0.2 } });
const charged = variant(base, { eyes: { iris: "#d8f4ff", iris2: "#3ac8ff" } });

export default {
  turn: { into: 1.0, back: 11.0 },
  id: "pr-tensorflow-128930",
  title: "Godsealzilla",
  anime: "Toho Godzilla films",
  style: "modern-anime",
  look: {
    fill: { sat: 1.12, hi: 0.86 },
    lines: { px: 2.6, ink: "#0a0d12", set: 1 },
    post: { bloom: 0.35, diffuse: 0.04, shafts: 0, sat: 1.1, grain: 0.03, vig: 0.34 },
    photo: { preset: "storm", motes: { amt: 0 }, mist: { amt: 0.12 }, halo: { amt: 0 }, veins: { amt: 0 }, haze: { max: 0.25, sky: 0.2 }, dof: { amt: 0.2 }, glow: { thr: 0.95, amt: 0.35 }, beats: [{ t: 8 + 8 / 24, dur: 0.25, flash: 1.0, col: "#f4fdff" }] },
  },
  fps: 12,
  duration: 12,
  seed: 128930,
  far: 900,
  plates: true,
  bg: "#06090f",
  frame: {
    ink: "#0a0d12",
    box: { ratio: 2.39, slide: 0 },
    split: { shadow: "#06090f", high: "#cfe4ff", amt: 0.3 },
    grain: { amt: 0.03, luma: 1, fps: 12 },
  },
  palette: { sky: "#06090f", horizon: "#141a26", sea: "#0a1420", ink: "#0a0d12", warm: "#ffd88a", cold: "#cfe4ff", cyan: "#3ac8ff", cyanHi: "#bfefff", amber: "#ffb24a", siren: "#e8303a" },
  seal: {
    at: [0, 0, -2], yaw: 0, scale: 6,
    hero: { ...base, variants: { charged } },
    moves: [
      { t: [0, 1], to: [0, 0, 2] },
      { t: [10.5, 10.75], to: [0, 0, 2], yaw: -1.35 },
      { t: [10.998, 10.999], to: [0, 0, 2], yaw: 0 },
    ],
    track: [
      { t: 1.0, pose: "zilla-wade", dur: 0.05, hold: 0.2, out: 0.15 },
      { t: 1.0, expr: "zilla-glare", k: 0.55, dur: 0.05, hold: 0.3, out: 0.15 },
      { t: 1.0, pose: "zilla-stand", dur: 0.33, hold: 5.4, out: 0.2 },
      { t: 2.0, move: "slide", dur: 0.6, from: [-2.3, 0, -0.2], to: { pose: "zilla-stand", expr: "zilla-glare" } },
      { t: 1.0, expr: "zilla-glare", k: 0.8, dur: 0.33, hold: 5.4, out: 0.2 },
      { t: 3.0, set: { head: { ry: -0.55 } }, dur: 0.17, hold: 1.4, out: 0.2 },
      { t: 4.75, set: { head: { ry: 0.55 } }, dur: 0.17, hold: 1.5, out: 0.2 },
      { t: 6.5, move: "popUp", dur: 0.6, hop: 0.08, to: { pose: "zilla-brace", expr: "zilla-glare" } },
      { t: 6.5, pose: "zilla-brace", dur: 0.15, hold: 1.2, out: 0.12 },
      { t: 6.5, expr: "zilla-glare", k: 1, dur: 0.15, hold: 1.2, out: 0.12 },
      { t: 8.0, move: "spin", dur: 0.3, turns: 1, to: { pose: "zilla-roar", expr: "zilla-glare" } },
      { t: 8.0, pose: "zilla-roar", dur: 0.083, hold: 0.45, out: 0.2 },
      { t: 8.0, expr: "zilla-glare", k: 1, dur: 0.04, hold: 0.12, out: 0.04 },
      { t: 8.167, expr: "zilla-roar", dur: 0.04, hold: 0.3, out: 0.12 },
      { t: 8.208, form: "charged" },
      { t: 8.5, form: "base" },
      { t: 8.5, pose: "zilla-stand", dur: 0.2, hold: 99 },
      { t: 8.5, expr: "zilla-calm", dur: 1.6, hold: 99 },
    ],
  },
  shots: [
    { n: 1, t: [0, 1], law: "wide", hold: true, az: -0.8, r: 5.2, elev: 0.2, fov: 30, look: [0.436, 0.1, 0.44], minFrac: 0.3 },
    { n: 2, t: [1, 2], law: "wide", hold: true, az: -0.8, r: 3.3, elev: 0.7, fov: 38, look: [0.536, -0.073, 0.523], minFrac: 0.1 },
    { n: 3, t: [2, 4.5], law: "arc", hold: true, az: -0.75, r: 2.9, elev: 0.55, fov: 37, look: [0.435, -0.061, 0.45] },
    { n: 4, t: [4.5, 5.5], law: "free", hold: true, az: -0.35, r: 5.0, elev: 0.35, fov: 34, look: [0.944, -0.041, 0.386], minFrac: 0.1 },
    { n: 5, t: [5.5, 6.5], law: "free", hold: true, az: -0.75, r: 2.9, elev: 0.55, fov: 37, look: [0.435, -0.061, 0.45], minFrac: 0.05 },
    { n: 6, t: [6.5, 8], law: "arc", hold: true, az: -1.5708, r: 3.8, elev: 0.25, fov: 32, look: [0, 0.38, 0.45] },
    { n: 7, t: [8, 8 + 8 / 24], law: "kill", hold: true, az: -1.2, r: 4.3, elev: 0.8, fov: 28, look: [0.192, -0.069, 0.664] },
    { n: 8, t: [8 + 8 / 24, 8.5], law: "kill", hold: true, az: -1.35, r: 4.1, elev: 0.7, fov: 24, dutch: 6, look: [0.072, -0.052, 0.557] },
    { n: 9, t: [8.5, 9.167], law: "home", hold: true, az: 2.75, r: 3.0, elev: 0.9, fov: 37, look: [-1.931, -0.454, 1.42] },
    { n: 10, t: [9.167, 9.25], law: "home", hold: true, az: 2.75, r: 3.1, elev: 0.95, fov: 37, look: [-1.952, -0.464, 1.403] },
    { n: 11, t: [9.25, 9.333], law: "home", hold: true, az: 2.75, r: 3.1, elev: 0.95, fov: 37, look: [-1.952, -0.464, 1.403] },
    { n: 12, t: [9.333, 10.5], law: "home", hold: true, az: 2.75, r: 3.1, elev: 0.95, fov: 37, look: [-1.952, -0.464, 1.403] },
    { n: 13, t: [10.5, 11.0], law: "home", hold: true, az: 3.0, r: 3.6, elev: 0.7, fov: 38, look: [-0.394, 0.082, -0.081] },
    { n: 14, t: [11.0, 12], law: "home", hold: true, az: 0.45, r: 4.6, elev: 0.55, fov: 36, look: [0, 0.2, 0] },
  ],
  beats: [
    { t: 1.0, name: "flat", frames: 1, col: "#dbe8f4", bypass: true, bars: "keep" },
    { t: 1.0 + 1 / 24, name: "invert", frames: 1 },
    { t: 1.0, name: "ones", dur: 0.5, layers: ["cast", "fx"] },
    { t: 1.0, name: "shake", amp: 0.03, tau: 0.2, hz: 9 },
    { t: 8.0, name: "ones", dur: 0.5, layers: ["cast", "fx"] },
    { t: 8 + 9 / 24, name: "invert", frames: 1 },
    { t: 8 + 10 / 24, name: "flat", frames: 1, col: "#ebeef2", bypass: true, bars: "keep" },
    { t: 4.5, name: "grade", dur: 1.9, split: { shadow: "#020305", high: "#7a8896" }, amt: 0.5, in: 0.5, out: 0.7 },
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((j) => ({ t: (78 + 2 * j) / 12, name: "grade", dur: 1 / 6, ease: "cut", hold: true, split: { shadow: "#06090f", high: cyanStep((j + 1) / 9) }, amt: 0.3 })),
    { t: 8.5, name: "grade", dur: 2, split: { shadow: "#06090f", high: "#a8b0b8" }, amt: 0.3, in: 0.25, hold: true },
    { t: 10.5, name: "grade", dur: 0.5, split: { shadow: "#1c2236", high: "#ffe0ae" }, amt: 0.3, in: 0.4, hold: true },
    { t: 11.0, name: "flat", frames: 2, col: "#c8d0d8", bypass: true, bars: "keep" },
    { t: 11.0 - 2 / 24, name: "ones", dur: 0.5, layers: ["cast", "fx"] },
    { t: 11.0, name: "shake", amp: 0.022, tau: 0.16, hz: 12 },
    { t: 11.1, name: "iris", dur: 0.6, from: 5, to: 0.9, unit: "seal", at: "chest", ease: "out", ring: 3, ringCol: "#e8eef4" },
  ],
  bubbles: [
    { t: [5.5, 6.5], text: "Top contact confirmed. It's the big one.", tone: "bar", who: "narr", side: "c" },
    { t: [6.5, 7.5], text: "They ranked me first. An empty shell with your face.", tone: "bar", who: "foe", side: "c" },
    { t: [8 + 8 / 24, 8 + 9 / 24], text: "Real before padding. Then score. Then index.", tone: "bar", who: "seal", side: "c" },
    { t: [8 + 11 / 24, 9.4], text: "Real before padding. Then score. Then index.", tone: "bar", who: "seal", side: "c" },
  ],
  lines: [],
  sfx: [],
  credit: { t: [9.5, 10.5], text: "tensorflow/tensorflow #128930", sub: "CombinedNonMaxSuppression: one total order. 0 mismatches in 35,000 against the oracle.", style: { size: 0.034, subSize: 0.02, y: "bar", col: "#e8eef4", fade: 0.25 } },
};

// the lock-step high tint: #cfe4ff toward #3ac8ff in ninths
function cyanStep(k) {
  const a = [0xcf, 0xe4, 0xff], b = [0x3a, 0xc8, 0xff];
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
