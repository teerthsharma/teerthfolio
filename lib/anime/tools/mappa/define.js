// mappa pack: defineModule files one shader whose float uniforms are declared in its GLSL and defaulted in uniforms().
export function defineModule({ name, doc, draws, use, suits, params, deps, uni = {}, glsl, call }) {
  if (!name || !doc || !draws || !use || !suits || !params || !glsl) throw new Error(`mappa module incomplete: ${name ?? "?"}`);
  const decl = Object.keys(uni).map((n) => `uniform float ${n};`).join("\n");
  return {
    name, doc, draws, use, suits, params, deps: deps ?? ["mappaKit"],
    uniforms: (o = {}) => Object.fromEntries(Object.entries(uni).map(([n, v]) => [n, { value: o[n] ?? v }])),
    glsl: `${decl}\n${glsl}`,
    demo: `vec3 demo(vec2 p, float t) { return ${call ?? `${name}(p, t)`}; }`,
  };
}
