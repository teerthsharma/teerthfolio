// COSTUMES for p-faraday (CAST). Data first: every colour is the bible's hex. Pup frame: metres, +y up, faces +z; the kit
// builds the locked pup body, only the fur tint and the costume layers differ per figure.
import { SphereGeometry, BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { figProp } from "./util.js";

// scale: the pup is 0.8 m tall at scale 1, so metres / 0.8
export const SC = { touma: 0.75 / 0.8, kuroko: 0.6 / 0.8, colony: 0.5 / 0.8 };

// ---- Touma Kamijo seal: dark jacket #2a2f6a open over white shirt #f1f0ff, trousers #14183a, crest #c8342a
// hair: 7 spiky clumps tapering to 0.22 m. lit #3a4a7a, shadow #1a2250 / deep #0a0e2a, thin rim cut #9fe8ff-ish on the lit lane
export const TOUMA = {
  scale: SC.touma,
  layers: [
    { type: "uniform", col: "#f1f0ff", shade: "#b4b0e0", collar: "#f1f0ff" }, // shirt
    { type: "coat", col: "#2a2f6a", shade: "#14183a", open: 0.14, collar: "#2a2f6a" }, // jacket, open front
    { type: "sash", col: "#14183a" }, // trouser belt line
  ],
  hair: { preset: "spiky", count: 7, layers: 1, length: [0.2, 0.26], width: 0.085, spike: 0.92, lift: 0.85, seed: 31, color: { base: "#3a4a7a", shade: "#0a0e2a", hi: "#7fc8e8" }, cut: { at: [0.5, 0.78], slant: 0.1, rate: 0.85 } },
  // eyes: iris two layers #6a4a2a / 60% darker, pupil #0a0a18, tsurime, 2 highlights, lash
  eyes: { style: "tsurime", iris: "#6a4a2a", irisLo: "#2a1c10", pupilCol: "#0a0a18", lash: "#1a1f3a" },
  ink: "#1a1f3a",
};
// ---- Kuroko Shirai seal: cream pinafore #f1e2c0, green armband #2a8f5a / emblem #f1f1f1, twin tails, red ribbons #e8342a
export const KUROKO = {
  scale: SC.kuroko,
  layers: [{ type: "uniform", col: "#f1e2c0", shade: "#b9a0a8", collar: false }],
  hair: { preset: "twintail", count: 12, layers: 1, length: [0.08, 0.14], seed: 7, tail: { n: 5, length: 0.5, width: 0.08, at: [0.2, 0.7, -0.05], mirror: true }, color: { base: "#f2a45a", shade: "#c9702a", hi: "#ffc98a" }, cut: { at: [0.4, 0.7], slant: 0.08, rate: 0.9 } },
  eyes: { style: "tareme", iris: "#3a7ab8", irisLo: "#16304a", pupilCol: "#0a0a18", lash: "#3a2a1a" },
  ink: "#3a2a1a",
};
// ---- colony seals x10: white shirt #f1f0ff, tie in 4 variants, navy bottoms #2a2f6a, single tuft in 4 colours
export const TIES = ["#c8342a", "#2a8f5a", "#2a5fc8", "#e8a02a"];
export const TUFTS = ["#3a2a1a", "#c9702a", "#2a2a2a", "#7a4a2a"];
export const colony = (i) => ({
  scale: SC.colony,
  layers: [{ type: "uniform", col: "#f1f0ff", shade: "#b4b0e0", collar: "#f1f0ff" }],
  hair: { preset: "bob", count: 4, layers: 1, band: [0.05, 0.55], length: [0.05, 0.1], width: 0.09, seed: 40 + (i % 4), color: { base: TUFTS[i % 4], shade: "#0c0a10", hi: "#8a8478" } },
  eyes: { style: "round", iris: "#4a3a2a", irisLo: "#1c140c", lash: "#1a1f3a" },
  ink: "#1a1f3a",
});
// the hero's vest: a cream Tokiwadai-style vest (lit #f1e2c0 / shadow #b9a0a8 / deep #7a5f7e), gold piping #ffa927
export const VEST = { scale: 1, shadow: false, layers: [{ type: "uniform", col: "#f1e2c0", shade: "#b9a0a8", collar: false, buttons: "#ffa927", stripe: "#ffa927" }] };

// ---- loose props that ride a costumed seal's body group ----
export function toumaCrest(ctx) { return figProp(ctx, new SphereGeometry(0.035, 12, 8), "#c8342a", "#7a1810", { pos: [-0.2, 0.33, 0.295], scl: [1, 1, 0.45] }); }
export function kurokoArmband(ctx) { // torus around the upper left flipper (axis along the arm), emblem dot
  const t = figProp(ctx, new TorusGeometry(0.075, 0.03, 8, 18), "#2a8f5a", "#14502e", { pos: [-0.268, 0.3, 0.165], rot: [1.25, 0.25, 0] });
  t.add(figProp(ctx, new SphereGeometry(0.022, 8, 6), "#f1f1f1", "#b8b8c0", { pos: [-0.07, 0.0, 0.0] }));
  return t;
}
export function kurokoRibbon(ctx, side) { // bow at the tail root: two lobes and a knot
  const g = figProp(ctx, new SphereGeometry(0.03, 10, 8), "#e8342a", "#8a1410", { pos: [side * 0.2, 0.72, -0.04] });
  for (const s of [-1, 1]) g.add(figProp(ctx, new ConeGeometry(0.04, 0.09, 8), "#e8342a", "#8a1410", { pos: [s * 0.055, 0, 0], rot: [0, 0, s * -Math.PI / 2] }));
  return g;
}
export function schoolTie(ctx, col) { // tie: knot + blade, on the chest (pup +z side)
  const g = figProp(ctx, new BoxGeometry(0.05, 0.15, 0.018), col, col, { pos: [0, 0.34, 0.318] });
  g.add(figProp(ctx, new SphereGeometry(0.026, 8, 6), col, col, { pos: [0, 0.095, 0.0] }));
  return g;
}
export function navyBottoms(ctx) { return figProp(ctx, new CylinderGeometry(0.3, 0.4, 0.15, 22), "#2a2f6a", "#14183a", { pos: [0, 0.075, 0.0] }); }
