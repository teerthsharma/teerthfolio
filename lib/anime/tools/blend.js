// blend: Photoshop blend modes as GLSL (base a, layer b, linear light): multiply, screen, overlay, colour dodge, colour burn, soft light, linear light, plus layer() for opacity and mask.
export default {
  name: "blend", doc: "Photoshop blend modes (multiply, screen, overlay, colour dodge/burn, soft light, linear light) and a masked layer() mix",
  glsl: /* glsl */ `
  vec3 bMultiply(vec3 a, vec3 b) { return a * b; }
  vec3 bScreen(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }
  vec3 bOverlay(vec3 a, vec3 b) { return mix(2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b), step(0.5, a)); }
  vec3 bDodge(vec3 a, vec3 b) { return a / max(1.0 - b, 1e-3); }      // colour dodge; may exceed 1, so it blooms
  vec3 bBurn(vec3 a, vec3 b) { return 1.0 - (1.0 - a) / max(b, 1e-3); }
  vec3 bSoftLight(vec3 a, vec3 b) { return mix(a - (1.0 - 2.0 * b) * a * (1.0 - a), a + (2.0 * b - 1.0) * (sqrt(a) - a), step(0.5, b)); }
  vec3 bLinearLight(vec3 a, vec3 b) { return a + 2.0 * b - 1.0; }
  vec3 layer(vec3 base, vec3 blended, float opacity, float mask) { return mix(base, blended, clamp(opacity * mask, 0.0, 1.0)); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { // a grey ramp under a red-to-teal layer; bands: none, multiply, screen, overlay, dodge, soft light, burn
    vec3 a = vec3(p.x / 1.44), b = mix(vec3(0.9, 0.1, 0.15), vec3(0.1, 0.7, 0.75), fract(p.y * 7.0));
    int k = int(p.y * 7.0);
    vec3 r = k == 0 ? a : k == 1 ? bMultiply(a, b) : k == 2 ? bScreen(a, b) : k == 3 ? bOverlay(a, b) : k == 4 ? min(bDodge(a, b), 1.0) : k == 5 ? bSoftLight(a, b) : clamp(bBurn(a, b), 0.0, 1.0);
    return r * step(0.01, fract(p.y * 7.0)); }`,
};
