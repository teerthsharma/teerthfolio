// Shared sakuga / film / print law.
// Theatrical still: held drawings, analog weave, painted light. Ink never #000. luma ≤ 0.92.
import { defineModule } from "./define.js";

export const KIT_GLSL = /* glsl */ `
  const vec3 SK_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const float SK_CAP = 0.92;
  const vec3 SK_INK = vec3(0.078, 0.055, 0.090);
  const vec3 SK_UMBER = vec3(0.16, 0.10, 0.08);
  const vec3 SK_PAPER = vec3(0.84, 0.80, 0.74);
  const vec3 SK_KEY = vec3(0.88, 0.72, 0.54);
  const vec3 SK_MID = vec3(0.50, 0.38, 0.34);
  const vec3 SK_FILL = vec3(0.18, 0.22, 0.34);

  const vec3 SK_MAPPA_CYAN = vec3(0.38, 0.58, 0.68);
  const vec3 SK_MAPPA_MAG = vec3(0.62, 0.28, 0.42);
  const vec3 SK_MAPPA_SKIN = vec3(0.86, 0.70, 0.64);
  const vec3 SK_MAPPA_SHADE = vec3(0.28, 0.22, 0.30);

  const vec3 SK_UFO_WARM = vec3(0.88, 0.62, 0.32);
  const vec3 SK_UFO_COOL = vec3(0.16, 0.20, 0.38);
  const vec3 SK_UFO_SHAFT = vec3(0.86, 0.76, 0.48);

  const vec3 SK_LERCHE_TUBE = vec3(0.74, 0.80, 0.76);
  const vec3 SK_LERCHE_WINTER = vec3(0.58, 0.70, 0.78);
  const vec3 SK_LERCHE_BOUNCE = vec3(0.72, 0.62, 0.48);

  const vec3 SK_GHIB_SKY = vec3(0.48, 0.66, 0.80);
  const vec3 SK_GHIB_CLOUD = vec3(0.86, 0.84, 0.78);
  const vec3 SK_GHIB_GRASS = vec3(0.36, 0.52, 0.28);
  const vec3 SK_GHIB_FIELD = vec3(0.52, 0.62, 0.32);

  const vec3 SK_ARAKI_INK = vec3(0.10, 0.06, 0.16);
  const vec3 SK_ARAKI_CITRUS = vec3(0.90, 0.78, 0.28);
  const vec3 SK_ARAKI_MAG = vec3(0.78, 0.18, 0.48);
  const vec3 SK_ARAKI_CREAM = vec3(0.88, 0.84, 0.76);

  const vec3 SK_MANHWA_ASH = vec3(0.18, 0.16, 0.16);
  const vec3 SK_MANHWA_GREY = vec3(0.46, 0.44, 0.42);
  const vec3 SK_MANHWA_PAPER = vec3(0.82, 0.80, 0.76);
  const vec3 SK_MANHWA_RED = vec3(0.88, 0.12, 0.20);

  const vec3 SK_FRESCO_LIME = vec3(0.78, 0.76, 0.68);
  const vec3 SK_FRESCO_OCHRE = vec3(0.72, 0.48, 0.24);
  const vec3 SK_FRESCO_TERRE = vec3(0.28, 0.42, 0.30);
  const vec3 SK_FRESCO_UMBER = vec3(0.32, 0.20, 0.14);

  const vec3 SK_SHINK_ORANGE = vec3(0.88, 0.48, 0.22);
  const vec3 SK_SHINK_PINK = vec3(0.80, 0.36, 0.42);
  const vec3 SK_SHINK_CYAN = vec3(0.22, 0.40, 0.56);
  const vec3 SK_SHINK_WIRE = vec3(0.10, 0.09, 0.14);

  float skLuma(vec3 c) { return dot(max(c, vec3(0.0)), SK_LUMA); }
  vec3 skFloor(vec3 c) { return max(c, SK_INK); }
  vec3 skCap(vec3 c) { return c * min(1.0, SK_CAP / max(skLuma(c), 1e-4)); }
  vec3 skOut(vec3 c) { return skCap(skFloor(c)); }

  float skAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
  float skFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float skLine(float d, float px) { float w = fwidth(d) + 1e-6; return 1.0 - smoothstep(px * w * 0.5, w * (px * 0.5 + 0.9), abs(d)); }
  float skBand(float v, float a, float b) { return skAA(v, a) * (1.0 - skAA(v, b)); }
  float skHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1e-4); }
  float skTwos(float t) { return skHold(t, 12.0); }

  float skH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
  vec2 skH22(vec2 p) { float a = skH21(p); return vec2(a, skH21(p + a + 17.0)); }
  float skVn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(skH21(i), skH21(i + vec2(1.0, 0.0)), f.x), mix(skH21(i + vec2(0.0, 1.0)), skH21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float skFbm(vec2 p) { return skVn(p) * 0.50 + skVn(p * 2.07 + 1.3) * 0.30 + skVn(p * 4.13 + 4.1) * 0.20; }

  vec3 skSphereN(vec2 p) {
    vec2 c = p - vec2(0.72, 0.50);
    float z = sqrt(max(0.0, 0.22 - dot(c, c)));
    return normalize(vec3(c, z + 1e-4));
  }
  float skCover(vec2 p) {
    vec2 c = p - vec2(0.72, 0.50);
    return skFill(dot(c, c) - 0.22);
  }
  float skNdL(vec2 p) { return 0.5 + 0.5 * dot(skSphereN(p), normalize(vec3(-0.45, 0.55, 0.7))); }
  vec3 skCel3(float h) {
    return mix(mix(SK_FILL, SK_MID, skAA(h, 0.38)), SK_KEY, skAA(h, 0.72));
  }
  vec3 skPaper(vec2 p) {
    float fiber = skVn(vec2(p.x * 16.0 + p.y * 2.2, p.y * 3.0)) * 0.50 + skVn(p * 36.0) * 0.18;
    float tooth = smoothstep(0.32, 0.70, skFbm(p * 8.0));
    return mix(vec3(0.76, 0.72, 0.66), SK_PAPER, fiber) * mix(0.92, 1.0, tooth);
  }
  float skBox(vec2 p, vec2 c, vec2 b) {
    vec2 d = abs(p - c) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  float skSeg(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }
  float skEllipse(vec2 p, vec2 c, vec2 rad) {
    return length((p - c) / max(rad, vec2(1e-4))) - 1.0;
  }
  vec2 skWeave(float t) {
    return vec2(
      sin(t * 23.7 + 1.3) * 0.0016 + sin(t * 3.4) * 0.0005,
      cos(t * 19.1 + 0.6) * 0.0020 + sin(t * 2.2) * 0.0004
    );
  }
  float skGrain(vec2 p, float hold) {
    return (skH21(floor(p * 380.0) + hold * 13.7) - 0.5) * 2.0;
  }
  vec2 skPunch(vec2 p, float hold, float amt) {
    vec2 dir = normalize(vec2(0.92, -0.18));
    float k = skH21(floor(p * 48.0 + hold * 3.0));
    return p + dir * (k - 0.35) * amt;
  }
  vec3 skFigure(vec2 p, float t) {
    float h = skNdL(p);
    return mix(skPaper(p) * 0.92, skCel3(h), skCover(p));
  }
  float skToner(vec2 p, float amt) {
    vec2 q = mat2(0.866, -0.5, 0.5, 0.866) * p * 38.0;
    float d = length(fract(q) - 0.5);
    float r = mix(0.10, 0.36, clamp(amt, 0.0, 1.0));
    return 1.0 - smoothstep(r - fwidth(d) * 1.2, r + fwidth(d) * 1.2, d);
  }
`;

export const sakugaKit = defineModule({
  name: "sakugaKit",
  family: "kit",
  doc: "sakuga print law: held twos, analog weave, painted shafts, luma 0.92, ink never #000",
  deps: [],
  glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return skOut(skFigure(p, t)); }`,
});
