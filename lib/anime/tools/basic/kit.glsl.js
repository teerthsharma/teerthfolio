export const KIT_GLSL = /* glsl */ `
  const vec3 BK_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const vec3 BK_KEY = vec3(0.90, 0.74, 0.58);
  const vec3 BK_FILL = vec3(0.16, 0.22, 0.36);
  const vec3 BK_MID = vec3(0.52, 0.40, 0.36);
  const vec3 BK_INK = vec3(0.08, 0.09, 0.18);
  const vec3 BK_UMBER = vec3(0.18, 0.11, 0.07);
  const float BK_LUMA_MAX = 0.92;
  float bkLuma(vec3 c) { return dot(c, BK_LUMA); }
  vec3 bkCap(vec3 c) { return c * min(1.0, BK_LUMA_MAX / max(bkLuma(c), 1e-4)); }
  float bkAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
  float bkBand(float v, float a, float b) { return bkAA(v, a) * (1.0 - bkAA(v, b)); }
  float bkHold(float t, float fps) { return floor(t * fps + 1e-5) / fps; }
  float bkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 bkHash2(vec2 p) { return vec2(bkHash(p), bkHash(p + 17.3)); }
  float bkVn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(bkHash(i), bkHash(i + vec2(1, 0)), f.x), mix(bkHash(i + vec2(0, 1)), bkHash(i + vec2(1, 1)), f.x), f.y); }
  float bkFbm(vec2 p) { return bkVn(p) * 0.5 + bkVn(p * 2.03 + 3.1) * 0.3 + bkVn(p * 4.1 + 8.2) * 0.2; }
  vec3 bkSphereN(vec2 p) { vec2 c = p - vec2(0.72, 0.5); float z = sqrt(max(0.0, 0.22 - dot(c, c))); return normalize(vec3(c, z + 1e-4)); }
  float bkCover(vec2 p) { return bkAA(0.22 - dot(p - vec2(0.72, 0.5), p - vec2(0.72, 0.5)), 0.0); }
  float bkNdL(vec2 p) { return 0.5 + 0.5 * dot(bkSphereN(p), normalize(vec3(-0.45, 0.55, 0.7))); }
  vec3 bkCel3(float h) {
    return bkCap(mix(mix(BK_FILL, BK_MID, bkAA(h, 0.38)), BK_KEY, bkAA(h, 0.72)));
  }
  vec3 bkWarmCool(float h) {
    vec3 warm = vec3(0.88, 0.68, 0.48), cool = vec3(0.14, 0.22, 0.40);
    return bkCap(mix(cool, warm, bkAA(h, 0.5)));
  }
  vec3 bkPaper(vec2 p) {
    float fiber = bkVn(vec2(p.x * 18.0 + p.y * 2.4, p.y * 3.1)) * 0.55 + bkVn(p * 42.0) * 0.2;
    float tooth = smoothstep(0.35, 0.72, bkFbm(p * 9.0));
    return mix(vec3(0.78, 0.74, 0.68), vec3(0.90, 0.86, 0.80), fiber) * mix(0.92, 1.0, tooth);
  }
  float bkToner(vec2 p, float amt) {
    vec2 q = mat2(0.866, -0.5, 0.5, 0.866) * p * 42.0;
    float d = length(fract(q) - 0.5);
    float r = mix(0.12, 0.38, clamp(amt, 0.0, 1.0));
    return 1.0 - smoothstep(r - fwidth(d) * 1.2, r + fwidth(d) * 1.2, d);
  }
  float bkBayer2(vec2 fc) {
    vec2 i = step(1.0, mod(floor(fc), 2.0));
    return (dot(i, vec2(2.0, 3.0)) - 4.0 * i.x * i.y + 0.5) / 4.0;
  }
  float bkBayer4(vec2 fc) {
    vec2 p = floor(fc);
    float a = bkBayer2(p);
    float b = bkBayer2(p * 0.5);
    return (a + 4.0 * b) / 5.0;
  }
  float bkBayer8(vec2 fc) {
    vec2 p = floor(fc);
    float a = bkBayer2(p);
    float b = bkBayer2(p * 0.5);
    float c = bkBayer2(p * 0.25);
    return (a + 4.0 * b + 16.0 * c) / 21.0;
  }
  float bkBlue(vec2 fc, float seed) {
    vec2 p = fc + seed * 5.588238;
    float n = fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
    float m = fract(sin(dot(floor(fc / 3.0), vec2(12.9898, 78.233))) * 43758.5453);
    return mix(n, m, 0.28);
  }
  vec3 bkMixInk(vec3 col, float k) { return mix(col, BK_INK, clamp(k, 0.0, 1.0)); }
`;

export const basicKit = {
  name: "basicKit",
  doc: "shared house look: 3-step cel, warm key / cool fill, indigo ink, luma cap 0.92, printed paper",
  glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    float h = bkNdL(p);
    vec3 c = mix(bkPaper(p) * 0.55, bkCel3(h), bkCover(p));
    float sil = (1.0 - smoothstep(0.0, fwidth(length(p - vec2(0.72, 0.5))) * 2.2, abs(length(p - vec2(0.72, 0.5)) - sqrt(0.22))));
    return bkCap(bkMixInk(c, sil * 0.85)); }`,
};
