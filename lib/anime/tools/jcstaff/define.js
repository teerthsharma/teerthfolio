// defineModule for the J.C.Staff family kit: float uniforms with defaults, the table fields, and a demo are required.
export const SUITS = ["p-faraday", "p-topological-ml-toolkit"];
export function defineModule({ name, doc, draws, use, suits, params, deps, uniforms, glsl, demo }) {
  if (!name || !doc || !draws || !use || !params || !glsl || !demo) throw new Error(`jcstaff module incomplete: ${name ?? "?"}`);
  const u = uniforms ?? {};
  return { name, family: "jcstaff", doc, draws, use, suits: suits ?? SUITS, params, deps: deps ?? ["jcsKit"], glsl, demo,
    uniforms: (opts = {}) => Object.fromEntries(Object.entries(u).map(([k, v]) => [k, { value: opts[k] ?? v }])) };
}
