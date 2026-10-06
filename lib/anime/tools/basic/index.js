import { defineModule } from "./define.js";
import { basicKit } from "./kit.glsl.js";
import { CEL_A } from "./cel-a.js";
import { CEL_B } from "./cel-b.js";
import { INK_A } from "./ink-a.js";
import { INK_B } from "./ink-b.js";
import { HATCH_A } from "./hatch-a.js";
import { HATCH_B } from "./hatch-b.js";
import { DITHER } from "./dither.js";
import { GRADE } from "./grade.js";
import { LINES } from "./lines.js";
import { PAPER } from "./paper.js";

export { defineModule, basicKit };

export const BASIC_TOOLS = [
  basicKit,
  ...CEL_A, ...CEL_B,
  ...INK_A, ...INK_B,
  ...HATCH_A, ...HATCH_B,
  ...DITHER,
  ...GRADE,
  ...LINES,
  ...PAPER,
];

export const BASIC_SHADERS = BASIC_TOOLS.filter((t) => t.name !== "basicKit");
export const BASIC_SHADER_COUNT = 150;
if (BASIC_SHADERS.length !== BASIC_SHADER_COUNT) {
  throw new Error(`basic shader count ${BASIC_SHADERS.length} != ${BASIC_SHADER_COUNT}`);
}

export function glslFor(names) {
  const seen = new Set(), out = [];
  const map = new Map(BASIC_TOOLS.map((t) => [t.name, t]));
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = map.get(n);
    if (!t) throw new Error(`basic tool not found: ${n}`);
    for (const d of t.deps ?? []) add(d);
    out.push(`// tool: ${n}\n${t.glsl}`);
  };
  for (const n of names) add(n);
  return out.join("\n");
}

export function uniformsFor(names, opts = {}) {
  const seen = new Set(), u = {};
  const map = new Map(BASIC_TOOLS.map((t) => [t.name, t]));
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = map.get(n);
    if (!t) throw new Error(`basic tool not found: ${n}`);
    for (const d of t.deps ?? []) add(d);
    Object.assign(u, t.uniforms?.(opts[n] ?? {}) ?? {});
  };
  for (const n of names) add(n);
  return u;
}

export const tool = (name) => {
  const t = BASIC_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`basic tool not found: ${name}`);
  return t;
};

export default BASIC_TOOLS;
