// Shonen pack: defineModule gives every shader its table fields and the shoKit dependency.
export const SUITS = ["pr-nemo-relay-481", "pr-openxla-46539"];
export function defineModule({ name, doc, draws, use, suits, params, deps, uniforms, glsl, demo }) {
  if (!name || !doc || !glsl || !demo || !draws || !use || !suits || !params) throw new Error(`shonen module incomplete: ${name ?? "?"}`);
  return { name, doc, family: "shonen", draws, use, suits, params, deps: deps ?? ["shoKit"], uniforms, glsl, demo };
}
