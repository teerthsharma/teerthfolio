// Analytic Genshin lighting chunks. No miHoYo textures.
// Body: half-Lambert → 5-row ramp (lightmap.a analogue).
// Face: FdotL vs cheek SDF, not N·L facets.
// Rim: fwidth silhouette Sobel, not Fresnel.
// Outline: constant-px indigo hull.

export const GENSHIN_GLSL = /* glsl */ `
#ifndef LY_GENSHIN_KIT
#define LY_GENSHIN_KIT

#ifndef LY_STASH_KIT
#error genshin kit needs layerKit first
#endif

// row 0 skin, 1 cloth, 2 metal, 3 hair, 4 leather — Genshin lightmap.a
float gsRow(float row) { return clamp(floor(row + 0.5), 0.0, 4.0); }

float gsHalfL(vec3 N, vec3 L) { return 0.5 + 0.5 * dot(normalize(N), normalize(L)); }

// 3 printed plates, thresholds shift with material row
vec3 gsRamp3(float h, float row, vec3 fill, vec3 mid, vec3 key) {
  float r = gsRow(row);
  float t0 = mix(0.30, 0.46, r / 4.0);
  float t1 = mix(0.60, 0.78, r / 4.0);
  vec3 a = mix(fill, mid, lyAA(h, t0));
  return lyPolice(mix(a, key, lyAA(h, t1)));
}

// Face: u across the cheek, light in the XZ of the head. Same law as material.js id==2.
float gsFaceLit(float u, vec2 Lxz) {
  float az = length(Lxz);
  float s = sign(Lxz.x + 1e-5);
  return smoothstep(-0.06, 0.06, u * s + Lxz.y / max(az, 1e-4));
}

vec3 gsFaceMix(vec3 fill, vec3 key, float u, vec2 Lxz) {
  return lyPolice(mix(fill, key, gsFaceLit(u, Lxz)));
}

// Screen-space hull. Weight grows on concave (Genshin outline width map analogue).
float gsHullW(float d, float concave) {
  return lyInkW(d, concave, 2.0);
}

// Silhouette Sobel: derivative of coverage, never N·V wash.
float gsRimSobel(float cover) {
  return clamp(fwidth(cover) * 10.0, 0.0, 1.0);
}

vec3 gsRim(vec3 col, float cover, vec3 rimCol) {
  float rim = gsRimSobel(cover);
  return lyPolice(mix(col, min(rimCol, vec3(LY_CAP)), rim * 0.55));
}

vec3 gsHairMix(vec3 col, vec3 N, vec3 L, vec3 V, float strand) {
  vec3 T = normalize(vec3(0.0, 1.0, 0.0) - N * N.y + 1e-4);
  vec3 Tp = normalize(T + (0.25 + 0.25 * strand) * N);
  vec3 H = normalize(L + V);
  float th = dot(Tp, H);
  float ring = lyAA(pow(sqrt(max(0.0, 1.0 - th * th)), 24.0), 0.88);
  return lyPolice(mix(col, min(col * 1.28 + 0.08, vec3(LY_CAP)), ring * 0.45));
}

vec3 gsStackCast(vec2 p, float row) {
  float d = lyFigD(p);
  float cover = lyCover(p);
  float h = lyNdL(p);
  vec3 body = gsRamp3(h, row, LY_FILL, LY_MID, LY_KEY);
  vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
  body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
  body = gsRim(body, cover, LY_KEY);
  vec3 plate = mix(lyPaper(p) * 0.52, body, cover);
  return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.88);
}
#endif
`;
