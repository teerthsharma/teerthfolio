import { defineModule } from "./define.js";

export const SCRIBBLE_HATCH_MASS = defineModule({
  name: "scribble-hatch-mass",
  doc: "angry scribble hatch mass: overlapping diagonal strokes, JoJo menacing / OPM intensity",
  glsl: /* glsl */ `
  vec3 scribbleHatchMass(vec2 p, float t) {
    float hold = imHold(t, 10.0);
    vec3 paper = mix(vec3(0.82, 0.78, 0.70), vec3(0.70, 0.64, 0.56), imFbm(p * 4.0));
    vec3 col = paper;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float ang = 0.55 + fi * 0.19 + 0.08 * sin(hold + fi);
      vec2 dir = vec2(cos(ang), sin(ang));
      vec2 o = vec2(0.70, 0.50) + (imH22(vec2(fi, hold)) - 0.5) * 0.18;
      float u = dot(p - o, dir);
      float v = dot(p - o, vec2(-dir.y, dir.x));
      float stroke = imFill(abs(v) - (0.010 + 0.006 * imH21(vec2(fi, 3.0)))) * imBand(u, -0.28, 0.28);
      float boil = imVn(vec2(u * 20.0, fi + hold));
      stroke *= step(0.22, boil);
      col = mix(col, IM_INK, stroke * 0.82);
    }
    float mass = imFill(imEll(p, vec2(0.70, 0.50), vec2(0.22, 0.18)));
    float h = (p.x + p.y) * 40.0 + hold;
    float g = min(fract(h), 1.0 - fract(h));
    float hw = fwidth(h) + 1e-5;
    float hatch = 1.0 - smoothstep(0.07 - hw, 0.12 + hw, g);
    return mix(col, IM_INK, hatch * mass * 0.55);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(scribbleHatchMass(p, t)); }`,
});
