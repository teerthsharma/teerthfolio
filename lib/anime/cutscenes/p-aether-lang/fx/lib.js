// Shared FX helpers for p-aether-lang (this folder only). Candidates for promotion: billboard / screenQuad / quadSet / segments / GLSL chunks.
//
// Conventions (all effects here)
//   colour     every constant is authored as sRGB hex and linearised with pow 2.2 (hexLin / lin()), output clamped min(c, 1.4)
//   depth      effects are drawn with depthTest ON and depthWrite OFF, so the hero seal (opaque, nearer) always occludes them: nothing
//              here can cover or milk the seal (owner laws L1, L2, L8). Full-lens quads sit at NDC depth 0.99999 (behind everything).
//   blending   additive for light, normal for solid ink shapes (ragged burst, orbs, sphere, silhouettes)
//   time       update(t, dt, cue): t is the stepped clock; effects that must run on ones use cue.t floored to 1/24 themselves.

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const hexLin = (hex) => {
  const h = hex.replace("#", ""), n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((c) => Math.pow(c, 2.2));
};

// FLOW CLOCK. The flood and the nebula run on `flow`, which freezes at 8.6 s: flow'(t) = 1 - smoothstep((t - f0)/d) after f0.
//   integral of (1 - (3x^2 - 2x^3)) over u = u - d (x^3 - x^4 / 2), x = u/d.   Reaches f0 + d/2 + d/2 = f0 + 0.5 d ... held after d.
export function flowClock(t, f0 = 8.3, d = 0.3) {
  if (t <= f0) return t;
  const u = Math.min(t - f0, d), x = u / d;
  return f0 + u - d * (x * x * x - (x * x * x * x) / 2);
}

// the seal's placement frame: local (x right, y up, z forward) to world through yaw (same convention as the framework's boxOf)
export function sealW(seal, lx, ly, lz, out) {
  const s = seal.scale ?? 1, c = Math.cos(seal.yaw), n = Math.sin(seal.yaw);
  const x = lx * s, z = lz * s;
  return out.set(seal.at[0] + x * c + z * n, seal.at[1] + ly * s, seal.at[2] - x * n + z * c);
}

// ---------------------------------------------------------------- GLSL chunks
export const GLSL_COMMON = /* glsl */ `
float h11(float p) { return fract(sin(p * 127.1) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
// anti-aliased line of half-width w about x = 0 (fwidth gives the 1 px edge)
float lineAA(float x, float w) { float f = fwidth(x) * 0.75 + 1e-5; return 1. - smoothstep(w - f, w + f, abs(x)); }
// FOUR-POINT SPARKLE: the astroid sqrt|x| + sqrt|y| = sqrt(r); 1 at the centre, 0 outside, hard core of 25% r.
float star4(vec2 p, float r) { float d = (sqrt(abs(p.x)) + sqrt(abs(p.y))) / sqrt(max(r, 1e-5)); return 1. - smoothstep(0.6, 1., d); }
// RING WITH RAINBOW FRINGE: R channel pushed outward and B inward by fr (about 1.5 px): vec3(redLine, greenLine, blueLine)
vec3 ringFringe(float d, float r, float w, float fr) { return vec3(lineAA(d - r - fr, w), lineAA(d - r, w), lineAA(d - r + fr, w)); }
// ONE TAPERED SPIKE of the star flare: direction angle ang, length len, base half-width wid; tapers linearly to a point.
float spike(vec2 p, float ang, float len, float wid) {
  vec2 d = vec2(cos(ang), sin(ang)); float al = abs(dot(p, d)); float pe = abs(p.x * d.y - p.y * d.x);
  float tp = wid * (1. - clamp(al / len, 0., 1.));
  return step(al, len) * (1. - smoothstep(tp * 0.35, tp + 1e-4, pe)) * (1. - al / len); }
// the 06-reference star flare: 6 thin spikes (len 0.55 R) + 2 long horizontal (len 1.0 R), R = 1 in p. Returns spike intensity 0..1.
float flare8(vec2 p, float rot) {
  float s = 0.;
  s += spike(p, rot + 0.0, 1.00, 0.030) + spike(p, rot + 3.14159, 1.00, 0.030);
  s += spike(p, rot + 0.7854, 0.55, 0.020) + spike(p, rot + 2.3562, 0.55, 0.020) + spike(p, rot + 3.9270, 0.55, 0.020) + spike(p, rot + 5.4978, 0.55, 0.020);
  s += spike(p, rot + 1.5708, 0.55, 0.020) + spike(p, rot + 4.7124, 0.55, 0.020);
  return min(s, 1.); }
`;

export const BILLBOARD_VS = /* glsl */ `
uniform vec3 uPos; uniform vec2 uSize; uniform float uRot; uniform float uPush;
varying vec2 vP;
void main() {
  vP = position.xy * 2.;
  vec3 w = uPos + normalize(cameraPosition - uPos + vec3(1e-5)) * uPush;   // push toward (+) or away (-) from the lens
  vec4 mv = viewMatrix * vec4(w, 1.);
  float c = cos(uRot), s = sin(uRot);
  mv.xy += vec2(c * position.x - s * position.y, s * position.x + c * position.y) * uSize;
  gl_Position = projectionMatrix * mv;
}`;

export const SCREEN_VS = /* glsl */ `
uniform vec3 uAnchor; uniform float uDepth;
varying vec2 vUv; varying vec2 vC; varying float vAsp;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  vec4 c = projectionMatrix * viewMatrix * vec4(uAnchor, 1.);
  vec2 n = c.w > 0.001 ? c.xy / c.w : vec2(0.);
  vC = n * 0.5 + 0.5;
  vAsp = projectionMatrix[1][1] / projectionMatrix[0][0];
  gl_Position = vec4(position.xy, uDepth, 1.);
}`;

export const QUADSET_VS = /* glsl */ `
attribute vec2 aCorner; attribute vec3 aC; attribute vec4 aS;
varying vec2 vP; varying vec4 vS;
void main() {
  vP = aCorner * 2.; vS = aS;
  vec4 mv = viewMatrix * vec4(aC, 1.);
  mv.xy += aCorner * aS.x;
  gl_Position = projectionMatrix * mv;
}`;

export const SEGMENT_VS = /* glsl */ `
attribute vec3 aA; attribute vec3 aB; attribute vec2 aE; attribute float aW;
uniform float uPx; uniform float uAsp;
varying float vU; varying float vSide; varying float vW;
void main() {
  vec4 a = projectionMatrix * viewMatrix * vec4(aA, 1.);
  vec4 b = projectionMatrix * viewMatrix * vec4(aB, 1.);
  vec2 na = a.xy / max(a.w, 1e-3), nb = b.xy / max(b.w, 1e-3);
  vec2 d = (nb - na) * vec2(uAsp, 1.);
  d = length(d) > 1e-6 ? normalize(d) : vec2(1., 0.);
  vec2 nrm = vec2(-d.y, d.x) / vec2(uAsp, 1.);
  vec4 c = mix(a, b, aE.x);
  c.xy += nrm * aE.y * uPx * aW * c.w;
  vU = aE.x; vSide = aE.y; vW = aW;
  gl_Position = c;
}`;

// ---------------------------------------------------------------- builders
export function mkMat(THREE, o) {
  const uniforms = {};
  for (const [k, v] of Object.entries(o.u ?? {})) uniforms[k] = v && typeof v === "object" && "value" in v ? v : { value: v };
  const m = new THREE.ShaderMaterial({
    uniforms, vertexShader: o.vs, fragmentShader: o.fs, transparent: true,
    depthTest: o.depthTest ?? true, depthWrite: false, side: THREE.DoubleSide,
    blending: o.add === false ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  m.userData.u = uniforms;
  return m;
}

// camera-facing quad at uPos, uSize metres, rotated uRot. fs sees vP in -1..1. Always visible (programs link at build, F3).
export function billboard(THREE, o) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const m = mkMat(THREE, {
    u: { uPos: new THREE.Vector3(), uSize: new THREE.Vector2(1, 1), uRot: 0, uPush: 0, uK: 0, ...(o.u ?? {}) },
    vs: BILLBOARD_VS, fs: `${GLSL_COMMON}\nvarying vec2 vP;\n${o.fs}`, add: o.add, depthTest: o.depthTest,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 5;
  mesh.userData.u = m.userData.u;
  return mesh;
}

// full-lens quad behind everything (NDC depth ~1), anchored on a world point (vC = its screen position, vAsp the aspect)
export function screenQuad(THREE, o) {
  const geo = new THREE.PlaneGeometry(2, 2);
  const m = mkMat(THREE, {
    u: { uAnchor: new THREE.Vector3(), uDepth: 0.99999, uK: 0, ...(o.u ?? {}) },
    vs: SCREEN_VS, fs: `${GLSL_COMMON}\nvarying vec2 vUv; varying vec2 vC; varying float vAsp;\n${o.fs}`, add: o.add, depthTest: true,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 1;
  mesh.userData.u = m.userData.u;
  return mesh;
}

// n camera-facing sparkle quads from per-particle arrays: aC (x y z), aS (size, a, b, c). Fill via set(i, x,y,z, size, a,b,c).
export function quadSet(THREE, n, fs, o = {}) {
  const geo = new THREE.BufferGeometry();
  const corner = new Float32Array(n * 8), aC = new Float32Array(n * 12), aS = new Float32Array(n * 16), idx = new Uint32Array(n * 6), pos = new Float32Array(n * 12);
  const K = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  for (let i = 0; i < n; i++) {
    for (let v = 0; v < 4; v++) { corner[i * 8 + v * 2] = K[v][0]; corner[i * 8 + v * 2 + 1] = K[v][1]; }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  const A = (name, arr, sz) => { const a = new THREE.BufferAttribute(arr, sz); if (name !== "position") a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, a); return a; };
  A("position", pos, 3); A("aCorner", corner, 2); const bC = A("aC", aC, 3), bS = A("aS", aS, 4);
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = mkMat(THREE, { u: { uK: 0, ...(o.u ?? {}) }, vs: QUADSET_VS, fs: `${GLSL_COMMON}\nvarying vec2 vP; varying vec4 vS;\n${fs}`, add: o.add });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 6;
  mesh.userData.u = m.userData.u;
  return {
    mesh, n,
    set(i, x, y, z, s, a = 0, b = 0, c = 0) {
      for (let v = 0; v < 4; v++) { aC[i * 12 + v * 3] = x; aC[i * 12 + v * 3 + 1] = y; aC[i * 12 + v * 3 + 2] = z; aS[i * 16 + v * 4] = s; aS[i * 16 + v * 4 + 1] = a; aS[i * 16 + v * 4 + 2] = b; aS[i * 16 + v * 4 + 3] = c; }
    },
    flush() { bC.needsUpdate = true; bS.needsUpdate = true; },
  };
}

// screen-width segments: up to n quads, each from aA to aB, constant px width times aW. Fill via set(i, a, b, w) then flush().
export function segments(THREE, n, fs, o = {}) {
  const geo = new THREE.BufferGeometry();
  const aA = new Float32Array(n * 12), aB = new Float32Array(n * 12), aE = new Float32Array(n * 8), aW = new Float32Array(n * 4), idx = new Uint32Array(n * 6), pos = new Float32Array(n * 12);
  const E = [[0, -1], [0, 1], [1, 1], [1, -1]];
  for (let i = 0; i < n; i++) {
    for (let v = 0; v < 4; v++) { aE[i * 8 + v * 2] = E[v][0]; aE[i * 8 + v * 2 + 1] = E[v][1]; }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  const A = (name, arr, sz, dyn) => { const a = new THREE.BufferAttribute(arr, sz); if (dyn) a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, a); return a; };
  A("position", pos, 3); A("aE", aE, 2); const bA = A("aA", aA, 3, 1), bB = A("aB", aB, 3, 1), bW = A("aW", aW, 1, 1);
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = mkMat(THREE, { u: { uPx: 3 / 720, uAsp: 16 / 9, uK: 1, ...(o.u ?? {}) }, vs: SEGMENT_VS, fs: `${GLSL_COMMON}\nvarying float vU; varying float vSide; varying float vW;\n${fs}`, add: o.add });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 7;
  mesh.userData.u = m.userData.u;
  return {
    mesh, n,
    set(i, a, b, w = 1) {
      for (let v = 0; v < 4; v++) { aA.set(a, i * 12 + v * 3); aB.set(b, i * 12 + v * 3); aW[i * 4 + v] = w; }
    },
    clear(from = 0) { for (let i = from; i < n; i++) for (let v = 0; v < 4; v++) aW[i * 4 + v] = 0; },
    flush() { bA.needsUpdate = true; bB.needsUpdate = true; bW.needsUpdate = true; },
  };
}

// timeline: the first scene beat of that name wins, else the bible's default (cue names are the bible's words)
export function timeline(scene) {
  const B = scene?.beats ?? [];
  return (name, t0, dur = 0) => { const b = B.find((x) => x.name === name); return { t: b?.t ?? t0, dur: b?.dur ?? dur, b }; };
}

export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose?.();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) { m.uniforms?.uTex?.value?.dispose?.(); m.dispose?.(); }
  });
}
