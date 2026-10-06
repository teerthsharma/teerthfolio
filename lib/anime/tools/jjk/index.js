// Modular JJK pack. Aether imports from here. Other docks may too.
// Parent: import { JJK_TOOLS, jjkGlsl } from "./tools/jjk/index.js";

import { jjkKit, KIT_GLSL } from "./kit.glsl.js";
import { VOID } from "./void.js";
import { LIMITLESS } from "./limitless.js";
import { HOLLOW } from "./hollow.js";
import { SIXEYES } from "./sixeyes.js";
import { STITCH } from "./stitch.js";

export { defineModule } from "./define.js";
export { jjkKit, KIT_GLSL } from "./kit.glsl.js";

export const JJK_SHADERS = [...VOID, ...LIMITLESS, ...HOLLOW, ...SIXEYES, ...STITCH];
export const JJK_SHADER_COUNT = 36;
if (JJK_SHADERS.length !== JJK_SHADER_COUNT) {
  throw new Error(`jjk shader count ${JJK_SHADERS.length} != ${JJK_SHADER_COUNT}`);
}

export const JJK_TOOLS = [jjkKit, ...JJK_SHADERS];
export const JJK_BY_NAME = Object.fromEntries(JJK_TOOLS.map((m) => [m.name, m]));

export const JJK_FAMILIES = Object.freeze({
  void: VOID.length,
  limitless: LIMITLESS.length,
  hollow: HOLLOW.length,
  sixeyes: SIXEYES.length,
  stitch: STITCH.length,
});

export function tool(name) {
  const t = JJK_BY_NAME[name];
  if (!t) throw new Error(`jjk tool not found: ${name}`);
  return t;
}

export function jjkGlsl(names) {
  const seen = new Set(), out = [KIT_GLSL];
  for (const n of names) {
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(tool(n).glsl);
  }
  return out.join("\n");
}
