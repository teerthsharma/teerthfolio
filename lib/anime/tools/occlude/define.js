// defineModule: lab-shaped tool record { name, doc, deps, glsl, uniforms?, demo?, demoTex? }.
// Every occlude operator depends on occludeKit so glslFor pulls the compositor grammar once.
export function defineModule(spec) {
  if (spec.name !== "occludeKit") {
    const deps = spec.deps ? spec.deps.slice() : [];
    if (!deps.includes("occludeKit")) deps.unshift("occludeKit");
    spec.deps = deps;
  }
  return spec;
}
