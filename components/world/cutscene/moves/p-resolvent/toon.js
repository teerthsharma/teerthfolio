// FRIEREN KEY-ART, the look: crisp modern anime key-art. Soft cel shading in three
// clean bands (a violet-teal shade, the colour, a warm lit band), a golden rim from the
// low sun, warm haze with distance, no grain, no halftone, no brush noise. One cel
// material draws the whole courtyard; the same material (a twin per colour) paints the
// pup. The "unmake" chunk is how the dimension ends: gold cracks run out from the broken
// scale, then the picture dissolves into light, and what is left is the island.
// Shared by every part of the dock (world.js, cast.js, fx.js); nothing here allocates per frame.

import { BufferAttribute, CylinderGeometry, DoubleSide, InstancedMesh, Quaternion, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const rgb = (hex) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
const v3 = (hex) => new Vector3(...rgb(hex));

// the low sun, behind and left of the courtyard (the direction TO the sun, rig frame: the lens is out along +z)
export const SUN = new Vector3(-0.55, 0.3, -0.62).normalize();
export const WIND = new Vector3(0.9, 0.38, -0.2).normalize();
// shadows fall away from it, long: a steeper "elevation" than the sun's, so they stay on the page
export const SHADOW = new Vector3(0.62, 0, 0.78).normalize();

// one set of uniform objects, shared by every material of the scene (one write a frame)
export const U = {
  uTime: { value: 0 },
  uDis: { value: 0 }, // 0 whole .. 1.2 gone: the unmaking
  uCrack: { value: 0 }, // 0 .. 1: gold cracks running out from uOrigin
  uOrigin: { value: new Vector3() }, // world: where the scale broke
  uOriginDir: { value: new Vector3(0, 0, -1) }, // from the lens toward it (for the sky)
  uWind: { value: 0 }, // the breeze, then the mana wind
  uSun: { value: SUN },
  uWindDir: { value: WIND },
  uHaze: { value: v3("#f3bf8c") },
  uDim: { value: 0 }, // 0 .. 1: the court darkens round the pup's column, so the gold and silver read against it
  uAxis: { value: new Vector3() }, // world: the foot of the column (the dimming gives way to it)
};
// the dimming: a cool violet dusk everywhere but near the column; applied last, before the emissive unmaking
export const DIM = /* glsl */ `
  uniform float uDim;
  uniform vec3 uAxis;
  vec3 dimmed(vec3 c, vec3 w) {
    if (uDim <= 0.0) return c;
    float d = length(w.xz - uAxis.xz);
    float near = exp(-d * d / 26.0);
    vec3 dusk = c * vec3(0.4, 0.36, 0.56);
    return mix(dusk, c * 0.92, near * 0.45) * uDim + c * (1.0 - uDim);
  }`;

export const NOISE = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.07; a *= 0.5; } return s; }
  float fbm2(vec2 p) { return 0.5 * vn(p) + 0.3 * vn(p * 2.3) + 0.1; }
  vec2 vor(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(x, y);
      vec2 o = vec2(h21(i + g), h21(i + g + 17.3));
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return vec2(d2 - d1, d1);
  }`;

// THE UNMAKING (world surfaces): discards what has dissolved, returns the gold that edges it and runs along the cracks
export const UNMAKE = /* glsl */ `
  uniform float uDis, uCrack;
  uniform vec3 uOrigin;
  vec3 unmake(vec3 w) {
    if (uDis <= 0.0 && uCrack <= 0.0) return vec3(0.0);
    float rad = length((w - uOrigin).xz) / 46.0;
    float n = fbm(w.xz * 0.22 + w.y * 0.35);
    float edge = n * 0.6 + rad * 0.55 - uDis * 1.5;
    if (edge < 0.0) discard;
    vec3 gold = vec3(1.0, 0.78, 0.38);
    vec3 e = gold * (1.0 - smoothstep(0.0, 0.07, edge)) * step(0.001, uDis) * 2.2;
    if (uCrack > 0.0) {
      vec2 q = vor(w.xz * 0.55 + w.y * 0.45);
      float line = 1.0 - smoothstep(0.014, 0.05, q.x);
      float reach = 1.0 - smoothstep(uCrack * 1.5 - 0.3, uCrack * 1.5, rad);
      e += gold * line * reach * 1.7;
    }
    return e;
  }`;

// ---- geometry: parts carry a colour, a sway weight (cloth, hair, leaves) and a surface kind ----
// kind: 0 plain, 1 masonry (courses, ivy), 3 gold metal, 4 unlit light (windows)
export function part(g, hex, { sway = 0, kind = 0, flat = false, swayFn = null } = {}) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  if (flat || !n.attributes.normal) n.computeVertexNormals();
  const cnt = n.attributes.position.count;
  const col = rgb(hex);
  const c = new Float32Array(cnt * 3);
  const s = new Float32Array(cnt);
  const p = n.attributes.position;
  for (let i = 0; i < cnt; i++) {
    c[i * 3] = col[0];
    c[i * 3 + 1] = col[1];
    c[i * 3 + 2] = col[2];
    s[i] = swayFn ? swayFn(p.getX(i), p.getY(i), p.getZ(i)) : sway;
  }
  n.setAttribute("color", new BufferAttribute(c, 3));
  n.setAttribute("aSway", new BufferAttribute(s, 1));
  n.setAttribute("aKind", new BufferAttribute(new Float32Array(cnt).fill(kind), 1));
  return n;
}
export const join = (parts) => mergeGeometries(parts);
// place a geometry: translate, then rotate about its own origin first
export function put(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  return g.translate(x, y, z);
}
// a tapered limb between two points (arrays)
const UPV = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
export function limb(a, b, r1, r2, seg = 8) {
  A.fromArray(a);
  B.fromArray(b);
  const len = A.distanceTo(B);
  const g = new CylinderGeometry(r2, r1, len, seg, 1);
  g.applyQuaternion(Q.setFromUnitVectors(UPV, B.clone().sub(A).normalize()));
  return g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}
export function inst(geo, mat, n) {
  const m = new InstancedMesh(geo, mat, n);
  m.frustumCulled = false;
  return m;
}

const VERT = /* glsl */ `
  attribute float aSway;
  attribute float aKind;
  uniform float uTime, uWind;
  uniform vec3 uWindDir;
  varying vec3 vN, vW, vCol, vL;
  varying float vKind;
  void main() {
    vCol = vec3(1.0);
    #ifdef USE_COLOR
      vCol = color.rgb;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vCol *= instanceColor;
    #endif
    vKind = aKind;
    vec3 p = position;
    vL = p;
    mat3 nm = mat3(modelMatrix);
    #ifdef USE_INSTANCING
      nm = nm * mat3(instanceMatrix);
      vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    #else
      vec4 w = modelMatrix * vec4(p, 1.0);
    #endif
    float amp = 0.12 + uWind * 1.5;
    float ph = uTime * (2.2 + uWind * 3.0) + w.x * 0.9 + w.y * 1.3;
    w.xyz += uWindDir * aSway * amp * (0.65 + 0.35 * sin(ph)) + vec3(0.0, -0.4, 0.0) * aSway * amp * 0.3 * sin(ph * 0.7);
    vN = normalize(nm * normal);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uSun, uBase, uHaze;
  uniform float uOpacity, uGlow, uTime;
  varying vec3 vN, vW, vCol, vL;
  varying float vKind;
  ${NOISE}
  ${UNMAKE}
  ${DIM}
  void main() {
    vec3 em = vec3(0.0);
    #ifndef NO_DIS
      em = unmake(vW);
    #endif
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 V = normalize(cameraPosition - vW);
    vec3 base = uBase * vCol;
    float ndl = dot(n, uSun);
    if (vKind > 0.5 && vKind < 1.5) {
      // masonry: coursed blocks, a warm and a cool stone, autumn ivy
      float course = vW.y / 0.36;
      float row = floor(course);
      float u = (vW.x + vW.z) / 0.85 + row * 0.5 + h21(vec2(row, 2.0)) * 3.0;
      float mx = abs(fract(u) - 0.5);
      float my = abs(fract(course) - 0.5);
      float mortar = 1.0 - smoothstep(0.455, 0.49, max(mx, my));
      float tone = h21(vec2(floor(u), row));
      base *= 0.9 + 0.2 * tone;
      base = mix(base, base * vec3(0.8, 0.84, 0.98), step(0.8, tone) * 0.7);
      float ivy = smoothstep(0.52, 0.58, fbm(vW.xy * 0.75 + vW.zy * 0.75 + 4.0));
      vec3 leaf = mix(vec3(0.72, 0.28, 0.13), vec3(0.86, 0.58, 0.16), h21(floor(vW.xy * 2.4 + vW.zy * 2.4)));
      base = mix(base, leaf, ivy * 0.85);
      base *= 1.0 - 0.22 * mortar;
    }
    vec3 shade = base * vec3(0.5, 0.46, 0.7) + vec3(0.02, 0.05, 0.08);
    float lit = smoothstep(-0.06, 0.1, ndl);
    float core = smoothstep(0.34, 0.46, ndl);
    vec3 c = mix(shade, base, lit);
    c = mix(c, base * vec3(1.22, 1.1, 0.88), core * 0.8);
    c += vec3(0.3, 0.55, 0.62) * 0.07 * (1.0 - lit) * (n.y * 0.5 + 0.5);
    // the low sun's golden rim, on every edge that turns from the lens
    float rim = pow(1.0 - max(dot(n, V), 0.0), 2.6) * smoothstep(-0.35, 0.5, ndl);
    c += vec3(1.0, 0.72, 0.36) * rim * 0.6;
    if (vKind > 2.5 && vKind < 3.5) {
      // gold metal: one crisp highlight band, a deeper shade
      float s = pow(max(dot(reflect(-uSun, n), V), 0.0), 18.0);
      c = c * 0.85 + vec3(1.0, 0.93, 0.7) * smoothstep(0.35, 0.5, s) * 0.8 + base * 0.15;
    }
    if (vKind > 3.5) c = vec3(1.0, 0.82, 0.45) * (0.9 + 0.1 * sin(uTime * 3.0 + vW.x));
    // the pup's own mana: silver and gold through its fur
    c = mix(c, vec3(0.95, 0.96, 1.0), uGlow * 0.55) + vec3(1.0, 0.8, 0.4) * rim * uGlow * 0.9;
    float d = length(cameraPosition - vW);
    c = mix(c, uHaze, (1.0 - exp(-d * d * 0.00011 - d * 0.004)) * 0.9);
    c = dimmed(c, vW);
    c += em;
    gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), uOpacity);
  }`;

// The cel material. `base` is a three Color (linear, as the pup's own materials are) or null for the vertex colours alone.
export function celMaterial({ base = null, vertexColors = true, transparent = false, opacity = 1, side, dissolve = true, glow = null, depthWrite } = {}) {
  const b = base ? base.clone().convertLinearToSRGB() : { r: 1, g: 1, b: 1 };
  return new ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uWind: U.uWind, uWindDir: U.uWindDir, uSun: U.uSun, uHaze: U.uHaze, uDis: U.uDis, uCrack: U.uCrack, uOrigin: U.uOrigin, uDim: U.uDim, uAxis: U.uAxis,
      uBase: { value: new Vector3(b.r, b.g, b.b) },
      uOpacity: { value: opacity },
      uGlow: glow ?? { value: 0 },
    },
    defines: dissolve ? {} : { NO_DIS: "" },
    vertexColors,
    transparent,
    side: side ?? DoubleSide,
    ...(depthWrite === undefined ? {} : { depthWrite }),
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
}

// THE PUP IN THE SAME LOOK: a cel twin for each of its materials, swapped in for the scene and back out at the unmaking.
export function pupCel(root, glow) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return; // the contact shadow keeps its own
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = celMaterial({ base: m.color ?? null, vertexColors: Boolean(m.vertexColors), transparent: m.transparent, opacity: m.opacity ?? 1, side: m.side, dissolve: false, glow });
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}
