// SCENE DATA for _key, the lab proof of the photography: one held shot that restages the owner's chat-sukuna-seal.jpg
// (the seal as Sukuna, hands in the sign, the toothed shrine behind, red lightning). `&photo=none` shows the same shot unlit; `&photo=<preset>` another mood.
import look from "../../kit/hero/looks/pr-triton-kernels-22.js";
import { veinField } from "../../kit/fx/cel.js";

const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const mood = q.get("photo") ?? "night-red";
const VARIANTS = { a: {}, b: { value: { darks: 0.14, vig: 0.7 }, mist: { amt: 0.15 }, halo: { amt: 0.35 }, glow: { amt: 0.4 } }, c: { key: { amt: 1.2 }, rim: { amt: 1.6, w: 18 }, rim2: { amt: 1.4, w: 16 }, shadow: { amt: 1 } } };
const photo = mood === "none" ? "none" : { preset: mood, beats: [{ t: 2, dur: 0.3, flash: 1, col: "#ffd8c8" }], ...(VARIANTS[q.get("v") ?? "a"] ?? {}) };

export default {
  id: "_key",
  title: "Key frame: the seal as Sukuna",
  anime: "lab",
  style: "modern-anime",
  look: { photo, post: { grain: 0.02 }, lines: { ink: "#0e0508" } },
  frame: { ink: "#0a0305" },
  fps: 12,
  duration: 6,
  seed: 4,
  far: 600,
  plates: true,
  bg: q.get("bg") === "off" ? false : { preset: "red-domain" },
  cel: q.get("cel") === "0" ? [] : [{ kind: "veins", events: veinField({ count: 34, seed: 4, loop: 1.5, width: [0.0025, 0.012], len: [0.4, 1.0] }), body: "#d8141c", far: "#4a0810", core: "#ffd9cf", halo: 0.03, rim: "#ff2a1c" }],
  palette: { roof: "#241018", roofShade: "#0c0408", wall: "#2a1218", wallShade: "#0e0508", pillar: "#7a1420", pillarShade: "#2a060c", ground: "#1c0a10", groundShade: "#0a0306", tooth: "#e8dccb", toothShade: "#8a6a68" },
  seal: { at: [0, 0, 0], yaw: 0, scale: 1, moves: [], hero: look, track: [{ t: 0, pose: q.get("pose") ?? "pray", dur: 0.01, hold: 100, out: 0.01 }, { t: 0, set: { catch: { col: "#d4c4cc", glow: 0.4, n: 2, size: 0.2 } }, dur: 0.01, hold: 100, out: 0.01 }, { t: 0, expr: "grin", dur: 0.01, hold: 100, out: 0.01 }] },
  shots: [{ n: 1, t: [0, 6], law: "free", hold: true, menace: q.get("hold") !== "0" }],
  beats: [{ t: 2, name: "shake", amp: 0.03, tau: 0.2, hz: 10 }, { t: 2, name: "impact", seq: [[1, 2]], cols: ["#ffe0d0", "#2a0408"] }],
  bubbles: [],
  lines: [],
  sfx: [],
  credit: null,
};
