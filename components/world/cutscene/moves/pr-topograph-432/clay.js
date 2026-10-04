// THE CLAY LOOK of the Dwarrowdelf (STOP-MOTION BIGATURE): one shared set of
// uniforms and one shader family for every sculpted thing in the scene.
//   S1 stepped time: U.uStep / U.uTime are written once per 12 fps pose.
//   S2 boil: each step every vertex shifts by a seeded jitter (uBoil, in the mesh's own units).
//   S3 clay and plaster: matte, one shared thumbprint normal texture applied triplanar,
//      dry-brushed lighter edges (a fresnel tint broken up by the texture's height).
//   S4 practical lamps: a warm key in the chasm, a cool fill at the far doorway, a bounce card
//      by the lens, all stepped; no scene lights are read.
//   S6 miniature depth: warm scene fog in the shader, no blur.
// Colours are authored with three's Color (linear); the shaders end with the
// colour-space chunk so what is picked as a hex is what is seen.

import { BufferAttribute, Color, DataTexture, DoubleSide, FrontSide, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, RepeatWrapping, ShaderMaterial, UnsignedByteType, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const lin = (hex) => {
  const c = new Color(hex);
  return new Vector3(c.r, c.g, c.b);
};
const v3 = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);

// ONE SHARED UNIFORM SET (every material spreads this, so a write reaches them all)
export const U = {
  uStep: { value: 0 },
  uTime: { value: 0 },
  uKey: { value: v3(0, -12, -2) },
  uKeyCol: { value: lin("#b04dff") },
  uKeyK: { value: 3.4 },
  uKeyR: { value: 13 },
  uFill: { value: v3(-5.1, 1.6, -1.6) },
  uFillCol: { value: lin("#ffc450") },
  uFillK: { value: 2.3 },
  uFillR: { value: 7.5 },
  uBounce: { value: 0.5 },
  uBounceCol: { value: lin("#ffb8e0") },
  uAmbTop: { value: lin("#5a30a8") },
  uAmbBot: { value: lin("#2a0c4a") },
  uFog: { value: lin("#1a0a30") },
  uFogD: { value: 0.0125 },
  uCore: { value: v3() },
  uReveal: { value: 0 },
  uRimCol: { value: lin("#ffc43a") },
  uCoral: { value: lin("#ff2f5e") },
  uLamps: { value: 1 },
  uNormal: { value: null },
};

// ---------------------------------------------------------------- the thumbprint texture (256 x 256, built once)
let TEX = null;
export function clayTexture() {
  if (TEX) return TEX;
  const N = 256;
  const h = new Float32Array(N * N);
  let s = 90210;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const at = (x, y) => (((y % N) + N) % N) * N + (((x % N) + N) % N);
  // thumbprints: concentric elliptical ridges
  for (let k = 0; k < 46; k++) {
    const cx = Math.floor(rnd() * N);
    const cy = Math.floor(rnd() * N);
    const rx = 9 + rnd() * 15;
    const ry = rx * (0.62 + rnd() * 0.42);
    const a = rnd() * 3.14;
    const ph = rnd() * 6.28;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const R = Math.ceil(Math.max(rx, ry)) + 1;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const u = (dx * ca + dy * sa) / rx;
        const v = (-dx * sa + dy * ca) / ry;
        const r = Math.hypot(u, v);
        if (r > 1) continue;
        h[at(cx + dx, cy + dy)] += Math.sin(r * Math.PI * 5 + ph) * (1 - r * r) * 0.55;
      }
    }
  }
  // tool marks: short scored lines
  for (let k = 0; k < 110; k++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const a = rnd() * 6.28;
    const len = 12 + rnd() * 34;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const dep = (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6);
    for (let t = 0; t < len; t++) {
      const w = Math.sin((Math.PI * t) / len);
      const px = Math.floor(x + dx * t);
      const py = Math.floor(y + dy * t);
      h[at(px, py)] += dep * w;
      h[at(px + Math.round(-dy), py + Math.round(dx))] += dep * w * 0.35;
    }
  }
  // a fine grain of its own
  for (let i = 0; i < N * N; i++) h[i] += (rnd() - 0.5) * 0.35;
  let lo = 1e9;
  let hi = -1e9;
  for (let i = 0; i < N * N; i++) {
    lo = Math.min(lo, h[i]);
    hi = Math.max(hi, h[i]);
  }
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const nx = (h[at(x - 1, y)] - h[at(x + 1, y)]) * 0.9;
      const ny = (h[at(x, y - 1)] - h[at(x, y + 1)]) * 0.9;
      data[i * 4] = Math.max(0, Math.min(255, 128 + nx * 90));
      data[i * 4 + 1] = Math.max(0, Math.min(255, 128 + ny * 90));
      data[i * 4 + 2] = ((h[i] - lo) / (hi - lo)) * 255;
      data[i * 4 + 3] = 255;
    }
  }
  const t = new DataTexture(data, N, N, RGBAFormat, UnsignedByteType);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  TEX = t;
  U.uNormal.value = t;
  return t;
}
export function disposeTexture() {
  TEX?.dispose();
  TEX = null;
  U.uNormal.value = null;
}

// ---------------------------------------------------------------- shaders
// reveal: the Dwarrowdelf swells out of the pup (and, at the wrap, draws back into it): every fragment
// farther than uReveal from the pup's core is cut, with a mint lip on the cut.
export const REVEAL = /* glsl */ `
  uniform vec3 uCore;
  uniform float uReveal;
  uniform vec3 uRimCol;
  float revealCut(vec3 w) {
    float d = distance(w, uCore);
    if (d > uReveal) discard;
    return uReveal < 900.0 ? smoothstep(uReveal - 0.7, uReveal, d) : 0.0;
  }`;

const VERT = /* glsl */ `
  uniform float uStep, uTime, uBoil, uWave;
  uniform vec3 uBase;
  varying vec3 vW;
  varying vec3 vN;
  varying vec3 vL;
  varying vec3 vLN;
  varying vec3 vCol;
  varying float vCoral;
  #ifdef SWAY
    attribute float aSway;
  #endif
  vec3 h3(vec3 p) {
    p = fract(p * vec3(.1031, .1030, .0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
  }
  void main() {
    vec3 p = position;
    #ifdef SWAY
      float ph = uTime * 7.0 + p.y * 3.1 + p.x * 2.3;
      p += aSway * uWave * vec3(sin(ph), 0.5 * abs(sin(ph * 1.3 + 1.0)), cos(ph * 0.8 + p.z * 2.0));
    #endif
    p += (h3(floor(position * 37.0) + uStep * 3.17) - 0.5) * 2.0 * uBoil;
    mat4 im = mat4(1.0);
    #ifdef USE_INSTANCING
      im = instanceMatrix;
    #endif
    vec4 w = modelMatrix * im * vec4(p, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * mat3(im) * normal);
    vL = p + im[3].xyz * 0.37;
    vLN = normal;
    vCol = uBase;
    #ifdef USE_COLOR
      vCol *= color.rgb;
    #endif
    vCoral = 0.0;
    #ifdef USE_INSTANCING_COLOR
      #ifdef CORAL
        vCoral = instanceColor.r;
      #else
        vCol *= instanceColor;
      #endif
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D uNormal;
  uniform vec3 uKey, uKeyCol, uFill, uFillCol, uBounceCol, uAmbTop, uAmbBot, uFog, uCoral;
  uniform float uKeyK, uKeyR, uFillK, uFillR, uBounce, uFogD, uLamps, uBump, uTex, uEdge, uWax, uRimK, uEmit, uTime, uFlags;
  varying vec3 vW;
  varying vec3 vN;
  varying vec3 vL;
  varying vec3 vLN;
  varying vec3 vCol;
  varying float vCoral;
  ${REVEAL}
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float cut = revealCut(vW);
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vW);
    vec3 alb = vCol;
    float h = 0.5;
    // S3: the shared thumbprint normal, triplanar
    vec3 an = pow(abs(normalize(vLN)), vec3(4.0));
    an /= (an.x + an.y + an.z);
    vec3 pp = vL * uTex;
    vec4 tx = texture2D(uNormal, pp.zy);
    vec4 ty = texture2D(uNormal, pp.xz);
    vec4 tz = texture2D(uNormal, pp.xy);
    vec3 pert = an.x * vec3(0.0, tx.g - 0.5, tx.r - 0.5) + an.y * vec3(ty.r - 0.5, 0.0, ty.g - 0.5) + an.z * vec3(tz.r - 0.5, tz.g - 0.5, 0.0);
    h = an.x * tx.b + an.y * ty.b + an.z * tz.b;
    N = normalize(N + pert * uBump * 2.0);
    alb *= 0.8 + 0.4 * h;
    #ifdef FLAGS
      // flagstones: seams and a tone a slab, on the up faces
      vec2 g = vW.xz / 2.2;
      g.x += floor(g.y) * 0.5;
      vec2 f = abs(fract(g) - 0.5);
      float seam = smoothstep(0.45, 0.5, max(f.x, f.y * 1.0));
      float up = smoothstep(0.6, 0.9, N.y);
      alb *= 1.0 - up * (0.42 * seam + 0.16 * h21(floor(g)));
    #endif
    // dry brush: lighter plaster on the edges, broken by the texture
    float fr = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);
    float dry = smoothstep(0.3, 0.78, fr + (h - 0.5) * 0.8);
    alb = mix(alb, alb * 1.9 + vec3(0.03, 0.02, 0.012), dry * uEdge);
    // S4: the practical lamps
    vec3 L1 = uKey - vW;
    float d1 = length(L1);
    L1 /= d1;
    float a1 = uKeyK * uLamps / (1.0 + (d1 / uKeyR) * (d1 / uKeyR));
    float w1 = max(dot(N, L1) * 0.75 + 0.25, 0.0);
    w1 *= w1;
    vec3 L2 = uFill - vW;
    float d2 = length(L2);
    L2 /= d2;
    float a2 = uFillK * uLamps / (1.0 + (d2 / uFillR) * (d2 / uFillR));
    float w2 = max(dot(N, L2) * 0.75 + 0.25, 0.0);
    w2 *= w2;
    float w3 = max(dot(N, V), 0.0) * uBounce * uLamps;
    vec3 amb = mix(uAmbBot, uAmbTop, N.y * 0.5 + 0.5);
    vec3 lit = amb * (0.35 + 0.65 * uLamps) + uKeyCol * a1 * w1 + uFillCol * a2 * w2 + uBounceCol * w3;
    vec3 col = alb * lit;
    // a faint waxy sheen (the pup's plasticine, the bead eyes)
    col += uKeyCol * a1 * pow(max(dot(N, normalize(L1 + V)), 0.0), 22.0) * uWax;
    col += uFillCol * a2 * pow(max(dot(N, normalize(L2 + V)), 0.0), 22.0) * uWax * 0.8;
    col += uBounceCol * pow(max(dot(N, V), 0.0), 40.0) * uWax * 0.15 * uLamps;
    // the ember lighting the silhouette's edge from below
    col += uKeyCol * pow(1.0 - max(dot(N, V), 0.0), 3.0) * uRimK * uLamps;
    #ifdef EMITV
      col = vCol * uEmit * (0.92 + 0.08 * h) + col * 0.15;
    #endif
    #ifdef CORAL
      float band = smoothstep(0.5, 1.4, vW.y) * (1.0 - smoothstep(8.2, 9.2, vW.y));
      col = mix(col, uCoral * 0.9 + col * 0.25, vCoral * band * 0.62);
    #endif
    // S6: warm fog, not blur
    float fd = distance(cameraPosition, vW);
    col = mix(col, uFog, 1.0 - exp(-pow(fd * uFogD, 2.0)));
    col += uRimCol * cut * 1.4;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

// o: boil (units), tex (texture scale), bump, edge (dry brush), wax (sheen), rim (ember silhouette), emit,
//    sway/wave (cloth hem and hair), coral (instanceColor.r is a coral amount), flags, side, base (a Color), vertexColors
export function clay(o = {}) {
  const defines = {};
  if (o.sway) defines.SWAY = 1;
  if (o.emit) defines.EMITV = 1;
  if (o.coral) defines.CORAL = 1;
  if (o.flags) defines.FLAGS = 1;
  return new ShaderMaterial({
    uniforms: {
      ...U,
      uBoil: { value: o.boil ?? 0.012 },
      uWave: { value: o.wave ?? 0 },
      uBump: { value: o.bump ?? 0.35 },
      uTex: { value: o.tex ?? 0.9 },
      uEdge: { value: o.edge ?? 0.7 },
      uWax: { value: o.wax ?? 0 },
      uRimK: { value: o.rim ?? 0 },
      uEmit: { value: o.emit ?? 0 },
      uFlags: { value: 0 },
      uBase: { value: o.base ? new Vector3(o.base.r, o.base.g, o.base.b) : v3(1, 1, 1) },
    },
    defines,
    vertexShader: VERT,
    fragmentShader: FRAG,
    vertexColors: o.vertexColors ?? true,
    side: o.side ?? FrontSide,
    toneMapped: false,
    fog: false,
  });
}
export { DoubleSide };

// ---------------------------------------------------------------- geometry helpers (all clay geometry: position, normal, color, aSway)
const value3 = (x, y, z) => {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const f = (a) => a * a * (3 - 2 * a);
  const u = f(x - i);
  const v = f(y - j);
  const w = f(z - k);
  const r = (a, b, c) => hash(a * 7.13 + b * 3.71 + c * 1.97, 4);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(r(i, j, k), r(i + 1, j, k), u), l(r(i, j + 1, k), r(i + 1, j + 1, k), u), v),
    l(l(r(i, j, k + 1), r(i + 1, j, k + 1), u), l(r(i, j + 1, k + 1), r(i + 1, j + 1, k + 1), u), v),
    w,
  );
};

// sculpted lumps along the normals, on the INDEXED geometry so shared corners stay shared
export function lump(g, amp = 0.05, freq = 2.2, seed = 0) {
  g.computeVertexNormals();
  const p = g.attributes.position;
  const n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const d = (value3(p.getX(i) * freq + seed, p.getY(i) * freq, p.getZ(i) * freq) - 0.5) * 2 * amp;
    p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  }
  g.computeVertexNormals();
  return g;
}

// finish a piece: non-indexed, no uv, a flat colour (a Color/hex, or fn(x,y,z) -> Color), a sway weight (number or fn(x,y,z))
export function piece(geometry, color = "#ffffff", sway = 0) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute("uv");
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  const s = new Float32Array(p.count);
  const base = typeof color === "function" ? null : new Color(color);
  const tmp = new Color();
  for (let i = 0; i < p.count; i++) {
    const col = base ?? tmp.copy(color(p.getX(i), p.getY(i), p.getZ(i)));
    c[i * 3] = col.r;
    c[i * 3 + 1] = col.g;
    c[i * 3 + 2] = col.b;
    s[i] = typeof sway === "function" ? sway(p.getX(i), p.getY(i), p.getZ(i)) : sway;
  }
  g.setAttribute("color", new BufferAttribute(c, 3));
  g.setAttribute("aSway", new BufferAttribute(s, 1));
  return g;
}
export const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);

// a tinted variation of a base colour, per index (hand-painted blocks never match)
export function varied(hex, i, spread = 0.12) {
  const c = new Color(hex);
  const k = 1 + (hash(i, 3) - 0.5) * 2 * spread;
  return c.multiplyScalar(k);
}
