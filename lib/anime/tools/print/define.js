export function defineModule({ name, doc, deps = ["printKit"], glsl, demo, uniforms }) {
  return { name, doc, deps, glsl, demo, uniforms };
}
