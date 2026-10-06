// THE PAINT KIT: anime backgrounds are 2D paintings under a fixed camera, so a background is
// painted procedurally, in screen space, once per shot (it becomes the plate and gets the plate
// filters). A painting is GLSL `vec3 paint(vec2 p)` built from this kit, where p is the frame in
// height units: x in [0, aspect], y in [0, 1], y up. Values above 1 are emissive (they bloom).
//
// Kit (all value-space, no lighting rig):
//   h21 / vn / fbm / ridged      noise; ridged = 1 - |2n - 1| folded, for stone and storm edges
//   warp(p, k)                   domain warp, the "boiling" in clouds and smoke
//   vor(p)                       Voronoi: x = F1, y = F2 - F1 (crack lines where y ~ 0)
//   strokes(p, ang, len, wid)    a field of short brush strokes along an angle: 0..1 per stroke
//   ramp3 / ramp4                gradient maps from a value to a sampled palette
//   blob(p, c, r, rough)         a noisy ellipse SDF (rocks, bushes, cloud masses); < 0 inside
//   aaf(d)                       antialiased fill of an SDF
import { Mesh, PlaneGeometry, ShaderMaterial, Color, Vector2 } from "three";

export const KIT = /* glsl */ `
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
  // brush strokes: a grid of cells along the angle, each holding one stroke with its own tone
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
  float aaf(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
`;

// hex (sRGB) -> GLSL vec3 in linear light
export const V = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

// a painting as a fullscreen layer at the far plane; alpha carries the set id (0.5: no sky id,
// so the plate's set-only steps apply). body: GLSL defining `vec3 paint(vec2 p)`.
export function painting(shared, body, o = {}) {
  const m = new ShaderMaterial({
    depthWrite: false,
    uniforms: { uRes: shared.uRes, uTime: shared.uTime, ...(o.uniforms ?? {}) },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }",
    fragmentShader: `uniform vec2 uRes; uniform float uTime; varying vec2 vUv; ${KIT} ${body}
      void main() { vec2 p = vec2(vUv.x * uRes.x / uRes.y, vUv.y); gl_FragColor = vec4(paint(p), ${(o.id ?? 0.5).toFixed(3)}); }`,
  });
  const q = new Mesh(new PlaneGeometry(2, 2), m);
  q.frustumCulled = false; q.renderOrder = -20;
  return q;
}
