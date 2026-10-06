// cel: hard-edged toon ramps: celSteps(v, n) quantises a value to n flat tones with a pixel-wide AA edge; cel3(v, t1, t2, dark, mid, light) maps a value to 3 flat colours (MAPPA: near-black, body, crisp highlight).
export default {
  name: "cel", doc: "hard-edged toon ramps: n flat tones or a 3-colour cel map with razor shadow edges",
  glsl: /* glsl */ `
  float celStep(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
  float celSteps(float v, float n) { float q = v * n, f = fract(q), w = fwidth(q) * 0.75 + 1e-5; return (floor(q) + smoothstep(0.5 - w, 0.5 + w, f)) / n; }
  vec3 cel3(float v, float t1, float t2, vec3 dark, vec3 mid, vec3 light) { return mix(mix(dark, mid, celStep(v, t1)), light, celStep(v, t2)); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { float v = 0.5 + 0.5 * cos(length(p - vec2(0.72, 0.5)) * 9.0 - t);
    return p.y > 0.5 ? vec3(celSteps(v, 4.0)) : cel3(v, 0.35, 0.8, vec3(0.02, 0.02, 0.06), vec3(0.45, 0.04, 0.1), vec3(1.0, 0.85, 0.85)); }`,
};
