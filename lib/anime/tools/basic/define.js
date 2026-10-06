export function defineModule({ name, doc, deps = ["basicKit"], glsl, demo, uniforms }) {
  return { name, doc, deps, glsl, demo, uniforms };
}
