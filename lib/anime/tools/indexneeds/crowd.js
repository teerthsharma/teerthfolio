import { defineModule } from "./define.js";

export const CROWD = [
  defineModule({
    name: "seal-crowd-instancer",
    family: "cast",
    doc: "hashed pear-seal crowd: same chubby law, size by depth, vest dye from hash, no rat silhouettes",
    glsl: /* glsl */ `
  vec3 sealCrowdInstancer(vec2 p, float t) {
    vec3 col = mix(ixSky(p) * 0.9, ixPaper(p) * 0.55, ixFill(0.32 - p.y));
    float hold = ixHold(t, 6.0);
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      vec2 h = ixH22(vec2(fi, 11.0));
      float depth = mix(0.18, 0.92, h.y);
      float s = mix(0.10, 0.28, 1.0 - depth * 0.65);
      float x = mix(0.08, 1.30, h.x) + 0.03 * sin(t * 1.2 + fi);
      float y = mix(0.22, 0.52, 1.0 - depth);
      vec2 c = vec2(x, y);
      float d = ixPear(p, c, s);
      vec2 q = (p - c) / s;
      float nd = ixNdL(q);
      vec3 fur = ixFur(nd);
      vec3 dye = ixCel3(nd, vec3(0.18, 0.10, 0.16), mix(IX_WHEEL, IX_SU, h.x), mix(vec3(0.62, 0.22, 0.22), IX_SU_H, h.y));
      float vest = ixFill(ixVest(p, c, s));
      vec3 body = mix(fur, dye, vest * 0.85);
      float nose = ixFill(ixEllipse(q, vec2(0.36, 0.50), vec2(0.05, 0.04)));
      body = mix(body, IX_NOSE, nose);
      col = mix(col, body, ixFill(d));
      col = mix(col, IX_INK, ixLine(d, 1.3) * 0.75);
    }
    col += (ixH21(floor(p * 80.0 + hold)) - 0.5) * 0.01;
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return sealCrowdInstancer(p, t); }`,
  }),
];
