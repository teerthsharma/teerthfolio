// defineModule: same shape as lib/anime/tools (name, doc, deps, glsl, uniforms, demo).
export function defineModule({ name, doc, deps, uniforms, glsl, demo, demoTex }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`topo module incomplete: ${name ?? "?"}`);
  return { name, doc, deps: deps ?? ["topoKit"], uniforms, glsl, demo, demoTex };
}
