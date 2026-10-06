// Shared layer GLSL. Blend modes, luma police, fwidth ink, plate sample.
// Prefix ly* so this never clashes with bk / oc / j / sp / t kits.

export const STASH_GLSL = /* glsl */ `
#ifndef LY_STASH_KIT
#define LY_STASH_KIT
const vec3 LY_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 LY_INK = vec3(0.08, 0.09, 0.18);
const vec3 LY_FILL = vec3(0.16, 0.22, 0.36);
const vec3 LY_MID = vec3(0.52, 0.40, 0.36);
const vec3 LY_KEY = vec3(0.90, 0.74, 0.58);
const vec3 LY_PAPER_A = vec3(0.78, 0.74, 0.68);
const vec3 LY_PAPER_B = vec3(0.90, 0.86, 0.80);
const float LY_CAP = 0.92;

uniform vec2 uRes;
uniform float uEmit;
uniform float uPlateOn;
uniform vec3 uPlateFallback;
uniform float uFps;

float lyLuma(vec3 c) { return dot(max(c, vec3(0.0)), LY_LUMA); }
vec3 lyLift(vec3 c) { return max(c, LY_INK); }
vec3 lyCap(vec3 c) { float L = lyLuma(c); return c * min(1.0, LY_CAP / max(L, 1e-4)); }
vec3 lyPolice(vec3 c) { return lyCap(lyLift(c)); }

float lyAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
float lyFill(float d) { float w = fwidth(d) + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float lyLine(float d, float px) {
  float w = fwidth(d) * px + 1e-5;
  return 1.0 - smoothstep(0.0, w, abs(d));
}
float lyHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1.0); }

float lyHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lyVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(lyHash(i), lyHash(i + vec2(1.0, 0.0)), f.x),
             mix(lyHash(i + vec2(0.0, 1.0)), lyHash(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec3 lyPaper(vec2 p) {
  float fiber = lyVn(vec2(p.x * 18.0 + p.y * 2.4, p.y * 3.1)) * 0.55 + lyVn(p * 42.0) * 0.2;
  return mix(LY_PAPER_A, LY_PAPER_B, fiber);
}

vec2 lyUV() { return gl_FragCoord.xy / max(uRes, vec2(1.0)); }
float lyEllipse(vec2 p, vec2 c, vec2 rad) { return length((p - c) / max(rad, vec2(1e-4))) - 1.0; }

// 0 replace, 1 multiply, 2 screen, 3 add-clamped
vec3 lyBlend(int mode, vec3 dst, vec3 src, float cov) {
  cov = clamp(cov, 0.0, 1.0);
  vec3 mul = dst * src;
  vec3 scr = vec3(1.0) - (vec3(1.0) - dst) * (vec3(1.0) - src);
  vec3 addc = lyCap(dst + src * cov);
  vec3 outc = mode == 1 ? mul : (mode == 2 ? scr : (mode == 3 ? addc : src));
  return lyPolice(mode == 3 ? mix(dst, addc, step(0.0, cov)) : mix(dst, outc, cov));
}

#ifdef LY_HAS_PLATE
uniform sampler2D uPlate;
vec3 lyPlateTex(vec2 uv) { return texture2D(uPlate, uv).rgb; }
#else
vec3 lyPlateTex(vec2 uv) { return uPlateFallback + (uv - uv); }
#endif

vec3 lyPlate(vec2 uv, vec3 fallback) {
  vec3 sampled = lyPlateTex(uv);
  return lyPolice(mix(fallback, sampled, step(0.5, uPlateOn)));
}

vec3 lyEmit(vec3 albedo, vec3 glow) {
  return lyPolice(albedo + glow * max(uEmit, 0.0));
}

// Preview figure: low-poly disc. Polygons = silhouette only.
vec2 lyFigC() { return vec2(0.72, 0.50); }
float lyFigR() { return 0.468; }
float lyFigD(vec2 p) { return length(p - lyFigC()) - lyFigR(); }
vec3 lyFigN(vec2 p) {
  vec2 c = p - lyFigC();
  float z = sqrt(max(0.0, lyFigR() * lyFigR() - dot(c, c)));
  return normalize(vec3(c, z + 1e-4));
}
float lyNdL(vec2 p) { return 0.5 + 0.5 * dot(lyFigN(p), normalize(vec3(-0.45, 0.55, 0.7))); }
float lyCover(vec2 p) { return lyFill(lyFigD(p)); }
#endif
`;

export const layerKit = {
  name: "layerKit",
  doc: "stash compositor grammar: 5-stash blend, luma 0.92, indigo ink, fwidth, uEmit, uPlate fallback",
  uniforms: () => ({
    uRes: { value: { x: 1280, y: 720 } },
    uEmit: { value: 0.55 },
    uPlateOn: { value: 0 },
    uPlateFallback: { value: { x: 0.22, y: 0.18, z: 0.28 } },
    uFps: { value: 12 },
  }),
  glsl: STASH_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    float h = lyNdL(p);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    vec3 plate = mix(lyPaper(p) * 0.55, body, lyCover(p));
    return lyPolice(mix(plate, LY_INK, lyLine(lyFigD(p), 2.0) * 0.85));
  }`,
};

export const snippets = STASH_GLSL;
export const KIT_GLSL = STASH_GLSL;
