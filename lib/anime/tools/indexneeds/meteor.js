import { defineModule } from "./define.js";

export const METEOR = [
  defineModule({
    name: "meteor-impact",
    family: "fx",
    doc: "meteor strike plate: fireball, streak tail, ground shock rings, crater bowl, ember chips",
    glsl: /* glsl */ `
  vec3 meteorImpact(vec2 p, float t) {
    float u = fract(t * 0.22);
    vec2 start = vec2(1.18, 0.92);
    vec2 hit = vec2(0.68, 0.34);
    vec2 ball = mix(start, hit, smoothstep(0.0, 0.72, u));
    vec3 col = mix(vec3(0.10, 0.10, 0.20), vec3(0.28, 0.16, 0.18), clamp(p.y, 0.0, 1.0));
    float ground = p.y - 0.30;
    col = mix(col, vec3(0.22, 0.16, 0.14), ixFill(ground));
    float dirt = ixFbm(p * 5.0);
    col = mix(col, vec3(0.32, 0.22, 0.16), dirt * ixFill(ground) * 0.4);

    vec2 ta = ball - start;
    float th = clamp(dot(p - start, ta) / max(dot(ta, ta), 1e-6), 0.0, 1.0);
    float tw = mix(0.008, 0.055, th);
    float tail = length((p - start) - ta * th) - tw;
    float tailM = ixFill(tail) * (1.0 - smoothstep(0.72, 1.0, u));
    col = mix(col, mix(IX_FLAME, IX_GOLD, th), tailM * 0.85);

    float r = length(p - ball);
    float core = ixFill(r - 0.055);
    float fire = exp(-r * r * 40.0);
    col = mix(col, IX_GOLD, fire * 0.7);
    col = mix(col, IX_CREAM * 0.88, core * 0.8);

    float shock = 0.0;
    if (u > 0.70) {
      float age = (u - 0.70) / 0.30;
      float R = age * 0.42;
      float rr = length(p - hit);
      shock = exp(-pow((rr - R) / 0.03, 2.0)) + 0.55 * exp(-pow((rr - R * 1.35) / 0.05, 2.0));
      float crater = ixEllipse(p, hit, vec2(0.16, 0.06));
      col = mix(col, vec3(0.16, 0.10, 0.10), ixFill(crater) * age);
      col = mix(col, IX_INK, ixLine(crater, 1.4) * age);
    }
    col = mix(col, IX_BEAM, shock * 0.65);
    float ember = step(0.86, ixH21(floor(p * 36.0 + t * 3.0))) * ixFill(0.42 - p.y);
    col = mix(col, IX_GOLD, ember * 0.4);
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return meteorImpact(p, t); }`,
  }),
];
