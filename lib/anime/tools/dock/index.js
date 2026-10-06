// Dock / harbour shader library. Parent wires:
//   import { DOCK_TOOLS } from "./dock/index.js";
//   export const TOOLS = [/* existing */, ...DOCK_TOOLS];
import { defineModule } from "./define.js";
import { dockKit } from "./kit.glsl.js";
import planks from "./planks.js";
import water from "./water.js";
import fog from "./fog.js";
import rust from "./rust.js";
import rope from "./rope.js";
import lamps from "./lamps.js";
import hull from "./hull.js";
import night from "./night.js";

export { defineModule } from "./define.js";
export { dockKit, KIT_GLSL } from "./kit.glsl.js";

export const DOCK_SHADERS = [
  ...planks,
  ...water,
  ...fog,
  ...rust,
  ...rope,
  ...lamps,
  ...hull,
  ...night,
];

export const DOCK_SHADER_COUNT = 50;
if (DOCK_SHADERS.length !== DOCK_SHADER_COUNT) {
  throw new Error(`dock shader count ${DOCK_SHADERS.length} != ${DOCK_SHADER_COUNT}`);
}

export const DOCK_TOOLS = [dockKit, ...DOCK_SHADERS];

export const tool = (name) => {
  const t = DOCK_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime dock tool not found: ${name}`);
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

export const DOCK_FAMILY_COUNTS = {
  planks: planks.length,
  water: water.length,
  fog: fog.length,
  rust: rust.length,
  rope: rope.length,
  lamps: lamps.length,
  hull: hull.length,
  night: night.length,
};
