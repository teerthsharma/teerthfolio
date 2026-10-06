// defineModule: same shape as lib/anime/tools/basic and phys
// (name, doc, deps, glsl, uniforms, demo).
export function defineModule({ name, doc, deps, uniforms, glsl, demo, family }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`indexneeds module incomplete: ${name ?? "?"}`);
  return { name, doc, family, deps: deps ?? ["indexKit"], uniforms, glsl, demo };
}
