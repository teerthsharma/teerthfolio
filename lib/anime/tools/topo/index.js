// Topology shader library. Parent wires:
//   import { TOPO_TOOLS } from "./topo/index.js";
//   export const TOOLS = [/* existing */, ...TOPO_TOOLS];
import { defineModule } from "./define.js";
import { topoKit } from "./kit.glsl.js";
import filtrations from "./filtrations.js";
import persistence from "./persistence.js";
import betti from "./betti.js";
import morse from "./morse.js";
import mapper from "./mapper.js";
import cech from "./cech.js";
import sheaves from "./sheaves.js";
import spectral from "./spectral.js";
import curvature from "./curvature.js";
import dec from "./dec.js";

export { defineModule } from "./define.js";
export { topoKit, KIT_GLSL } from "./kit.glsl.js";

export const TOPO_SHADERS = [
  ...filtrations,
  ...persistence,
  ...betti,
  ...morse,
  ...mapper,
  ...cech,
  ...sheaves,
  ...spectral,
  ...curvature,
  ...dec,
];

export const TOPO_SHADER_COUNT = 150;
if (TOPO_SHADERS.length !== TOPO_SHADER_COUNT) {
  throw new Error(`topo shader count ${TOPO_SHADERS.length} != ${TOPO_SHADER_COUNT}`);
}

export const TOPO_TOOLS = [topoKit, ...TOPO_SHADERS];

export const tool = (name) => {
  const t = TOPO_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime topo tool not found: ${name}`);
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

export const TOPO_FAMILY_COUNTS = {
  filtrations: filtrations.length,
  persistence: persistence.length,
  betti: betti.length,
  morse: morse.length,
  mapper: mapper.length,
  cech: cech.length,
  sheaves: sheaves.length,
  spectral: spectral.length,
  curvature: curvature.length,
  dec: dec.length,
};
