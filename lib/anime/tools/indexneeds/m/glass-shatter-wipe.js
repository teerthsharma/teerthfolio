import { defineModule } from "./define.js";

export const GLASS_SHATTER_WIPE = defineModule({
  name: "glass-shatter-wipe",
  doc: "wipe of cracking glass: Voronoi shards peel in a travelling front, bright lips, under-plate",
  glsl: /* glsl */ `
  vec3 glassShatterWipe(vec2 p, float t) {
    vec3 under = mix(IM_DUSK, IM_DUSK_PINK, imAA(p.y, 0.42));
    vec3 plate = mix(vec3(0.22, 0.28, 0.40), vec3(0.50, 0.58, 0.68), imAA(p.y, 0.55));
    float front = fract(t * 0.22) * 1.35 - 0.12;
    vec2 cell = p * vec2(7.2, 5.4);
    vec2 w = imVor(cell);
    float shard = imH21(floor(cell));
    float peel = imAA(front - (p.x + shard * 0.10 + w.x * 0.04), 0.0);
    vec3 glass = mix(plate, plate * vec3(0.86, 0.92, 1.02) + IM_WINTER * 0.08, imAA(w.y, 0.08));
    float lip = 1.0 - smoothstep(0.0, fwidth(w.x) * 2.2 + 0.004, w.x);
    glass = mix(glass, vec3(0.82, 0.86, 0.88), lip * 0.55);
    vec3 col = mix(under, glass, 1.0 - peel);
    float cut = imLine(p.x - front + shard * 0.06, 1.6);
    return mix(col, IM_INK, cut * peel * 0.35);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(glassShatterWipe(p, t)); }`,
});
