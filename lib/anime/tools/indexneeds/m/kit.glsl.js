// Index-M grammar. Every module prepends this and ends colour with imOut.
// luma ≤ 0.92. Edges use fwidth. Ink is warm-black / indigo, never crushed black.

export const KIT_GLSL = /* glsl */ `
  const vec3 IM_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const float IM_CAP = 0.92;
  const vec3 IM_INK = vec3(0.070, 0.048, 0.056);
  const vec3 IM_UMBER = vec3(0.16, 0.10, 0.08);
  const vec3 IM_KEY = vec3(0.88, 0.72, 0.54);
  const vec3 IM_FILL = vec3(0.16, 0.22, 0.36);
  const vec3 IM_MID = vec3(0.50, 0.38, 0.34);
  const vec3 IM_FLUORO = vec3(0.78, 0.84, 0.80);
  const vec3 IM_FLUORO_DIM = vec3(0.40, 0.48, 0.50);
  const vec3 IM_BOARD = vec3(0.165, 0.290, 0.196);
  const vec3 IM_RED50 = vec3(0.82, 0.10, 0.16);
  const vec3 IM_BEECH = vec3(0.70, 0.56, 0.36);
  const vec3 IM_BEECH_DARK = vec3(0.40, 0.28, 0.18);
  const vec3 IM_BLAZER = vec3(0.56, 0.10, 0.14);
  const vec3 IM_BLAZER_SHADE = vec3(0.26, 0.06, 0.10);
  const vec3 IM_BLAZER_LIT = vec3(0.70, 0.22, 0.24);
  const vec3 IM_GOLD = vec3(0.78, 0.62, 0.28);
  const vec3 IM_GOLD_BODY = vec3(0.40, 0.26, 0.10);
  const vec3 IM_PAPER = vec3(0.84, 0.80, 0.74);
  const vec3 IM_PAPER_TOOTH = vec3(0.76, 0.72, 0.66);
  const vec3 IM_DUSK = vec3(0.86, 0.64, 0.38);
  const vec3 IM_DUSK_PINK = vec3(0.74, 0.34, 0.50);
  const vec3 IM_WINTER = vec3(0.60, 0.72, 0.80);
  const vec3 IM_SKIN = vec3(0.80, 0.60, 0.54);
  const vec3 IM_SKIN_SHADE = vec3(0.40, 0.24, 0.30);
  const vec3 IM_SKIN_SSS = vec3(0.62, 0.34, 0.36);
  const vec3 IM_COLLAR = vec3(0.84, 0.82, 0.78);
  const vec3 IM_RIBBON = vec3(0.68, 0.12, 0.18);
  const vec3 IM_WALL = vec3(0.58, 0.56, 0.54);
  const vec3 IM_CREAM = vec3(0.70, 0.66, 0.64);
  const vec3 IM_VOID = vec3(0.018, 0.022, 0.054);
  const vec3 IM_ORCH = vec3(0.40, 0.14, 0.38);
  const vec3 IM_TEAL = vec3(0.10, 0.28, 0.42);
  const vec3 IM_EMBER = vec3(0.46, 0.16, 0.08);
  const vec3 IM_MOON = vec3(0.72, 0.70, 0.62);
  const vec3 IM_COLD = vec3(0.38, 0.52, 0.82);
  const vec3 IM_SINO = vec3(0.72, 0.34, 0.22);
  const vec3 IM_MAG = vec3(0.80, 0.16, 0.58);
  const vec3 IM_CITRUS = vec3(0.92, 0.82, 0.28);
  const vec3 IM_FIRE_CORE = vec3(0.90, 0.84, 0.52);
  const vec3 IM_FIRE_MID = vec3(0.88, 0.62, 0.18);
  const vec3 IM_FIRE_EDGE = vec3(0.82, 0.38, 0.12);
  const vec3 IM_FIRE_HOLE = vec3(0.38, 0.14, 0.08);
  const vec3 IM_SOUL = vec3(0.48, 0.78, 0.72);
  const vec3 IM_SOUL_CORE = vec3(0.86, 0.88, 0.80);
  const vec3 IM_SOUL_HALO = vec3(0.38, 0.72, 0.70);
  const vec3 IM_CHABA = vec3(0.22, 0.16, 0.38);
  const vec3 IM_FRINGE = vec3(0.15, 0.10, 0.09);

  float imLuma(vec3 c) { return dot(max(c, vec3(0.0)), IM_LUMA); }
  vec3 imFloor(vec3 c) { return max(c, IM_INK); }
  vec3 imCap(vec3 c) { return c * min(1.0, IM_CAP / max(imLuma(c), 1e-4)); }
  vec3 imOut(vec3 c) { return imCap(imFloor(c)); }

  float imAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
  float imFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float imLine(float d, float px) { float w = fwidth(d) + 1e-6; return 1.0 - smoothstep(px * w * 0.5, w * (px * 0.5 + 0.9), abs(d)); }
  float imBand(float v, float a, float b) { return imAA(v, a) * (1.0 - imAA(v, b)); }
  float imHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1e-4); }

  float imH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
  vec2 imH22(vec2 p) { float a = imH21(p); return vec2(a, imH21(p + a + 17.0)); }
  float imVn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(imH21(i), imH21(i + vec2(1.0, 0.0)), f.x), mix(imH21(i + vec2(0.0, 1.0)), imH21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float imFbm(vec2 p) { return imVn(p) * 0.50 + imVn(p * 2.07 + 1.3) * 0.30 + imVn(p * 4.13 + 4.1) * 0.20; }
  vec2 imWarp(vec2 p, float k) { return p + k * vec2(imFbm(p + vec2(1.7, 9.2)), imFbm(p + vec2(8.3, 2.8))); }

  vec3 imCel3(float h, vec3 dark, vec3 mid, vec3 lit) {
    return mix(mix(dark, mid, imAA(h, 0.38)), lit, imAA(h, 0.72));
  }

  float imBox(vec2 p, vec2 c, vec2 b) {
    vec2 d = abs(p - c) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  float imSeg(vec2 p, vec2 a, vec2 b, float w) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return length(pa - ba * h) - w;
  }
  float imEll(vec2 p, vec2 c, vec2 rad) {
    return length((p - c) / max(rad, vec2(1e-4))) - 1.0;
  }
  float imRing(float r, float r0, float hw) { return abs(r - r0) - hw; }

  vec2 imVor(vec2 p) {
    vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y)); float d = length(g + imH22(i + g) - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return vec2(d1, d2 - d1);
  }

  float imVenetian(vec2 p, float n) {
    float s = p.y * n;
    float g = abs(fract(s) - 0.5);
    float w = fwidth(s) + 1e-5;
    return 1.0 - smoothstep(0.16 - w, 0.16 + w, g);
  }

  vec3 imPaper(vec2 p) {
    float fiber = imVn(vec2(p.x * 22.0 + p.y * 1.8, p.y * 4.0)) * 0.45 + imVn(p * 36.0) * 0.18;
    float tooth = smoothstep(0.32, 0.70, imFbm(p * 8.0));
    return mix(IM_PAPER_TOOTH, IM_PAPER, fiber) * mix(0.94, 1.0, tooth);
  }
  vec3 imWood(vec2 p) {
    float ring = imFbm(vec2(p.x * 3.2, p.y * 14.0 + p.x * 0.4));
    float pore = imVn(p * 28.0) * 0.07;
    return mix(IM_BEECH_DARK, IM_BEECH, imAA(ring, 0.46) * 0.85 + 0.15) * (1.0 - pore);
  }
  vec3 imWool(vec2 p, float h) {
    float nap = imVn(p * 42.0) * 0.05;
    return imCel3(h + nap, IM_BLAZER_SHADE, IM_BLAZER, IM_BLAZER_LIT);
  }
  vec3 imSkin(float h) {
    float wrap = h * 0.72 + 0.14;
    return mix(mix(IM_SKIN_SHADE, IM_SKIN_SSS, imAA(wrap, 0.40)), IM_SKIN, imAA(h, 0.74));
  }

  float imDigitFive(vec2 p) {
    float d = imSeg(p, vec2(-0.06, 0.10), vec2(0.06, 0.10), 0.018);
    d = min(d, imSeg(p, vec2(-0.06, 0.10), vec2(-0.06, 0.01), 0.018));
    d = min(d, imSeg(p, vec2(-0.06, 0.01), vec2(0.05, 0.00), 0.018));
    d = min(d, imSeg(p, vec2(0.05, 0.00), vec2(0.05, -0.09), 0.018));
    d = min(d, imSeg(p, vec2(0.05, -0.09), vec2(-0.06, -0.10), 0.018));
    return d;
  }
  float imDigitZero(vec2 p) {
    return abs(length(p / vec2(0.07, 0.11)) - 1.0) * 0.07 - 0.016;
  }
  float imFifty(vec2 p, vec2 c, float s) {
    vec2 q = (p - c) / max(s, 1e-4);
    return min(imDigitFive(q + vec2(0.10, 0.0)), imDigitZero(q - vec2(0.10, 0.0)));
  }
`;

export const indexMKit = {
  name: "indexMKit",
  doc: "Index-M shared house: fwidth AA, luma cap 0.92, warm-black ink, school / jojo / space tokens",
  deps: [],
  glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    vec3 c = mix(IM_FILL, IM_KEY, imAA(p.y, 0.45));
    float ring = imFill(imRing(length(p - vec2(0.72, 0.50)), 0.22, 0.012));
    return imOut(mix(c, IM_GOLD, ring * 0.55)); }`,
};
