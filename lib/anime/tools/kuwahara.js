// kuwahara: painterly edge-preserving smoothing of a texture: kuwahara4 (4 quadrants, the least-variance mean) and kuwahara8 (generalized, 8 Gaussian sectors, Papari / Kyprianidis).
//   kuwahara4(t, uv, res, R) R <= 6 px; kuwahara8(t, uv, res, R) R <= 8 px; both clamp input to 1 (emissive stays out of the dabs)
export default {
  name: "kuwahara", doc: "painterly edge-preserving smoothing: 4-quadrant and generalized 8-sector Kuwahara on any texture",
  glsl: /* glsl */ `
  vec3 kuwahara8(sampler2D t, vec2 uv, vec2 res, float R) {
    vec3 m[8]; vec3 s[8]; float w[8];
    for (int k = 0; k < 8; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); w[k] = 0.0; }
    for (int j = -8; j <= 8; j++) for (int i = -8; i <= 8; i++) {
      vec2 o = vec2(i, j); float l = length(o);
      if (l > R) continue;
      vec3 c = min(texture2D(t, uv + o / res).rgb, vec3(1.0));
      float g = exp(-l * l / (0.5 * R * R));
      float a = atan(o.y, o.x) / 0.785398 + 4.0;
      int k0 = int(floor(a)) - (int(floor(a)) / 8) * 8; float fk = fract(a);
      int k1 = k0 + 1 - ((k0 + 1) / 8) * 8;
      float g0 = g * (1.0 - fk) + (l < 0.5 ? g : 0.0), g1 = g * fk;
      m[k0] += c * g0; s[k0] += c * c * g0; w[k0] += g0;
      m[k1] += c * g1; s[k1] += c * c * g1; w[k1] += g1;
    }
    vec3 acc = vec3(0.0); float ws = 0.0;
    for (int k = 0; k < 8; k++) { if (w[k] < 1e-4) continue; vec3 mu = m[k] / w[k]; float v = dot(s[k] / w[k] - mu * mu, vec3(1.0));
      float a = 1.0 / (1.0 + pow(max(v, 0.0) * 120.0, 2.0)); acc += mu * a; ws += a; }
    return ws > 0.0 ? acc / ws : texture2D(t, uv).rgb;
  }
  vec3 kuwahara4(sampler2D t, vec2 uv, vec2 res, float R) {
    vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0), s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
    for (int j = -6; j <= 6; j++) for (int i = -6; i <= 6; i++) {
      if (abs(float(i)) > R || abs(float(j)) > R) continue;
      vec3 c = min(texture2D(t, uv + vec2(i, j) / res).rgb, vec3(1.0));
      if (i <= 0 && j <= 0) { m0 += c; s0 += c * c; }
      if (i >= 0 && j <= 0) { m1 += c; s1 += c * c; }
      if (i <= 0 && j >= 0) { m2 += c; s2 += c * c; }
      if (i >= 0 && j >= 0) { m3 += c; s3 += c * c; }
    }
    float n = (R + 1.0) * (R + 1.0);
    m0 /= n; m1 /= n; m2 /= n; m3 /= n;
    vec3 v0 = s0 / n - m0 * m0, v1 = s1 / n - m1 * m1, v2 = s2 / n - m2 * m2, v3 = s3 / n - m3 * m3;
    float a = dot(v0, vec3(1.0)), b = dot(v1, vec3(1.0)), c = dot(v2, vec3(1.0)), d = dot(v3, vec3(1.0));
    vec3 k = m0; float e = a;
    if (b < e) { e = b; k = m1; } if (c < e) { e = c; k = m2; } if (d < e) { k = m3; }
    return k;
  }`,
  demoTex: true,
  demo: /* glsl */ `uniform sampler2D tSrc; vec3 demo(vec2 p, float t) { vec2 uv = vec2(p.x / 1.44, p.y), res = vec2(256.0);
    return uv.x < 0.5 ? texture2D(tSrc, uv).rgb : kuwahara8(tSrc, uv, res, 6.0); }`,
};
