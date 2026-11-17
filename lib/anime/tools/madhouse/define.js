// Madhouse pack: defineModule gives every shader its table fields and the mhKit dependency.
export function defineModule({ name, doc, draws, use, suits, params, deps, uniforms, glsl, demo }) {
  if (!name || !doc || !glsl || !demo || !draws || !use || !suits || !params) throw new Error(`madhouse module incomplete: ${name ?? "?"}`);
  return { name, doc, family: "madhouse", draws, use, suits, params, deps: deps ?? ["mhKit"], uniforms, glsl, demo };
}
export const SUITS = ["p-nerve", "pr-topograph-432", "p-resolvent"];
