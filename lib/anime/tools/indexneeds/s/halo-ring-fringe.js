import { defineModule } from "./define.js";

export default defineModule({
  name: "halo-ring-fringe",
  doc: "saint fringe: head disc, gold annulus, 16 polar ticks on the outer rim — halo still, not a glow blob",
  glsl: /* glsl */ `
  vec3 haloRingFringe(vec2 p, float t) {
    vec2 c = vec2(0.72, 0.54);
    vec2 q = p - c;
    float r = length(q);
    float a = atan(q.y, q.x);
    vec3 field = mix(S_INDIGO, S_VOID, 0.4);
    vec3 head = sCel3(0.5 + 0.5 * q.x, 0.38, 0.70,
      vec3(0.280, 0.140, 0.160),
      vec3(0.720, 0.520, 0.420),
      vec3(0.880, 0.740, 0.600));
    vec3 col = mix(field, head, sFill(r - 0.12));
    float ring = sLine(r - 0.20, 2.4);
    col = mix(col, S_GOLD, ring);
    float tick = (1.0 - smoothstep(0.04, 0.09, abs(sin(a * 8.0)))) * sBand(r, 0.22, 0.28);
    col = mix(col, S_CREAM, tick * 0.85);
    col = mix(col, S_INK, sLine(r - 0.12, 1.4) * 0.55);
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return haloRingFringe(p, t); }`,
});
