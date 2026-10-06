import { defineModule } from "./define.js";

export default defineModule({
  name: "light-wrap",
  doc: "wrap lighting: ndl*0.65+0.35 past the terminator, warm key / cool fill, cream rim opposite the key — anime SSS still",
  glsl: /* glsl */ `
  vec3 lightWrap(vec2 p, float t) {
    vec2 c = vec2(0.72, 0.50);
    float R = 0.26;
    vec3 N = sSphereN(p, c, R);
    vec3 L = normalize(vec3(-0.48, 0.42, 0.62));
    float ndl = max(dot(N, L), 0.0);
    float wrap = clamp(ndl * 0.65 + 0.35, 0.0, 1.0);
    vec3 fill = vec3(0.160, 0.200, 0.380);
    vec3 mid = vec3(0.620, 0.420, 0.380);
    vec3 key = vec3(0.880, 0.700, 0.560);
    vec3 body = sCel3(wrap, 0.40, 0.74, fill, mid, key);
    float rim = pow(1.0 - max(N.z, 0.0), 2.2) * (1.0 - ndl);
    body = mix(body, S_CREAM, sAA(rim, 0.42) * 0.55);
    vec3 field = mix(S_INDIGO, S_VOID, 0.4);
    vec3 col = mix(field, body, sCover(p, c, R));
    col = mix(col, S_INK, sLine(length(p - c) - R, 1.5) * 0.65);
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return lightWrap(p, t); }`,
});
