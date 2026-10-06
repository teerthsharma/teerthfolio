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
import { BackSide, Color, HalfFloatType, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry, Vector2, Vector4, WebGLRenderTarget } from "three";

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

// STORM (kit): boiling cloud masses from warped fbm + ridged noise; light reaching a point from a
// source is marched through the density (2D Beer-Lambert), which gives the masses real internal
// structure and lit rims; lightning as displaced bright filaments. All in (azimuth, elevation).
export const KIT_STORM = /* glsl */ `
  uniform float uStormScale;
  float stormDens(vec2 p) { vec2 q = warp(p * vec2(1.5, 2.6) * uStormScale + 2.0, 0.7);
    float d = fbm(q) + 0.4 * ridged(q * 2.2) - 0.24 + 0.06 * (vn(q * 12.0) - 0.5);   // cauliflower lumps on the edges
    return smoothstep(0.44, 0.6, d); }
  float stormLight(vec2 p, vec2 L) { vec2 dir = L - p; float len = length(dir); dir /= max(len, 1e-4);
    float acc = 0.0; for (int i = 1; i <= 8; i++) acc += stormDens(p + dir * min(float(i) * 0.03 / uStormScale, len)); return exp(-acc * 0.2); }
  vec3 bolt2(vec2 p, vec2 a, vec2 b, float seed, vec3 col) {
    float u = (p.y - a.y) / (b.y - a.y);
    if (u < 0.0 || u > 1.0) return vec3(0.0);
    float x = mix(a.x, b.x, u) + (fbm(vec2(u * 9.0, seed)) - 0.5) * 0.06 + (vn(vec2(u * 60.0, seed)) - 0.5) * 0.012 + (vn(vec2(u * 180.0, seed)) - 0.5) * 0.004;
    float d = abs(p.x - x);
    float br = step(0.55, u) * abs(p.x - (x + (u - 0.55) * 0.25 + (vn(vec2(u * 50.0, seed + 3.0)) - 0.5) * 0.01));
    float e = min(d, u > 0.55 ? br : 9.0);
    return col * ((1.0 - smoothstep(0.0005, 0.0016, e)) * 1.6 + exp(-e / 0.006) * 0.25 * (1.0 - u * 0.5));
  }
`;

// PUFFS (kit): cloud masses as a union of spheres seen from the front (cumulus, cumulonimbus,
// smoke). puffBanks() builds the puffs on the CPU from banks [az0, az1, base el, peak el, columns,
// depth, root radius]; each column stacks at most 8 shrinking puffs; the GLSL returns the nearest surface's normal and coverage, so a sky shades real billows.
export function puffBanks(seed, banks, extra = 0, max = 96) {
  let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const P = [];
  for (const [a0, a1, base, peak, cols, z0, r0 = 0.06] of banks) {
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols, x = a0 + (a1 - a0) * u, H = peak * (0.35 + 0.65 * Math.sin(Math.PI * u)) * (0.7 + 0.6 * R());
      let y = base, r = r0 + r0 * 0.6 * R();
      for (let k = 0; k < 8 && y < base + H && P.length < max; k++) { P.push([x + (R() - 0.5) * r0, y, r, z0 + (1 - (y - base) / Math.max(H, 0.01)) * r0 + R() * r0 * 0.3]); y += r * 0.8; r *= 0.9; }
    }
  }
  for (let i = 0; i < extra && P.length < max; i++) P.push([-0.6 + 1.2 * R(), 0.3 + 0.2 * R(), 0.025 + 0.02 * R(), 0.2]);
  return P;
}
export const puffUniforms = (P) => ({ uPuff: { value: Array.from({ length: 96 }, (_, i) => new Vector4(...(P[i] ?? [0, 0, 0, 0]))) }, uN: { value: P.length } });
export const KIT_PUFFS = /* glsl */ `
  uniform vec4 uPuff[96]; uniform float uN;
  // xyz: the normal of the nearest puff surface (z toward the viewer), w: coverage 0..1 (soft edge)
  vec4 puffs(vec2 p, float erode) {
    vec2 pe = p + (vec2(fbm(p * 38.0), fbm(p * 38.0 + 7.0)) - 0.5) * erode;
    float bz = -1.0; vec3 bn = vec3(0.0);
    for (int i = 0; i < 96; i++) { if (float(i) >= uN) break; vec4 P = uPuff[i]; vec2 q = pe - P.xy;
      float r = P.z * (1.0 + 0.1 * (vn(vec2(atan(q.y, q.x) * 2.5, float(i) * 3.7)) - 0.5));
      float r2 = dot(q, q) / (r * r);
      if (r2 < 1.0) { float z = P.w + sqrt(1.0 - r2) * r; if (z > bz) { bz = z; bn = normalize(vec3(q / r, sqrt(1.0 - r2))); } } }
    return bz > -0.5 ? vec4(bn, smoothstep(0.0, 0.12, bn.z)) : vec4(0.0);
  }
`;

// A painted dome baked once into a texture over the azimuth/elevation window the shot can see,
// then sampled by view direction: correct under any camera rotation or arc (it is at infinity).
// body: GLSL defining `vec3 sky(float az, float el)`; values > 1 stay emissive (half float).
export function bakedDome(renderer, body, o = {}) {
  const az = o.az ?? [-1.5, 1.5], el = o.el ?? [-0.8, 1.0], ppr = o.pxPerRad ?? 1000;
  const W = Math.min(4096, Math.round((az[1] - az[0]) * ppr)), H = Math.min(4096, Math.round((el[1] - el[0]) * ppr));
  const rt = new WebGLRenderTarget(W, H, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
  const bake = new ShaderMaterial({
    uniforms: { uAz: { value: new Vector2(...az) }, uEl: { value: new Vector2(...el) }, uStormScale: { value: o.stormScale ?? 1 }, ...(o.uniforms ?? {}) },
    vertexShader: "varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform vec2 uAz; uniform vec2 uEl; varying vec2 vUv; ${KIT} ${o.kit ?? ""} ${body}
      void main() { gl_FragColor = vec4(sky(mix(uAz.x, uAz.y, vUv.x), mix(uEl.x, uEl.y, vUv.y)), 1.0); }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), bake); quad.frustumCulled = false;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.render(new Scene().add(quad), new OrthographicCamera(-1, 1, 1, -1, 0, 1)); renderer.setRenderTarget(prev);
  bake.dispose();
  const m = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { tSky: { value: rt.texture }, uAz: { value: new Vector2(...az) }, uEl: { value: new Vector2(...el) } },
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }",
    fragmentShader: `uniform sampler2D tSky; uniform vec2 uAz; uniform vec2 uEl; varying vec3 vD;
      void main() { vec3 d = normalize(vD); vec2 uv = vec2((atan(d.x, -d.z) - uAz.x) / (uAz.y - uAz.x), (asin(clamp(d.y, -1.0, 1.0)) - uEl.x) / (uEl.y - uEl.x));
        gl_FragColor = vec4(texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb, 0.0); }`,
  });
  const s = new Mesh(new SphereGeometry(400, 64, 32), m);
  s.frustumCulled = false; s.renderOrder = -10;
  s.userData.target = rt;
  return s;
}
