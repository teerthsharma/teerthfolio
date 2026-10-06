import { defineModule } from "./define.js";

export const AURA = [
  defineModule({
    name: "aura-flame",
    family: "fx",
    doc: "soul-aura flame sheet: rising ridge tongues, magenta core, gold lip, violet smoke — Frieren/Aura register",
    glsl: /* glsl */ `
  vec3 auraFlame(vec2 p, float t) {
    vec2 c = vec2(0.72, 0.28);
    vec2 q = p - c;
    vec2 w = q;
    w.y -= t * 0.28;
    w += 0.18 * vec2(ixFbm(w * 3.2 + t * 0.2) - 0.5, ixFbm(w * 2.4 + 4.0) - 0.5);
    float ridge = ixRidge(vec2(w.x * 5.5, w.y * 2.8));
    float env = exp(-pow(q.x / 0.22, 2.0)) * smoothstep(-0.06, 0.08, q.y) * (1.0 - smoothstep(0.55, 0.82, q.y));
    float tongue = pow(clamp(ridge * env * 1.35, 0.0, 1.0), 1.15);
    float core = pow(clamp(env * (0.55 + 0.45 * ixFbm(w * 6.0)), 0.0, 1.0), 1.6);
    vec3 plate = mix(vec3(0.10, 0.08, 0.16), vec3(0.18, 0.10, 0.22), clamp(p.y, 0.0, 1.0));
    vec3 smoke = mix(vec3(0.22, 0.12, 0.32), vec3(0.40, 0.18, 0.42), ridge);
    vec3 mid = IX_FLAME;
    vec3 lip = mix(IX_GOLD, IX_BEAM, 0.35);
    vec3 col = mix(plate, smoke, tongue * 0.55);
    col = mix(col, mid, ixAA(tongue, 0.42));
    col = mix(col, lip, ixAA(core, 0.62) * 0.75);
    float ember = step(0.82, ixH21(floor(p * vec2(40.0, 22.0) + t * 2.0)))
                * exp(-length(q) * 2.2);
    col = mix(col, lip, ember * 0.45);
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return auraFlame(p, t); }`,
  }),
];
