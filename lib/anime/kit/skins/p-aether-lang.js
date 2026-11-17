// Seal skin for p-aether-lang: the spec's section 3.1 numbers (seal-skins.md), data only.
import { defineSkin } from "../seal-skins.js";

export const skin = defineSkin("p-aether-lang", {
  studio: "MAPPA JJK (Panda ramp, 2 tones)",
  source: "issue #15 4.2 and 2.3; seal-skins.md 3.1",
  body: {
    pose: "sit",
    H: 0.8,
    prims: [
      { shape: "ell", c: [0, 0.1, 0.02], r: [0.2, 0.1, 0.24], paint: "back", k: 0.08 },
      { shape: "ell", c: [0, 0.4, 0], r: [0.296, 0.3, 0.27], paint: "back", k: 0.06 },
      { shape: "ell", c: [0, 0.33, 0.09], r: [0.24, 0.22, 0.2], paint: "back", k: 0.08 }, // volume only; the belly oval is decals.belly
      { shape: "ell", c: [0, 0.62, 0.05], r: [0.2, 0.17, 0.19], paint: "back", k: 0.1 }, // head: raised from the spec 0.70 [0.139, 0.11, 0.16], which reads as a vase
      { shape: "ell", c: [0, 0.67, 0.19], r: [0.07, 0.05, 0.06], paint: "back", k: 0.05 },
      { shape: "ell", c: [0, 0.75, 0.1], r: [0.13, 0.025, 0.08], paint: "back", k: 0.03 },
      { shape: "ell", c: [0.245, 0.3, 0.16], r: [0.06, 0.12, 0.075], paint: "back", k: 0.035, rot: [0.35, -0.55, 0.5] },
      { shape: "ell", c: [-0.245, 0.3, 0.16], r: [0.06, 0.12, 0.075], paint: "back", k: 0.035, rot: [0.35, 0.55, -0.5] },
      { shape: "ell", c: [0, 0.07, -0.3], r: [0.15, 0.07, 0.14], paint: "back", k: 0.08 },
      { shape: "ell", c: [0.1, 0.03, -0.45], r: [0.065, 0.022, 0.12], paint: "back", k: 0.03, rot: [0, 0.55, 0] },
      { shape: "ell", c: [-0.1, 0.03, -0.45], r: [0.065, 0.022, 0.12], paint: "back", k: 0.03, rot: [0, -0.55, 0] },
    ],
  },
  key: {
    back: { col: "#848e9d", shade: "#1c1e21", tau: 0.64 },
    flank: { col: "#bfc4c9", shade: "#898d91", bias: 0.53 },
    belly: { col: "#d5d2cd", shade: "#999794", bias: 0.53 },
    pad: { col: "#c7bfb5", shade: "#8f8982", bias: 0.53 },
    freckle: { col: "#544c46" },
    eye: { col: "#0e0f13" },
  },
  cel: { cut: 0.53, band: 0, keyV: [-0.448, 0.647, 0.617] },
  line: { ink: "#0e0c16", px: 4.4, a: 0.8, gain: 0.5 },
  face: { uFace: [1, 0.13, 0.62, 0.034], eyeCol: "#0e0f13", catch: "#dae0e2", blush: 0 },
  decals: { col: "#d5d2cd", shade: "#999794", belly: [0, 0.33, 0.24, 0.22], muzzle: [0, 0.67, 0.07, 0.05] },
  wear: {
    prims: [
      { shape: "ell", c: [0, 0.46, 0.02], r: [0.22, 0.045, 0.2], col: "#19171f", shade: "#19171f" }, // neck band under the head
      { shape: "ell", c: [0, 0.74, 0], r: [0.15, 0.07, 0.15], col: "#ecebe8", shade: "#b8bcc4" }, // hair cap on the crown
    ],
    hair: { shape: "cone", count: "5-7", col: "#ecebe8", shade: "#b8bcc4", id: 1 },
    eye: { iris: "#7ec8ff", irisShare: 0.4, core: "#0e0f13" },
    cover: 0.25,
  },
  contact: { rx: 0.29, rz: 0.22, tint: "#141728", k: 0.35 },
  fps: 12,
  killFps: 24,
  in: "ink",
  poses: ["sign", "idle", "raise", "point"],
});
