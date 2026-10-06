import { defineModule } from "./define.js";

export const SOUL_FLAME = defineModule({
  name: "soul-flame",
  doc: "Frieren soul flame: swaying teardrop, cyan-white core, blotches, halo, redrawn on twos",
  glsl: /* glsl */ `
  vec3 soulFlame(vec2 p, float t) {
    float dr = imHold(t, 12.0);
    vec3 bg = mix(vec3(0.08, 0.10, 0.20), IM_VOID, imAA(p.y, 0.55));
    vec2 base = vec2(0.70, 0.22);
    float size = 0.32;
    vec2 q = p - base - vec2(0.0, 0.30 * size);
    float yn = clamp(q.y / size, 0.0, 1.2);
    q.x -= 0.18 * size * sin(dr * 5.0 + yn * 3.0) * yn * yn;
    float tear = length(q / vec2(0.28, 0.36) * size) - size * 0.55;
    tear = min(tear, imSeg(q, vec2(0.0, 0.02 * size), vec2(0.0, 0.95 * size), 0.16 * size * (1.0 - yn * 0.7)));
    float a = atan(q.x, q.y);
    float br = imH21(vec2(floor(a * 6.0), dr)) * 0.5 + imH21(vec2(floor(a * 13.0), dr + 3.0)) * 0.5;
    float d = tear + (br - 0.5) * 0.04 * size;
    float m = imFill(d);
    vec3 col = mix(bg, IM_SOUL, m);
    float core = imFill(length((q + vec2(0.0, 0.06 * size)) / 0.50) - size * 0.22);
    col = mix(col, IM_SOUL_CORE, core * m);
    for (int i = 0; i < 3; i++) {
      vec2 h = imH22(vec2(float(i), dr));
      vec2 bc = vec2((h.x - 0.5) * 0.28, 0.12 + h.y * 0.45) * size;
      float bm = imFill(length(q - bc) - (0.035 + 0.025 * h.x) * size);
      col = mix(col, i == 1 ? vec3(0.82, 0.58, 0.64) : vec3(0.86, 0.82, 0.58), bm * m * (1.0 - core));
    }
    float hg = (1.0 - m) * exp(-max(d, 0.0) / (0.22 * size)) * 0.28;
    return mix(col, IM_SOUL_HALO, hg);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(soulFlame(p, t)); }`,
});
