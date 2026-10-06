import { defineModule } from "./define.js";

export default defineModule({
  name: "tomoe-moon",
  doc: "Itachi Tsukuyomi moon: crimson 3-stop disc, three magatama tomoe, gold rim, void pupil — painted still, not a noise field",
  glsl: /* glsl */ `
  vec3 tomoeMoon(vec2 p, float t) {
    vec2 c = vec2(0.70, 0.58);
    vec2 q = p - c;
    float r = length(q);
    float a = atan(q.y, q.x) + t * 0.10;
    vec3 night = mix(S_INDIGO, vec3(0.470, 0.075, 0.118), clamp(p.y * 0.72, 0.0, 1.0));
    night = mix(night, vec3(0.549, 0.129, 0.094), smoothstep(0.58, 0.14, r) * 0.48);
    float ndl = clamp(0.52 + 1.35 * q.x, 0.0, 1.0);
    vec3 face = sCel3(ndl, 0.36, 0.70,
      vec3(0.380, 0.070, 0.095),
      vec3(0.700, 0.105, 0.135),
      vec3(0.820, 0.275, 0.175));
    float moon = sFill(r - 0.22);
    vec3 col = mix(night, face, moon);
    col = mix(col, S_GOLD, sLine(r - 0.22, 2.1) * 0.92);
    float d = 8.0;
    for (int i = 0; i < 3; i++) {
      float ai = a + float(i) * 2.0943951;
      float ca = cos(ai), sa = sin(ai);
      vec2 o = vec2(ca, sa) * 0.108;
      vec2 s = mat2(ca, -sa, sa, ca) * (q - o);
      d = min(d, sTomoe(s * 2.55));
    }
    vec3 pupil = vec3(0.078, 0.020, 0.122);
    col = mix(col, pupil, sFill(d) * moon);
    col = mix(col, pupil, sFill(r - 0.046));
    col = mix(col, S_GOLD * 0.55, sLine(r - 0.046, 1.3) * moon);
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return tomoeMoon(p, t); }`,
});
