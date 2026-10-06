// INDEX L kit. Printed-anime grammar for every-dock cast + L plates.
// Laws: luma ≤ 0.92; fwidth AA; ink is indigo, never crushed black;
// fur band stays off bloom; chubby-pear seal (wide hips, stub muzzle, no rat).

export const KIT_GLSL = /* glsl */ `
  const vec3 IX_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const float IX_CAP = 0.92;
  const vec3 IX_INK = vec3(0.055, 0.046, 0.088);
  const vec3 IX_KEY = vec3(0.86, 0.70, 0.52);
  const vec3 IX_FILL = vec3(0.16, 0.20, 0.34);
  const vec3 IX_MID = vec3(0.50, 0.38, 0.34);
  const vec3 IX_FUR = vec3(0.78, 0.70, 0.60);
  const vec3 IX_FUR_M = vec3(0.52, 0.42, 0.36);
  const vec3 IX_FUR_S = vec3(0.26, 0.18, 0.24);
  const vec3 IX_NOSE = vec3(0.14, 0.10, 0.16);
  const vec3 IX_PAPER = vec3(0.80, 0.76, 0.70);
  const vec3 IX_TOOTH = vec3(0.72, 0.68, 0.62);
  const vec3 IX_SKY = vec3(0.38, 0.48, 0.64);
  const vec3 IX_GOLD = vec3(0.76, 0.56, 0.22);
  const vec3 IX_CREAM = vec3(0.84, 0.78, 0.66);
  const vec3 IX_SU = vec3(0.16, 0.30, 0.70);
  const vec3 IX_SU_H = vec3(0.42, 0.58, 0.82);
  const vec3 IX_FLAME = vec3(0.76, 0.26, 0.48);
  const vec3 IX_BEAM = vec3(0.86, 0.78, 0.36);
  const vec3 IX_SKIN = vec3(0.68, 0.48, 0.38);
  const vec3 IX_WHEEL = vec3(0.42, 0.12, 0.14);
  const vec2 IX_C = vec2(0.72, 0.46);
  const vec3 IX_L0 = vec3(-0.42, 0.58, 0.68);

  float ixLuma(vec3 c) { return dot(max(c, 0.0), IX_LUMA); }
  vec3 ixFloor(vec3 c) { return max(c, IX_INK); }
  vec3 ixCap(vec3 c) { return c * min(1.0, IX_CAP / max(ixLuma(c), 1e-4)); }
  vec3 ixOut(vec3 c) { return ixCap(ixFloor(c)); }
  float ixAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
  float ixFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float ixLine(float d, float px) { float w = fwidth(d) * px + 1e-5; return 1.0 - smoothstep(0.0, w, abs(d)); }
  float ixBand(float v, float a, float b) {
    float w = fwidth(v) * 0.75 + 1e-5;
    return smoothstep(a - w, a + w, v) * (1.0 - smoothstep(b - w, b + w, v));
  }
  float ixHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1e-4); }
  float ixH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
  vec2 ixH22(vec2 p) { float a = ixH21(p); return vec2(a, ixH21(p + a + 17.0)); }
  float ixVn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(ixH21(i), ixH21(i + vec2(1.0, 0.0)), f.x), mix(ixH21(i + vec2(0.0, 1.0)), ixH21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  const mat2 IX_ROT = mat2(1.6, 1.2, -1.2, 1.6);
  float ixFbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * ixVn(p); p = IX_ROT * p; a *= 0.5; } return s; }
  float ixRidge(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(2.0 * ixVn(p) - 1.0)); p = IX_ROT * p; a *= 0.5; } return s; }

  float ixDisc(vec2 p, vec2 c, float r) { return length(p - c) - r; }
  float ixEllipse(vec2 p, vec2 c, vec2 rad) { return length((p - c) / max(rad, vec2(1e-4))) - 1.0; }
  float ixBox(vec2 p, vec2 c, vec2 b) { vec2 d = abs(p - c) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float ixSeg(vec2 p, vec2 a, vec2 b, float w) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h) - w;
  }
  float ixStar(vec2 p, float n, float r, float inner) {
    float a = atan(p.y, p.x), rad = length(p);
    float k = 6.2831853 / max(n, 2.0);
    float m = abs(mod(a + k * 0.5, k) - k * 0.5);
    float s = mix(r, r * inner, m / (k * 0.5));
    return rad - s;
  }
  vec2 ixPolar(vec2 p, vec2 c) { vec2 q = p - c; return vec2(length(q), atan(q.y, q.x)); }

  vec3 ixCel3(float h, vec3 dark, vec3 mid, vec3 lit) {
    return mix(mix(dark, mid, ixAA(h, 0.38)), lit, ixAA(h, 0.72));
  }
  vec3 ixPaper(vec2 p) {
    float fiber = ixVn(vec2(p.x * 18.0 + p.y * 2.2, p.y * 3.4)) * 0.5 + ixVn(p * 40.0) * 0.18;
    float tooth = smoothstep(0.32, 0.70, ixFbm(p * 8.0));
    return mix(IX_TOOTH, IX_PAPER, fiber) * mix(0.92, 1.0, tooth);
  }
  vec3 ixSky(vec2 p) {
    float g = clamp(p.y * 0.85, 0.0, 1.0);
    return mix(IX_FILL * 1.15, IX_SKY, g);
  }
  vec3 ixFur(float h) {
    return ixCel3(h, IX_FUR_S, IX_FUR_M, IX_FUR);
  }

  // Chubby pear: wide hips, ball head, stub muzzle. No rat tube.
  float ixPear(vec2 p, vec2 c, float s) {
    vec2 q = (p - c) / max(s, 1e-4);
    float hips = ixEllipse(q, vec2(0.00, -0.18), vec2(0.80, 0.52));
    float torso = ixEllipse(q, vec2(0.04, 0.10), vec2(0.58, 0.46));
    float head = ixEllipse(q, vec2(0.10, 0.54), vec2(0.40, 0.38));
    float cheek = ixEllipse(q, vec2(0.28, 0.46), vec2(0.20, 0.16));
    float muzzle = ixEllipse(q, vec2(0.34, 0.50), vec2(0.12, 0.09));
    float fL = ixEllipse(q, vec2(-0.54, -0.40), vec2(0.34, 0.13));
    float fR = ixEllipse(q, vec2(0.50, -0.44), vec2(0.30, 0.12));
    float tail = ixEllipse(q, vec2(-0.44, -0.54), vec2(0.20, 0.10));
    float d = min(hips, min(torso, min(head, min(cheek, min(muzzle, min(fL, min(fR, tail)))))));
    return d * s;
  }
  vec3 ixPearN(vec2 q) {
    return normalize(vec3(q * vec2(1.15, 1.35), 0.58));
  }
  float ixNdL(vec2 q) {
    return clamp(0.5 + 0.5 * dot(ixPearN(q), normalize(IX_L0)), 0.0, 1.0);
  }
  float ixVest(vec2 p, vec2 c, float s) {
    vec2 q = (p - c) / max(s, 1e-4);
    float v = ixBox(q, vec2(0.03, 0.00), vec2(0.44, 0.30));
    float scoop = ixEllipse(q, vec2(0.10, 0.42), vec2(0.30, 0.18));
    return max(v, -scoop) * s;
  }
`;

export const indexKit = {
  name: "indexKit",
  doc: "INDEX L grammar: chubby-pear seal, 3-step cel, printed paper, luma 0.92, indigo ink",
  glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    vec3 c = mix(ixSky(p), ixPaper(p) * 0.55, ixAA(0.34 - p.y, 0.0));
    float d = ixPear(p, IX_C, 0.34);
    vec2 q = (p - IX_C) / 0.34;
    vec3 fur = ixFur(ixNdL(q));
    c = mix(c, fur, ixFill(d));
    c = mix(c, IX_INK, ixLine(d, 1.6) * 0.85);
    return ixOut(c);
  }`,
};
