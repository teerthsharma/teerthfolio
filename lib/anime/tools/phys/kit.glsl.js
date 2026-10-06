// Shared phys kit. Lighting lives in GLSL: n·l, energy split, fwidth cel, luma cap.
// Laws: luma ≤ 0.92; ink never #000; glow only through phEmit (uEmit).

export const KIT_GLSL = /* glsl */ `
  const vec3 PH_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const float PH_CAP = 0.92;
  const vec3 PH_INK = vec3(0.055, 0.048, 0.085);
  const vec3 PH_KEY = vec3(0.86, 0.72, 0.56);
  const vec3 PH_FILL = vec3(0.16, 0.20, 0.34);
  const vec3 PH_MID = vec3(0.50, 0.38, 0.34);
  const vec3 PH_WARM = vec3(0.88, 0.62, 0.42);
  const vec3 PH_COOL = vec3(0.22, 0.32, 0.48);
  const vec3 PH_SKIN = vec3(0.82, 0.58, 0.48);
  const vec3 PH_GOLD = vec3(0.78, 0.58, 0.22);
  const vec3 PH_L0 = vec3(-0.45, 0.55, 0.70);
  const vec3 PH_V0 = vec3(0.0, 0.12, 1.0);
  const float PH_PI = 3.14159265;

  uniform float uEmit;

  float phLuma(vec3 c) { return dot(max(c, 0.0), PH_LUMA); }
  vec3 phFloor(vec3 c) { return max(c, vec3(0.042, 0.036, 0.058)); }
  vec3 phCap(vec3 c) { return c * min(1.0, PH_CAP / max(phLuma(c), 1e-4)); }
  vec3 phOut(vec3 c) { return phCap(phFloor(c)); }
  float phAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
  float phFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float phLine(float d, float px) { float w = fwidth(d) * px + 1e-5; return 1.0 - smoothstep(0.0, w, abs(d)); }
  float phBand(float v, float a, float b) {
    float w = fwidth(v) * 0.75 + 1e-5;
    return smoothstep(a - w, a + w, v) * (1.0 - smoothstep(b - w, b + w, v));
  }

  vec3 phL(float t) { return normalize(PH_L0 + vec3(0.22 * sin(t * 0.7), 0.08 * cos(t * 0.5), 0.0)); }
  vec3 phV() { return normalize(PH_V0); }
  float phNdL(vec3 N, vec3 L) { return max(dot(N, L), 0.0); }
  float phNdV(vec3 N, vec3 V) { return max(dot(N, V), 0.0); }
  vec3 phH(vec3 L, vec3 V) { return normalize(L + V); }
  vec3 phTan(vec3 N) {
    vec3 T = cross(N, vec3(0.0, 1.0, 0.0));
    return normalize(length(T) < 1e-4 ? cross(N, vec3(1.0, 0.0, 0.0)) : T);
  }
  float phKk(vec3 T, vec3 L, vec3 V) {
    float tdl = dot(T, L), tdv = dot(T, V);
    float sL = sqrt(max(1.0 - tdl * tdl, 0.0));
    float sV = sqrt(max(1.0 - tdv * tdv, 0.0));
    return max(tdl * tdv + sL * sV, 0.0);
  }

  float phSchlick(float f0, float cosT) {
    float m = clamp(1.0 - cosT, 0.0, 1.0);
    float m2 = m * m;
    return f0 + (1.0 - f0) * m2 * m2 * m;
  }
  vec3 phSchlick3(vec3 f0, float cosT) {
    float m = clamp(1.0 - cosT, 0.0, 1.0);
    float m5 = m * m * m * m * m;
    return f0 + (vec3(1.0) - f0) * m5;
  }
  float phF0Ior(float eta) {
    float r = (eta - 1.0) / max(eta + 1.0, 1e-4);
    return r * r;
  }
  float phCel(float v, float n) {
    float x = clamp(v, 0.0, 1.0) * n;
    float f = fract(x), w = fwidth(x) * 0.75 + 1e-5;
    return (floor(x) + smoothstep(0.5 - w, 0.5 + w, f)) / n;
  }
  vec3 phCel3(float h) {
    return phOut(mix(mix(PH_FILL, PH_MID, phAA(h, 0.38)), PH_KEY, phAA(h, 0.72)));
  }
  vec3 phCrush(vec3 lin, vec3 albedo) {
    float h = phCel(phLuma(lin), 3.0);
    return phOut(mix(albedo * PH_FILL, albedo * PH_KEY, h));
  }
  vec3 phSphereN(vec2 p) {
    vec2 c = p - vec2(0.72, 0.5);
    float z = sqrt(max(0.0, 0.22 - dot(c, c)));
    return normalize(vec3(c, z + 1e-4));
  }
  float phCover(vec2 p) {
    vec2 c = p - vec2(0.72, 0.5);
    return phAA(0.22 - dot(c, c), 0.0);
  }
  float phEmit(float e) { return max(e, 0.0) * max(uEmit, 0.0); }
  float phH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
  vec2 phH22(vec2 p) { float a = phH21(p); return vec2(a, phH21(p + a + 17.0)); }
  float phVn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(phH21(i), phH21(i + vec2(1.0, 0.0)), f.x), mix(phH21(i + vec2(0.0, 1.0)), phH21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  vec3 phPaper(vec2 p) {
    float fiber = phVn(vec2(p.x * 18.0 + p.y * 2.4, p.y * 3.1)) * 0.5 + phVn(p * 40.0) * 0.18;
    return mix(vec3(0.74, 0.70, 0.64), vec3(0.86, 0.82, 0.76), fiber);
  }
  vec3 phBg(vec2 p) {
    float chk = step(0.5, fract(p.x * 5.0 + p.y * 0.2)) * step(0.5, fract(p.y * 5.0));
    return mix(vec3(0.22, 0.34, 0.52), vec3(0.74, 0.54, 0.38), chk);
  }
  vec3 phDemo(vec2 p, vec3 lit) {
    return phOut(mix(phPaper(p) * 0.55, lit, phCover(p)));
  }
  float phGgxD(float ndh, float a) {
    float a2 = a * a;
    float d = ndh * ndh * (a2 - 1.0) + 1.0;
    return a2 / max(PH_PI * d * d, 1e-5);
  }
  float phSmithG1(float ndx, float a) {
    float a2 = a * a;
    float d = ndx + sqrt(max(a2 + (1.0 - a2) * ndx * ndx, 0.0));
    return 2.0 * ndx / max(d, 1e-5);
  }
  float phSmithG(float ndl, float ndv, float a) {
    return phSmithG1(ndl, a) * phSmithG1(ndv, a);
  }
  vec3 phBend(vec3 I, vec3 N, float eta) {
    float cosi = clamp(dot(-I, N), -1.0, 1.0);
    float k = 1.0 - eta * eta * (1.0 - cosi * cosi);
    return k < 0.0 ? I - 2.0 * dot(I, N) * N : eta * I + (eta * cosi - sqrt(k)) * N;
  }
  vec3 phPlanck(float kelvin) {
    float t = clamp(kelvin, 800.0, 12000.0) * 0.001;
    vec3 c;
    c.r = t < 6.6 ? 1.0 : clamp(1.2929 * pow(max(t - 6.0, 1e-3), -0.1332), 0.0, 1.0);
    c.g = t < 6.6
      ? clamp(0.3901 * log(max(t, 1e-3)) - 0.6316, 0.0, 1.0)
      : clamp(1.1295 * pow(max(t - 5.95, 1e-3), -0.0755), 0.0, 1.0);
    c.b = t > 6.6 ? 1.0 : (t < 1.9 ? 0.0 : clamp(0.5432 * log(max(t - 1.0, 1e-3)) - 0.1092, 0.0, 1.0));
    return c;
  }
`;

export const physKit = {
  name: "physKit",
  doc: "shared phys grammar: n·l, Schlick energy split, fwidth cel, luma cap 0.92, uEmit glow only",
  uniforms: () => ({ uEmit: { value: 1 } }),
  glsl: KIT_GLSL,
};
