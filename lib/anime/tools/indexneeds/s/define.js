// defineModule: same shape as sibling tool folders (name, doc, deps, glsl, uniforms, demo).
export function defineModule({ name, doc, deps, uniforms, glsl, demo, demoTex, family }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`index-s module incomplete: ${name ?? "?"}`);
  return { name, doc, family: family ?? "index-s", deps: deps ?? ["indexSKit"], uniforms, glsl, demo, demoTex };
}
