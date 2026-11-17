// defineModule for the shinkai pack: the shape of every module plus the table fields the catalogue copies.
export function defineModule({ name, doc, deps = ["shinKit"], uniforms, glsl, demo, draws, use, suits = ["p-tangle"], params, quality = "real" }) {
  if (!name || !doc || !glsl || !demo || !draws || !use) throw new Error(`shinkai module incomplete: ${name ?? "?"}`);
  return { name, doc, family: "shinkai", deps, uniforms, glsl, demo, draws, use, suits, params, quality };
}
