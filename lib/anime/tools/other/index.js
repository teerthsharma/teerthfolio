// Other cutscene-world shader library. Parent wires:
//   import { OTHER_TOOLS } from "./other/index.js";
//   export const TOOLS = [/* existing */, ...OTHER_TOOLS];
import { otherKit } from "./kit.glsl.js";
import { RUMBLING } from "./rumbling.js";
import { SHONEN } from "./shonen.js";
import { OVERLORD } from "./overlord.js";
import { TENSURA } from "./tensura.js";
import { MANHWA } from "./manhwa.js";
import { MANGA } from "./manga.js";
import { TEMPLE } from "./temple.js";
import { ICE } from "./ice.js";

export { defineModule } from "./kit.glsl.js";
export { otherKit, KIT_GLSL } from "./kit.glsl.js";

export const OTHER_SHADERS = [
  ...RUMBLING,
  ...SHONEN,
  ...OVERLORD,
  ...TENSURA,
  ...MANHWA,
  ...MANGA,
  ...TEMPLE,
  ...ICE,
];

export const OTHER_SHADER_COUNT = 50;
if (OTHER_SHADERS.length !== OTHER_SHADER_COUNT) {
  throw new Error(`other shader count ${OTHER_SHADERS.length} != ${OTHER_SHADER_COUNT}`);
}

export const OTHER_TOOLS = [otherKit, ...OTHER_SHADERS];

export const tool = (name) => {
  const t = OTHER_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime other tool not found: ${name}`);
  return t;
};

export function glslFor(names) {
  const seen = new Set(), out = [];
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = tool(n);
    for (const d of t.deps ?? []) add(d);
    out.push(`// tool: ${n}\n${t.glsl}`);
  };
  for (const n of names) add(n);
  return out.join("\n");
}

export function uniformsFor(names, opts = {}) {
  const seen = new Set(), u = {};
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = tool(n);
    for (const d of t.deps ?? []) add(d);
    Object.assign(u, t.uniforms?.(opts[n] ?? {}) ?? {});
  };
  for (const n of names) add(n);
  return u;
}

export const OTHER_FAMILY_COUNTS = {
  rumbling: RUMBLING.length,
  shonen: SHONEN.length,
  overlord: OVERLORD.length,
  tensura: TENSURA.length,
  manhwa: MANHWA.length,
  manga: MANGA.length,
  temple: TEMPLE.length,
  ice: ICE.length,
};
