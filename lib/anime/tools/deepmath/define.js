// defineModule: lab-shaped tool record { name, doc, deps, glsl, uniforms?, demo? }.
// Every operator depends on deepmathKit so glslFor pulls the PDE grammar once.
export function defineModule({ name, doc, deps, uniforms, glsl, demo, demoTex, family }) {
  if (!name || !doc || !glsl) throw new Error(`deepmath module incomplete: ${name ?? "?"}`);
  if (name !== "deepmathKit") {
    const d = deps ? deps.slice() : [];
    if (!d.includes("deepmathKit")) d.unshift("deepmathKit");
    deps = d;
    if (!demo) throw new Error(`deepmath demo missing: ${name}`);
  }
  return { name, doc, family, deps: deps ?? [], uniforms, glsl, demo, demoTex };
}

export const D = (family, name, doc, glsl) =>
  defineModule({
    name,
    doc,
    family,
    glsl,
    demo: `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
  });
