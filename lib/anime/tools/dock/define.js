// defineModule: same shape as sibling tool folders (name, doc, deps, glsl, uniforms, demo).
export function defineModule({ name, doc, deps, uniforms, glsl, demo, demoTex }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`dock module incomplete: ${name ?? "?"}`);
  return { name, doc, deps: deps ?? ["dockKit"], uniforms, glsl, demo, demoTex };
}
