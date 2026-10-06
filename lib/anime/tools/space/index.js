// Space / cosmos tool pack. 150 named operators + space-kit grammar.
// Parent wiring (do not edit catalog.js / tools/index.js from this pack):
//   import { SPACE_ALL } from "./space/index.js";
//   TOOLS.push(...SPACE_ALL);
// Lab after wiring: /lab/anime?tool=<name>  e.g. ?tool=bullseye-dome
import spaceKit from "./kit.glsl.js";
import { DOMES } from "./domes.js";
import { NEBULAE } from "./nebulae.js";
import { STARS } from "./stars.js";
import { HOLES } from "./holes.js";
import { ACCRETION } from "./accretion.js";
import { AURORA } from "./aurora.js";
import { COMETS } from "./comets.js";
import { PULSARS } from "./pulsars.js";
import { PLANETS } from "./planets.js";
import { PLATES } from "./plates.js";

export const SPACE = [
  ...DOMES,
  ...NEBULAE,
  ...STARS,
  ...HOLES,
  ...ACCRETION,
  ...AURORA,
  ...COMETS,
  ...PULSARS,
  ...PLANETS,
  ...PLATES,
];

export const SPACE_SHADER_COUNT = 150;
export const SPACE_ALL = [spaceKit, ...SPACE];
export { spaceKit };

if (SPACE.length !== SPACE_SHADER_COUNT) {
  throw new Error(`space pack: expected ${SPACE_SHADER_COUNT} shaders, got ${SPACE.length}`);
}

export default SPACE;
