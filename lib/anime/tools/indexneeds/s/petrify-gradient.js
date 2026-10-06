import { defineModule } from "./define.js";

export default defineModule({
  name: "petrify-gradient",
  doc: "stone climb: warm flesh to 3-stop basalt along y, hard climb lip with gold burn — petrify wipe, not a grain field",
  glsl: /* glsl */ `
  vec3 petrifyGradient(vec2 p, float t) {
    vec2 c = vec2(0.72, 0.48);
    float R = 0.26;
    vec3 N = sSphereN(p, c, R);
    float ndl = 0.5 + 0.5 * dot(N, normalize(vec3(-0.4, 0.55, 0.7)));
    vec3 flesh = sCel3(ndl, 0.40, 0.74,
      vec3(0.239, 0.125, 0.149),
      vec3(0.690, 0.478, 0.400),
      vec3(0.886, 0.773, 0.541));
    vec3 stone = sCel3(ndl, 0.34, 0.66,
      vec3(0.137, 0.118, 0.165),
      vec3(0.353, 0.290, 0.388),
      vec3(0.627, 0.541, 0.439));
    float climb = 0.38 + 0.08 * sin(t * 0.5);
    float wipe = sAA(climb - p.y, 0.0);
    vec3 body = mix(flesh, stone, wipe);
    body = mix(body, S_GOLD, sLine(p.y - climb, 2.0) * 0.65);
    vec3 field = mix(S_VOID, S_INDIGO, 0.5);
    vec3 col = mix(field, body, sCover(p, c, R));
    col = mix(col, vec3(0.165, 0.122, 0.114), sLine(length(p - c) - R, 1.5));
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return petrifyGradient(p, t); }`,
});
