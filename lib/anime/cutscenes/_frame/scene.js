// SCENE DATA for _frame: the frame-law test card (lab only, not in DOCKS); schema in CONTRACT.md "Frame law".
//   0.0  bars slide in (plum ink), iris opens on the seal      1.5  split-tone swap (grade beat)      3.0  hard cut to a held shot, hero mid-move
//   3.5  ones window (cast, fx at 24)     4.0  world freeze, cast moving     5.0  one-frame snap zoom, then the kill on held poses (step 4)
//   5.5  flat frame over the bars    6.0  invert frame    6.5  two-colour impact    6.7  tapered spokes on a converge point
//   7.0  2D pan and push over an overscanned plate, footfall shake      10.0  home, shot grade, two-size credit card      11.0  iris closes to a ring
// ?live in the lab URL turns the plates off: the same frames with the world redrawn every frame, the registration ground truth.
const LIVE = typeof window !== "undefined" && /[?&]live\b/.test(window.location.search);

export default {
  id: "_frame",
  title: "Frame law test card",
  anime: "frame law test card",
  style: "modern-anime",
  look: {},
  fps: 12,
  duration: 12,
  seed: 4242,
  far: 400,
  plates: !LIVE,
  palette: {
    zenith: "#4a78c0", skyMid: "#9cc0e8", horizon: "#fbe4c4", far: "#d9c7a0",
    ground: "#cdb88e", groundShade: "#7f7a98", stone: "#b7ad9c", stoneShade: "#6e6a86", pillar: "#e9dcc4", pillarShade: "#9a8fae",
    vane: "#d9483b", vaneShade: "#7a2740", orbit: "#ffd23a", orbitShade: "#b06a1c", orbitHi: "#5ad0ff", orbitHiShade: "#2a5fa8",
  },
  light: { dir: [0.681, 0.588, 0.437], col: [1.0, 0.96, 0.9] },
  frame: {
    ink: "#3a1030",
    box: { ratio: 2.39, slide: 12 },
    split: { shadow: "#22304a", high: "#ffe6c0", amt: 0.25 },
    grain: { amt: 0.03, luma: 1, fps: 12 },
    haze: { col: "#e8c9a6", k: 0.02, start: 6 },
  },
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [{ t: [2.5, 3.5], to: [0.9, 0, 0.2] }, { t: [7, 10], to: [-0.6, 0, 0.4] }], // the hero is mid-move on the cut at 3.0
    track: [{ t: 2.5, pose: "raise", dur: 0.3, hold: 0.6, out: 0.3, k: 1 }, { t: 6.4, pose: "fist", dur: 0.1, hold: 0.5, out: 0.2, k: 1 }],
  },
  shots: [
    { n: 1, t: [0, 3], law: "wide", az: 0.6, r: [7, 6], elev: [2.2, 1.8], fov: 36, look: [0, 0.2, 0] },
    { n: 2, t: [3, 5], law: "arc", hold: true, az: 0.45, r: 3.4, elev: 1.0, fov: 30, look: [0, 0.1, 0] },
    { n: 3, t: [5, 121 / 24], law: "free", ease: "cut", az: 0.2, r: [3, 1.5], elev: 0.6, fov: [30, 18], look: [0, 0.3, 0] },
    { n: 4, t: [121 / 24, 7], law: "kill", step: 4, az: [-0.3, -0.7], r: [2.6, 2.0], elev: [0.9, 0.7], fov: [28, 24], dutch: [0, 6] },
    { n: 5, t: [7, 10], law: "free", overscan: 1.5, pan: [[1, 0.5], [0, 0.5]], zoom: [1, 1.25], ease: "linear", az: 0.3, r: 4.2, elev: 1.2, fov: 30, look: [0, 0.1, 0] },
    { n: 6, t: [10, 12], law: "home", hold: true, r: 3.4, elev: 1.7, look: [0, 0.25, 0.8], grade: { split: { shadow: "#2a1846", high: "#ffe6c0" }, amt: 0.5 } },
  ],
  beats: [
    { t: 0, name: "iris", dur: 1, from: 0, to: 1.4, at: "seal", ease: "out" },
    { t: 1.5, name: "grade", dur: 1.2, split: { shadow: "#0d3b4a", high: "#ffb070" }, amt: 0.6, in: 0.3, out: 0.3 },
    { t: 3.5, name: "ones", dur: 0.5, layers: ["cast", "fx"] },
    { t: 4, name: "freeze", dur: 1, layers: ["world"] },
    { t: 5.5, name: "flat", frames: 2, col: "#e5142e", bars: "paint" },
    { t: 6, name: "invert", frames: 2 },
    { t: 6.5, name: "impact", seq: [[1, 2], [3, 2]], cols: ["#ff8a20", "#3a0a10"] },
    { t: 6.7, name: "speedlines", dur: 0.3, at: [0.5, 0.5], converge: [0.7, 0.4], spokes: 48, taper: 1, strength: 0.7, col: "#fff2c8" },
    { t: 7.5, name: "shake", tau: 0.18, hz: 6, schedule: [{ t: 7.5, amp: 0.0075 }, { t: 8.3, amp: 0.0075 }, { t: 9.1, amp: 0.0075 }] },
    { t: 11, name: "iris", dur: 0.75, to: 1.15, unit: "seal", at: "chest", ring: 3, ease: "in" },
  ],
  bubbles: [{ t: [1, 2.6], text: "a caption inside the lower bar", tone: "bar" }],
  lines: [],
  sfx: [],
  credit: {
    t: [10.2, 11.9], text: "frame law", sub: "bars · iris · grade · clock · camera",
    style: { size: 0.04, subSize: 0.024, y: 0.74, x: 0.3, fade: 0.25, card: { bg: "#f4ecd8", border: "#c9a24a", w: 3 } },
  },
};
