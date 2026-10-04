// KIRI-E PAPER THEATRE: the shared material and card helpers. Every piece of scenery is a flat extruded shape with
// real thickness (the cream paper core shows on the cut walls), flat matte colour in at most three value steps from
// one shared 256x256 washi-fibre texture, and light that comes THROUGH the paper (a back-lit term x the fibre).
// There are no ink lines and no post pass. One shader, a few uniform sets; per-vertex colours; instancing-ready.

import { BufferAttribute, Color, DataTexture, ExtrudeGeometry, LinearFilter, LinearMipmapLinearFilter, Path, RGBAFormat, RepeatWrapping, ShaderMaterial, Shape, UnsignedByteType, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// THE WASHI FIBRE: 256x256, built once, tileable: soft mottling plus a few hundred short pale and dark fibres.
let FIB = null;
export function fibreTexture() {
  if (FIB) return FIB;
  const N = 256;
  const v = new Float32Array(N * N);
  const idx = (x, y) => (((y % N) + N) % N) * N + (((x % N) + N) % N);
  for (let o = 0, cell = 32, amp = 0.5; o < 4; o++, cell /= 2, amp /= 2) {
    const g = Math.ceil(N / cell);
    const r = Array.from({ length: g * g }, (_, i) => hash(i, o + 3));
    const s = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
    const q = (a, b) => r[(b % g) * g + (a % g)];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx = x / cell;
        const fy = y / cell;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        v[idx(x, y)] += amp * s(s(q(x0, y0), q(x0 + 1, y0), tx), s(q(x0, y0 + 1), q(x0 + 1, y0 + 1), tx), ty);
      }
  }
  for (let i = 0; i < 700; i++) {
    const a = hash(i, 11) * Math.PI;
    const len = 6 + 22 * hash(i, 12);
    const x0 = hash(i, 13) * N;
    const y0 = hash(i, 14) * N;
    const k = hash(i, 15) > 0.5 ? 0.16 : -0.14;
    for (let s = 0; s < len; s++) v[idx(Math.round(x0 + Math.cos(a) * s), Math.round(y0 + Math.sin(a) * s))] += k;
  }
  const d = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const b = Math.max(0, Math.min(1, v[i] * 0.9 + 0.1));
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.round(b * 255);
    d[i * 4 + 3] = 255;
  }
  FIB = new DataTexture(d, N, N, RGBAFormat, UnsignedByteType);
  FIB.wrapS = FIB.wrapT = RepeatWrapping;
  FIB.minFilter = LinearMipmapLinearFilter;
  FIB.magFilter = LinearFilter;
  FIB.generateMipmaps = true;
  FIB.needsUpdate = true;
  return FIB;
}
export const disposeFibre = () => {
  FIB?.dispose();
  FIB = null;
};

// shared uniforms: one object, every paper material points at it
export const U = {
  uFib: { value: null },
  uTime: { value: 0 },
  uEmberAt: { value: new Vector3(-3, 3, -9) }, // the fox's glow, in the theatre frame
  uEmberK: { value: 0.6 },
  uHaze: { value: new Color("#3b2352") },
  uCream: { value: new Color("#e9dcc0") },
  uFade: { value: 1 }, // the whole theatre's light (the lamp going out)
};

// ONE SHADER. Faces: matte card, three value steps from the fibre, the back-light through translucent washi,
// the fox's ember warming the card nearest it in three bands, depth haze in four bands. Walls (the cut edge): cream.
// uMode: 0 card, 2 gold foil, 3 pure light (unlit, glows). `trans` is how much back-light passes (0 solid card).
export function paperMaterial({ mode = 0, trans = 0.1, back = "#ffb066", tint = 1, side, opacity = 1 } = {}) {
  U.uFib.value = fibreTexture();
  return new ShaderMaterial({
    uniforms: { ...U, uMode: { value: mode }, uTrans: { value: trans }, uBackC: { value: new Color(back) }, uTint: { value: tint }, uLit: { value: 1 }, uOp: { value: opacity } },
    vertexColors: true,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    ...(side ? { side } : {}),
    vertexShader: /* glsl */ `
      varying vec3 vCol;
      varying vec3 vWorld;
      varying vec3 vLoc;
      attribute float aw;
      varying float vFace;
      varying vec3 vN;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        vCol = color.rgb;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol *= instanceColor;
        #endif
        vFace = 1.0 - aw;
        vLoc = p.xyz;
        vec4 w = modelMatrix * p;
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * n);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uFib;
      uniform float uTime, uEmberK, uMode, uTrans, uTint, uLit, uFade, uOp;
      uniform vec3 uEmberAt, uHaze, uCream, uBackC;
      varying vec3 vCol;
      varying vec3 vWorld;
      varying vec3 vLoc;
      varying float vFace;
      varying vec3 vN;
      void main() {
        vec2 uv = vLoc.xy * 0.22 + vec2(vLoc.z * 0.37, vLoc.z * 0.21);
        float f = texture2D(uFib, uv).r;
        float f2 = texture2D(uFib, uv * 3.7 + 0.31).r;
        float dist = length(vWorld - cameraPosition);
        float haze = floor(clamp((dist - 14.0) / 100.0, 0.0, 1.0) * 4.0) / 4.0 * 0.62;
        vec3 base = vCol * uTint;
        vec3 c;
        if (vFace < 0.5) {
          float s = 0.62 + 0.22 * step(0.0, vN.x * 0.6 + vN.y * 0.4 + 0.15);
          c = mix(uCream * s, base * 1.3, 0.22) * (uMode > 2.5 ? 1.5 : 1.0);
        } else if (uMode > 2.5) {
          c = base * (1.0 + 0.25 * f);
        } else if (uMode > 1.5) {
          float cr = texture2D(uFib, uv * 5.0 + vec2(uTime * 0.01, 0.0)).r;
          float sheen = step(0.62, cr) * 0.55 + step(0.78, cr) * 0.5;
          c = base * (0.82 + 0.3 * step(0.5, f2)) + vec3(1.0, 0.86, 0.5) * sheen * 0.45 * uLit;
        } else {
          float step3 = f < 0.4 ? 0.86 : (f < 0.64 ? 0.95 : 1.04);
          c = base * step3;
          vec3 thru = uBackC * (0.45 + 1.0 * f) * base * 1.6;
          c = mix(c, thru + base * 0.25, uTrans);
          float e = 1.0 - clamp(length(vWorld.xy - uEmberAt.xy) / 15.0, 0.0, 1.0);
          float band = floor(e * e * 3.0) / 3.0;
          c += vec3(1.0, 0.36, 0.1) * band * uEmberK * 0.34 * (1.0 - uTrans * 0.6) * (0.15 + base.r * 1.4);
        }
        c = mix(c, uHaze, haze * (uMode > 2.5 ? 0.0 : 1.0));
        gl_FragColor = vec4(c * uFade, uOp);
      }`,
  });
}

// SHAPES -> CARDS. pts: [[x, y], ...] in metres (any winding); holes: [pts...]; depth: the card's thickness.
// Returns a non-indexed geometry with a colour attribute and no uv, ready to merge into one mesh per layer.
const P = (a) => a.map(([x, y]) => new Vector2(x, y));
export function card(pts, { holes = [], depth, color = "#222", z = 0 } = {}) {
  const sh = new Shape(P(pts));
  for (const h of holes) sh.holes.push(new Path(P(h)));
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const d = depth ?? Math.min(0.3, Math.max(0.03, 0.03 * Math.sqrt((x1 - x0) * (y1 - y0))));
  const g0 = new ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 5 });
  g0.translate(0, 0, z - d / 2);
  g0.deleteAttribute("uv");
  g0.clearGroups();
  const g = g0.index ? g0.toNonIndexed() : g0;
  const n = g.attributes.position.count;
  const c = new Color(color);
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(a, 3));
  // the cut wall (1) against the card face (0), taken before any rotation: faces look along the extrusion axis
  const aw = new Float32Array(n);
  const nm = g.attributes.normal;
  for (let i = 0; i < n; i++) aw[i] = Math.abs(nm.getZ(i)) > 0.5 ? 0 : 1;
  g.setAttribute("aw", new BufferAttribute(aw, 1));
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
}
export const circle = (cx, cy, r, n = 14, sy = 1) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r * sy]);
export const merge = (list) => mergeGeometries(list);
// place a geometry (x, y, z), optional uniform scale and a z rotation
export const place = (g, x = 0, y = 0, z = 0, s = 1, rz = 0) => {
  if (s !== 1) g.scale(s, s, s);
  if (rz) g.rotateZ(rz);
  return g.translate(x, y, z);
};
