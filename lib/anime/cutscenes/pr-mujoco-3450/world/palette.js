// WORLD palette and layout constants for pr-mujoco-3450 (One Punch Man, Madhouse S1). Bible E01, E02, E13, E17.
// Every hex is the bible's own; ALL is a block of `const vec3 C_<name>` for any GLSL in this folder.
import { V } from "../../../paint.js";

export const HEX = {
  deckTop: "#d9dfee", deckLit: "#aeb8d0", deckMid: "#7f8aa8", deckShadow: "#55607f", deckDeep: "#343c5a", violet: "#4a4f86",
  gapRim: "#6aa3e0", gapMid: "#3e7fd0", gapZen: "#2c53af", warm: "#f5e0b0", ink: "#1d2236", haze: "#8d95ad",
  gLit: "#b9a789", gMid: "#96866c", gShadow: "#6d5f58", gShadowV: "#5b5266", gDeep: "#3b3340", gTop: "#cdbd9e",
  mote: "#fff1d8", white: "#ffffff", sunDisc: "#fff6dc",
};
export const ALL = Object.keys(HEX).map((k) => `const vec3 C_${k} = ${V(HEX[k])};`).join("\n");

// layout, in the SEAL's frame (x right, y up, z forward), metres. The world group sits at the seal and turns with its yaw.
export const HULL = [2.4, 2.0, -1.3];     // where the hull floats (bible E03); the hole opens straight above it
export const DECK_Y = 40;                  // the cloud deck's altitude (E01)
export const HOLE_R = 5.5;                 // 11 m across at full split
export const SHAFT_H = 38.5;               // the shaft's height (E13)
export const CARD = 60;                    // the ground detail cards cover CARD x CARD metres around the seal
export const F = 24;                       // the bible counts frames at 24 fps
export const e3 = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3); // ease-out cubic
export const sm = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); };

// the stand-in for a missing beat: read the scene's own beat table at build time (scene data is read-only)
export const beatOf = (ctx, name) => (ctx.scene.beats ?? []).find((b) => b.name === name);
