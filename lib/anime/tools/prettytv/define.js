// prettytv: defineModule for the modern pretty-TV family kit; float uniforms are declared in the GLSL and valued here.
export const SUITS = "spawn-seal, the-loop, p-asmodeus, p-planimeter, home, p-monodromy, p-caustic";

const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const decl = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");

export function defineModule({ name, doc, glsl, demoExpr, draws, use, suits = SUITS, params, uniforms = {}, deps = ["ptvKit"] }) {
  if (!name || !doc || !glsl || !demoExpr || !draws || !use || !params) throw new Error(`prettytv module incomplete: ${name ?? "?"}`);
  return { name, family: "prettytv", doc, deps, glsl: `${decl(uniforms)}\n${glsl}`, demo: `vec3 demo(vec2 p, float t) { return ${demoExpr}; }`, uniforms: U(uniforms), draws, use, suits, params };
}
