// Occlude compositor tools: screen-glued plates, invert masks, depth-proxy halos,
// time-stop, poster tear, speedlines, impact, FBO-ish passes.
//
// Parent wiring (lib/anime/tools/index.js only — do not edit catalog.js):
//   import { OCCLUDE } from "./occlude/index.js";
//   export const TOOLS = [ /* existing tools */, ...OCCLUDE ];
// Lab after that: /lab/anime?tool=sealEllipse  or  /lab/anime?tool=all
import { occludeKit } from "./kit.glsl.js";
import { SEALS } from "./seals.js";
import { DEPTH } from "./depth.js";
import { INVERT } from "./invert.js";
import { TINT } from "./tint.js";
import { TIMESTOP } from "./timestop.js";
import { TEAR } from "./tear.js";
import { IMPACT } from "./impact.js";
import { SPEED } from "./speed.js";
import { BLUR } from "./blur.js";
import { FBO } from "./fbo.js";

export { defineModule } from "./define.js";
export { occludeKit } from "./kit.glsl.js";
export { SEALS, DEPTH, INVERT, TINT, TIMESTOP, TEAR, IMPACT, SPEED, BLUR, FBO };

export const OCCLUDE = [
  occludeKit,
  ...SEALS, ...DEPTH, ...INVERT, ...TINT, ...TIMESTOP, ...TEAR, ...IMPACT, ...SPEED, ...BLUR, ...FBO,
];

export const OCCLUDE_SHADER_COUNT = 150;

const named = OCCLUDE.filter((t) => t.name !== "occludeKit");
if (named.length !== OCCLUDE_SHADER_COUNT) {
  throw new Error(`occlude expected ${OCCLUDE_SHADER_COUNT} shaders, got ${named.length}`);
}
const seen = new Set();
for (const t of named) {
  if (seen.has(t.name)) throw new Error(`duplicate occlude tool: ${t.name}`);
  seen.add(t.name);
  if (!t.glsl || !t.demo) throw new Error(`occlude ${t.name} missing glsl/demo`);
}

export default OCCLUDE;
