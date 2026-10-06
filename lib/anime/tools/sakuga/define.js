export function defineModule({ name, doc, deps = ["sakugaKit"], glsl, demo, uniforms, family }) {
  return { name, doc, deps, glsl, demo, uniforms, family };
}

export function T(name, family, doc, glsl, demoCall) {
  return defineModule({
    name,
    family,
    doc,
    glsl: /* glsl */ `\n${glsl}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return skOut(${demoCall}); }`,
  });
}
