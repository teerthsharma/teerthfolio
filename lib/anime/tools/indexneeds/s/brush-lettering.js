import { defineModule } from "./define.js";

export default defineModule({
  name: "brush-lettering",
  doc: "ink brush: three tapered sausages on cream paper, wet-edge swell, umber not black — calligraphy still",
  glsl: /* glsl */ `
  vec3 brushLettering(vec2 p, float t) {
    vec2 q = p - vec2(0.62, 0.50);
    q.x -= q.y * 0.12;
    vec3 paper = mix(S_PAPER, vec3(0.820, 0.760, 0.660), sAA(p.y, 0.4));
    float d0 = sSeg(q, vec2(-0.22, 0.16), vec2(0.28, 0.10)) - mix(0.012, 0.038, clamp(q.x * 1.4 + 0.4, 0.0, 1.0));
    float d1 = sSeg(q, vec2(-0.04, 0.18), vec2(-0.02, -0.22)) - mix(0.028, 0.010, clamp(-q.y, 0.0, 1.0));
    float d2 = sSeg(q, vec2(-0.16, -0.08), vec2(0.22, -0.14)) - 0.016;
    float d = min(d0, min(d1, d2));
    vec3 ink = vec3(0.145, 0.070, 0.090);
    vec3 col = mix(paper, ink, sFill(d));
    col = mix(col, vec3(0.280, 0.120, 0.140), sLine(d, 1.8) * 0.35);
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return brushLettering(p, t); }`,
});
