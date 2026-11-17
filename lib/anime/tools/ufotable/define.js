// ufotable pack helpers: hex to vec3 literal and the module shape (kit dependency, uniform declarations, table fields).
export const H = (x) => { const n = parseInt(x.slice(1), 16); return `vec3(${[n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(", ")})`; };
export const FAMILY = "ufotable";
export const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
export const DECL = (o) => Object.keys(o).map((k) => `uniform float ${k};`).join("\n");

export function defineUfo(name, { doc, draws, use, suits, params, uni = {}, deps = [], glsl, demo }) {
  if (!name || !doc || !glsl || !demo || !draws || !use || !suits || !params) throw new Error(`ufotable module incomplete: ${name ?? "?"}`);
  return { name, family: FAMILY, doc, draws, use, suits, params, deps: ["ufoKit", ...deps], glsl: `${DECL(uni)}\n${glsl}`, uniforms: U(uni), demo };
}
