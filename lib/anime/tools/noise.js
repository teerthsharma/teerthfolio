// noise: 2D value noise, fbm, ridged, domain warp, Voronoi, brush strokes, ramps and blob SDFs; the base of every painted tool.
//   h21/h22 hash; vn value noise; fbm (6 octaves); ridged (5, folded); warp(p, k) boiling; vor(p) -> (F1, F2 - F1), cracks where y ~ 0;
//   rot(a); strokes(p, ang, len, wid) 0..1 per stroke; ramp3 / ramp4 gradient maps; blob(p, c, r, rough) < 0 inside; aaf(d) AA fill
export default {
  name: "noise", doc: "2D value noise, fbm, ridged, warp, Voronoi, brush strokes, ramps and blob SDFs: the base of every painted tool",
  glsl: /* glsl */ `
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec2 h22(vec2 p) { float a = h21(p); return vec2(a, h21(p + a + 17.0)); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * vn(p); p = ROT * p; a *= 0.5; } return s; }
  float ridged(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * (1.0 - abs(2.0 * vn(p) - 1.0)); p = ROT * p; a *= 0.5; } return s; }
  vec2 warp(vec2 p, float k) { return p + k * vec2(fbm(p + vec2(1.7, 9.2)), fbm(p + vec2(8.3, 2.8))); }
  vec2 vor(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y); float d = length(g + h22(i + g) - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return vec2(d1, d2 - d1); }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  float strokes(vec2 p, float ang, float len, float wid) {
    vec2 q = rot(ang) * p / vec2(len, wid);
    q.x += h21(vec2(floor(q.y), 3.1)) * 7.0;
    vec2 c = floor(q), f = fract(q) - 0.5;
    float shape = (1.0 - smoothstep(0.25, 0.5, abs(f.y))) * (1.0 - smoothstep(0.35, 0.5, abs(f.x)));
    return h21(c) * shape + (1.0 - shape) * h21(c + vec2(0.5, 0.0)) * 0.5;
  }
  vec3 ramp3(float t, vec3 a, vec3 b, vec3 c) { t = clamp(t, 0.0, 1.0); return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, t * 2.0 - 1.0); }
  vec3 ramp4(float t, vec3 a, vec3 b, vec3 c, vec3 d) { t = clamp(t, 0.0, 1.0) * 3.0; return t < 1.0 ? mix(a, b, t) : (t < 2.0 ? mix(b, c, t - 1.0) : mix(c, d, t - 2.0)); }
  float blob(vec2 p, vec2 c, vec2 r, float rough) { vec2 q = (p - c) / r; return (length(q) - 1.0 + rough * (fbm(p * 9.0 + c * 13.0) - 0.5)) * min(r.x, r.y); }
  float aaf(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { // fbm | ridged (top), Voronoi cracks | warped strokes (bottom)
    vec2 q = p * 6.0; float v;
    if (p.y > 0.5) v = p.x < 0.72 ? fbm(q) : ridged(q);
    else if (p.x < 0.72) { vec2 c = vor(q); v = smoothstep(0.0, 0.05, c.y) * (0.4 + 0.6 * c.x); }
    else v = strokes(warp(p, 0.3), 0.8, 0.06, 0.012);
    return vec3(v); }`,
};
