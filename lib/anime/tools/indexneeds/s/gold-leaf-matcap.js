import { defineModule } from "./define.js";

export default defineModule({
  name: "gold-leaf-matcap",
  doc: "Rumbling Renaissance gold-leaf matcap: view-space sphere N, faceted beaten planes, wavelength gold, cream spec sheet — foil still, not glitter noise",
  glsl: /* glsl */ `
  vec3 goldLeafMatcap(vec2 p, float t) {
    vec2 c = vec2(0.72, 0.50);
    float R = 0.28;
    vec3 N = sSphereN(p, c, R);
    vec3 Nf = normalize(floor(N * 3.4 + 0.5) / 3.4);
    vec3 L = normalize(vec3(-0.34, 0.62, 0.72));
    vec3 V = vec3(0.0, 0.08, 1.0);
    vec3 H = normalize(L + V);
    float ndl = max(dot(Nf, L), 0.0);
    float ndh = max(dot(Nf, H), 0.0);
    vec3 body = sCel3(ndl, 0.30, 0.66,
      vec3(0.280, 0.130, 0.055),
      vec3(0.620, 0.400, 0.115),
      vec3(0.860, 0.640, 0.210));
    body = sGold(body);
    float sheet = sAA(ndh, 0.875);
    body = mix(body, S_CREAM, sheet * 0.52);
    vec2 g = abs(fract(Nf.xy * 4.6 + 0.5) - 0.5);
    float crease = sLine(min(g.x, g.y), 1.15);
    body = mix(body, vec3(0.420, 0.200, 0.070), crease * 0.28);
    float fid = fract(dot(Nf, vec3(3.1, 5.7, 7.3)));
    body = mix(body, vec3(0.720, 0.420, 0.100), step(0.55, fid) * 0.14);
    float polar = length(N.xy);
    body = mix(body, vec3(0.380, 0.160, 0.060), sAA(polar, 0.78) * 0.35);
    vec3 field = mix(S_UMBER, vec3(0.220, 0.110, 0.070), clamp(p.y * 0.55, 0.0, 1.0));
    vec3 col = mix(field, body, sCover(p, c, R));
    col = mix(col, S_INK, sLine(length(p - c) - R, 1.6) * 0.55);
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return goldLeafMatcap(p, t); }`,
});
