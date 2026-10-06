// Print / film / paper GRADE tools. Parent wires:
//   import { PRINT_TOOLS } from "./print/index.js";
//   export const TOOLS = [/* existing */, ...PRINT_TOOLS];
// Do not edit catalog.js from this folder.
import { printKit } from "./kit.glsl.js";
import rosette from "./rosette.js";
import laid from "./laid.js";
import gate from "./gate.js";
import book from "./book.js";
import fresco from "./fresco.js";
import dusk from "./dusk.js";

export { defineModule } from "./define.js";
export { printKit, KIT_GLSL, P } from "./kit.glsl.js";

export const PRINT_SHADERS = [
  ...rosette,
  ...laid,
  ...gate,
  ...book,
  ...fresco,
  ...dusk,
];

export const PRINT_SHADER_COUNT = 30;
if (PRINT_SHADERS.length !== PRINT_SHADER_COUNT) {
  throw new Error(`print shader count ${PRINT_SHADERS.length} != ${PRINT_SHADER_COUNT}`);
}

export const PRINT_TOOLS = [printKit, ...PRINT_SHADERS];

export const tool = (name) => {
  const t = PRINT_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime print tool not found: ${name}`);
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

export const PRINT_FAMILY_COUNTS = {
  rosette: rosette.length,
  laid: laid.length,
  gate: gate.length,
  book: book.length,
  fresco: fresco.length,
  dusk: dusk.length,
};

export default PRINT_TOOLS;
