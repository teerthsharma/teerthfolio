// One dusk pier grammar. Island C.wood / C.sea / C.lamp / C.charcoal shifted to dusk:
// wet umber planks, oil-slick teal slip, sodium #ffc46b clamped, slate pilings.
// luma ≤ 0.92 via dkOut; ink is indigo-umber never #000; every edge is fwidth.

export const KIT_GLSL = /* glsl */ `
const vec3 DK_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 DK_INK = vec3(0.055, 0.048, 0.078);
const vec3 DK_WOOD = vec3(0.42, 0.26, 0.16);
const vec3 DK_WET = vec3(0.22, 0.14, 0.10);
const vec3 DK_TAR = vec3(0.09, 0.07, 0.08);
const vec3 DK_SEA = vec3(0.05, 0.22, 0.32);
const vec3 DK_SHAL = vec3(0.10, 0.36, 0.42);
const vec3 DK_OIL = vec3(0.18, 0.12, 0.22);
const vec3 DK_SOD = vec3(0.86, 0.64, 0.28);
const vec3 DK_NAV_G = vec3(0.10, 0.52, 0.34);
const vec3 DK_NAV_R = vec3(0.68, 0.16, 0.14);
const vec3 DK_RUST = vec3(0.52, 0.22, 0.10);
const vec3 DK_SALT = vec3(0.62, 0.58, 0.50);
const vec3 DK_FOG = vec3(0.38, 0.36, 0.42);
const vec3 DK_ROPE = vec3(0.48, 0.36, 0.22);
const vec3 DK_HULL = vec3(0.28, 0.30, 0.34);
const vec3 DK_PAINT = vec3(0.46, 0.42, 0.36);
const vec3 DK_DUSK = vec3(0.16, 0.14, 0.22);
const float DK_WATER_Y = 0.36;
const float DK_DECK_Y = 0.46;
const float DK_CAP = 0.92;

float dkLuma(vec3 c) { return dot(max(c, vec3(0.0)), DK_LUMA); }
vec3 dkFloor(vec3 c) { return max(c, DK_INK); }
vec3 dkCap(vec3 c) { return c * min(1.0, DK_CAP / max(dkLuma(c), 1e-4)); }
vec3 dkOut(vec3 c) { return dkCap(dkFloor(c)); }
float dkAA(float d) { float w = fwidth(d) * 0.85 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float dkFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float dkLine(float d, float px) { float w = fwidth(d) * px + 1e-5; return 1.0 - smoothstep(0.0, w, abs(d)); }
float dkBand(float f, float a, float b) { float w = fwidth(f) * 0.75 + 1e-5; return smoothstep(a - w, a + w, f) * (1.0 - smoothstep(b - w, b + w, f)); }
float dkH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
vec2 dkH22(vec2 p) { float a = dkH21(p); return vec2(a, dkH21(p + a + 17.0)); }
float dkVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(dkH21(i), dkH21(i + vec2(1.0, 0.0)), f.x), mix(dkH21(i + vec2(0.0, 1.0)), dkH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
const mat2 DK_ROT = mat2(1.6, 1.2, -1.2, 1.6);
float dkFbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * dkVn(p); p = DK_ROT * p; a *= 0.5; } return s; }
vec2 dkVor(vec2 p) {
  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); float d = length(g + dkH22(i + g) - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2 - d1);
}
float dkBox(vec2 p, vec2 c, vec2 b) { vec2 d = abs(p - c) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float dkSeg(vec2 p, vec2 a, vec2 b, float w) {
  vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h) - w;
}
vec2 dkLampP() { return vec2(1.02, 0.80); }
float dkWater(vec2 p) { return p.y - DK_WATER_Y; }
float dkPlankU(vec2 p) { return p.x * 7.2; }
float dkPlankGap(vec2 p) { float u = fract(dkPlankU(p)); return min(u, 1.0 - u) - 0.055; }
float dkPiling(vec2 p, float x) { return dkBox(p, vec2(x, 0.20), vec2(0.036, 0.22)); }
float dkPilingField(vec2 p) {
  return min(dkPiling(p, 0.28), min(dkPiling(p, 0.70), dkPiling(p, 1.12)));
}
float dkGrain(vec2 p) {
  float along = p.x * 14.0 + dkFbm(vec2(p.x * 2.2, p.y * 38.0)) * 1.8;
  return dkFbm(vec2(along, p.y * 3.4));
}
float dkWetSheen(vec2 p, float t) {
  float n = 0.55 + 0.45 * (p.y - 0.2) - 0.18 * dkFbm(p * 6.0 + t * 0.05);
  float spec = pow(max(n, 0.0), 18.0);
  float w = fwidth(spec) + 1e-4;
  return smoothstep(0.42 - w, 0.42 + w, spec);
}
float dkCaustic(vec2 p, float t) {
  vec2 q = p * vec2(9.0, 5.5) + vec2(t * 0.38, -t * 0.24);
  return pow(max(sin(q.x) * sin(q.y), 0.0), 2.6);
}
vec3 dkOilFilm(vec2 p, float t, float thick) {
  float phase = thick * 11.0 + t * 0.35 + p.x * 2.8 + p.y * 1.4;
  vec3 film = 0.5 + 0.5 * cos(phase + vec3(0.0, 2.094, 4.189));
  vec3 sheen = mix(DK_SEA, mix(DK_SOD * 0.55, DK_NAV_R * 0.45, film.r), film.g * 0.32);
  return mix(sheen, DK_OIL, 0.22 * film.b);
}
float dkFogAmt(vec2 p, float t) {
  float h = clamp((DK_WATER_Y + 0.18 - p.y) * 2.4, 0.0, 1.0);
  float wisp = dkFbm(vec2(p.x * 1.6 + t * 0.08, p.y * 3.2));
  return h * smoothstep(0.28, 0.72, wisp);
}
vec3 dkSky(vec2 p) {
  float h = clamp(p.y, 0.0, 1.0);
  vec3 c = mix(DK_SEA, DK_DUSK, h);
  c = mix(c, DK_SOD * 0.42, exp(-dot(p - dkLampP(), p - dkLampP()) * 10.0) * 0.55);
  return c;
}
vec3 dkCel3(float h, vec3 a, vec3 b, vec3 c) {
  return mix(mix(a, b, dkAA(h - 0.38)), c, dkAA(h - 0.70));
}
vec3 dkMix3(float u, vec3 a, vec3 b, vec3 c) {
  u = clamp(u, 0.0, 1.0);
  return u < 0.5 ? mix(a, b, u * 2.0) : mix(b, c, u * 2.0 - 1.0);
}
`;

export const dockKit = {
  name: "dockKit",
  doc: "dusk pier grammar: wet umber, oil-slick teal, sodium, fwidth AA, luma 0.92, no #000",
  glsl: KIT_GLSL,
};
