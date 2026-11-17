// Pierrot pack module shape: a tool plus the table fields (draws, use, suits, params) the catalogue copies.
export const SUITS = ["p-epsilon-hollow", "pr-pyrefly-4180", "pr-xnnpack-10801"];

export function defineModule({ name, doc, draws, use, suits = SUITS, params, deps, uniforms, glsl, demo, family = "pierrot" }) {
  if (!name || !doc || !draws || !use || !params || !glsl || !demo) throw new Error(`pierrot module incomplete: ${name ?? "?"}`);
  return { name, doc, family, draws, use, suits, params, deps: deps ?? ["pierrotKit"], uniforms, glsl, demo };
}
