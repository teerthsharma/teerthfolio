export function defineModule({ name, doc, deps = ["indexMKit"], glsl, demo, uniforms }) {
  return { name, doc, deps, glsl, demo, uniforms };
}
