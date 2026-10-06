// Gold / GER / life-giver shader library. Parent wires:
//   import { GOLD_TOOLS } from "./gold/index.js";
//   export const TOOLS = [/* existing */, ...GOLD_TOOLS];
// Do not edit catalog.js from this folder.
import { goldKit } from "./kit.glsl.js";
import flake from "./flake.js";
import bloom from "./bloom.js";
import requiem from "./requiem.js";
import zero from "./zero.js";
import hour from "./hour.js";
import grade from "./grade.js";
import eyes from "./eyes.js";
import pulse from "./pulse.js";

export { goldKit, KIT_GLSL, G } from "./kit.glsl.js";

export const GOLD_SHADERS = [
  ...flake,
  ...bloom,
  ...requiem,
  ...zero,
  ...hour,
  ...grade,
  ...eyes,
  ...pulse,
];

export const GOLD_SHADER_COUNT = 50;
if (GOLD_SHADERS.length !== GOLD_SHADER_COUNT) {
  throw new Error(`gold shader count ${GOLD_SHADERS.length} != ${GOLD_SHADER_COUNT}`);
}

export const GOLD_TOOLS = [goldKit, ...GOLD_SHADERS];

export const tool = (name) => {
  const t = GOLD_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime gold tool not found: ${name}`);
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

export const GOLD_FAMILY_COUNTS = {
  flake: flake.length,
  bloom: bloom.length,
  requiem: requiem.length,
  zero: zero.length,
  hour: hour.length,
  grade: grade.length,
  eyes: eyes.length,
  pulse: pulse.length,
};
