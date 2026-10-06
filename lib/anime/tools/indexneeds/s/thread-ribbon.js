import { defineModule } from "./define.js";

export default defineModule({
  name: "thread-ribbon",
  doc: "Golden Wind thread: sine-warped ribbon SDF with gold face, magenta underside, ink edge — one cloth, not a particle trail",
  glsl: /* glsl */ `
  vec3 threadRibbon(vec2 p, float t) {
    vec3 field = mix(S_VOID, vec3(0.180, 0.060, 0.160), clamp(p.y, 0.0, 1.0));
    float u = clamp((p.x - 0.12) / 0.92, 0.0, 1.0);
    float y0 = 0.50 + 0.12 * sin(u * 6.2831853 + t * 0.7) + 0.05 * sin(u * 12.566 + t);
    float w = mix(0.018, 0.046, sin(u * 3.14159));
    vec2 q = p - vec2(p.x, y0);
    q.y -= 0.04 * sin(u * 9.0 + t * 0.5);
    float d = abs(q.y) - w;
    d = max(d, abs(p.x - 0.58) - 0.40);
    vec3 face = mix(sGold(vec3(0.58, 0.40, 0.10)), S_MAG, sAA(-q.y, 0.0) * 0.45);
    face = mix(face, S_CREAM, sAA(-q.y, 0.012) * 0.35);
    vec3 col = mix(field, face, sFill(d));
    col = mix(col, S_INK, sLine(d, 1.6));
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return threadRibbon(p, t); }`,
});
