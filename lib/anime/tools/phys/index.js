// Physical shader library. Parent wires:
//   import { PHYS_TOOLS } from "./phys/index.js";
//   export const TOOLS = [/* existing */, ...PHYS_TOOLS];
import { physKit } from "./kit.glsl.js";
import { LAMBERT } from "./lambert.js";
import { OREN } from "./oren.js";
import { SPEC } from "./spec.js";
import { FRESNEL } from "./fresnel.js";
import { FILM } from "./film.js";
import { SKIN } from "./skin.js";
import { EYE } from "./eye.js";
import { HAIR } from "./hair.js";
import { CLOTH } from "./cloth.js";
import { METAL } from "./metal.js";
import { WET } from "./wet.js";
import { ICE } from "./ice.js";
import { WATER } from "./water.js";
import { EMIT } from "./emit.js";

export { defineModule } from "./define.js";
export { physKit, KIT_GLSL } from "./kit.glsl.js";

export const PHYS_SHADERS = [
  ...LAMBERT,
  ...OREN,
  ...SPEC,
  ...FRESNEL,
  ...FILM,
  ...SKIN,
  ...EYE,
  ...HAIR,
  ...CLOTH,
  ...METAL,
  ...WET,
  ...ICE,
  ...WATER,
  ...EMIT,
];

export const PHYS_SHADER_COUNT = 60;
if (PHYS_SHADERS.length !== PHYS_SHADER_COUNT) {
  throw new Error(`phys shader count ${PHYS_SHADERS.length} != ${PHYS_SHADER_COUNT}`);
}

export const PHYS_TOOLS = [physKit, ...PHYS_SHADERS];

export const tool = (name) => {
  const t = PHYS_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime phys tool not found: ${name}`);
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

export const PHYS_FAMILY_COUNTS = {
  lambert: LAMBERT.length,
  oren: OREN.length,
  spec: SPEC.length,
  fresnel: FRESNEL.length,
  film: FILM.length,
  skin: SKIN.length,
  eye: EYE.length,
  hair: HAIR.length,
  cloth: CLOTH.length,
  metal: METAL.length,
  wet: WET.length,
  ice: ICE.length,
  water: WATER.length,
  emit: EMIT.length,
};
