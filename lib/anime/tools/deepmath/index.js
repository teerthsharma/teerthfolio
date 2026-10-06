// Deep-P / deep-math shader library. Parent wires:
//   import { DEEPMATH_TOOLS } from "./deepmath/index.js";
//   export const TOOLS = [/* existing */, ...DEEPMATH_TOOLS];
import { deepmathKit } from "./kit.glsl.js";
import heat from "./heat.js";
import wave from "./wave.js";
import eikonal from "./eikonal.js";
import reaction from "./reaction.js";
import navier from "./navier.js";
import flow from "./flow.js";
import transport from "./transport.js";
import schrodinger from "./schrodinger.js";
import maxwell from "./maxwell.js";
import spectral from "./spectral.js";
import levelset from "./levelset.js";
import perona from "./perona.js";

export { defineModule } from "./define.js";
export { deepmathKit, KIT_GLSL } from "./kit.glsl.js";

export const DEEPMATH_SHADERS = [
  ...heat,
  ...wave,
  ...eikonal,
  ...reaction,
  ...navier,
  ...flow,
  ...transport,
  ...schrodinger,
  ...maxwell,
  ...spectral,
  ...levelset,
  ...perona,
];

export const DEEPMATH_SHADER_COUNT = 60;
if (DEEPMATH_SHADERS.length !== DEEPMATH_SHADER_COUNT) {
  throw new Error(`deepmath shader count ${DEEPMATH_SHADERS.length} != ${DEEPMATH_SHADER_COUNT}`);
}

export const DEEPMATH_TOOLS = [deepmathKit, ...DEEPMATH_SHADERS];

export const tool = (name) => {
  const t = DEEPMATH_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime deepmath tool not found: ${name}`);
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

export const DEEPMATH_FAMILY_COUNTS = {
  heat: heat.length,
  wave: wave.length,
  eikonal: eikonal.length,
  reaction: reaction.length,
  navier: navier.length,
  flow: flow.length,
  transport: transport.length,
  schrodinger: schrodinger.length,
  maxwell: maxwell.length,
  spectral: spectral.length,
  levelset: levelset.length,
  perona: perona.length,
};
