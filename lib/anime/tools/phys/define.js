// defineModule: same shape as lib/anime/tools (name, doc, deps, glsl, uniforms, demo).
export function defineModule({ name, doc, deps, uniforms, glsl, demo, demoTex, family }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`phys module incomplete: ${name ?? "?"}`);
  return { name, doc, family, deps: deps ?? ["physKit"], uniforms, glsl, demo, demoTex };
}
