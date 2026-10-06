// defineModule: same shape as myth / indexneeds.
// Parent wires: import { JJK_TOOLS } from "./tools/jjk/index.js";
export function defineModule({ name, doc, deps, uniforms, glsl, demo, family }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`jjk module incomplete: ${name ?? "?"}`);
  return { name, doc, family, deps: deps ?? ["jjkKit"], uniforms, glsl, demo };
}
