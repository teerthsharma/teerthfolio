// p-nerve FX: shared helpers (FX layer only; promotable). Everything here is pure data + GLSL strings.
//
//  U      shared uniforms { uSeal, uSealR }: the seal's chest and its screen-guard radius.
//  MASK   GLSL sealMask(wp): 0 over the seal's silhouette column, 1 away from it. Every additive or
//         translucent effect multiplies by it, so nothing ever lies over the seal (L2) and no additive
//         light can push the seal past luma 0.92 (L8). Maths:
//           rd = normalize(S - C);  s = (W - C).rd;  d = |(W - C) - rd s|        (distance to the eye->seal ray)
//           mask = smoothstep(0.75 R, 1.7 R, d)   if W is nearer than the seal (s < |S-C| + 0.5 R), else 1
//  BB_VS  camera-facing quad: view-space offset  mv = V c + (x,y) size ; world pos for the mask via V^T.
//  BEHIND_VS  fullscreen quad whose depth sits just BEHIND the seal:  z_view = -(V S).z + 0.9 R ; the seal and
//         anything nearer occlude it (depth test), the far world is overpainted. Used for streak bands and cracks.
import * as THREE from "three";

export const MASK = /* glsl */ `
uniform vec3 uSeal; uniform float uSealR;
float sealMask(vec3 wp){
  vec3 rd = uSeal - cameraPosition; float L = length(rd); rd /= L;
  vec3 v = wp - cameraPosition; float s = dot(v, rd); float d = length(v - rd * s);
  float m = smoothstep(uSealR * 0.75, uSealR * 1.7, d);
  return s < L + uSealR * 0.5 ? m : 1.0;
}`;

export const HASH = /* glsl */ `
float h11(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h12(float n){ return vec2(h11(n), h11(n + 17.31)); }`;

export const BB_VS = /* glsl */ `
uniform vec2 uSize; uniform float uRoll;
varying vec2 vUv; varying vec3 vW;
void main(){
  vUv = uv;
  vec4 c = modelMatrix * vec4(0.,0.,0.,1.);
  vec2 q = position.xy; float cr = cos(uRoll), sr = sin(uRoll);
  q = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
  vec4 mv = viewMatrix * c; mv.xy += q * uSize;
  vW = c.xyz + transpose(mat3(viewMatrix)) * vec3(q * uSize, 0.);
  gl_Position = projectionMatrix * mv;
}`;

export const BEHIND_VS = /* glsl */ `
uniform vec3 uSeal; uniform float uSealR;
varying vec2 vUv;
void main(){
  vUv = position.xy + 0.5;
  float dz = -(viewMatrix * vec4(uSeal, 1.)).z + uSealR * 0.9;
  vec4 c = projectionMatrix * vec4(0., 0., -max(dz, 0.5), 1.);
  gl_Position = vec4(position.xy * 2. * c.w, c.z, c.w);
}`;

export function makeShared() {
  return { uSeal: { value: new THREE.Vector3() }, uSealR: { value: 1.1 } };
}

// events: scene.beats of this name (direction layer owns the clock); defaults are the bible's frames at 24 fps.
export function timeline(ctx) {
  const beats = ctx.scene.beats || [];
  const evs = (name, defs) => {
    const l = beats.filter((b) => b.name === name).map((b) => ({ t: b.t, dur: b.dur ?? 0.5, b })).sort((a, b) => a.t - b.t);
    return l.length ? l : defs.map(([t, dur = 0.5]) => ({ t, dur, b: {} }));
  };
  // seconds since the latest event of the list that has started (Infinity before) and its index
  const last = (list, t) => { let i = -1; for (let j = 0; j < list.length; j++) if (list[j].t <= t) i = j; return i < 0 ? { ago: Infinity, i: -1, ev: null } : { ago: t - list[i].t, i, ev: list[i] }; };
  return { evs, last };
}

// additive / blended ShaderMaterial with the shared seal uniforms merged in
export function shader({ vs, fs, uniforms = {}, U, additive = true, side = THREE.FrontSide, depthTest = true }) {
  return new THREE.ShaderMaterial({
    vertexShader: vs, fragmentShader: fs, uniforms: { ...U, ...uniforms },
    transparent: true, depthWrite: false, depthTest, side,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
  });
}

export function billboard({ fs, uniforms = {}, size = [1, 1], U, additive = true, depthTest = true }) {
  const mat = shader({ vs: MASK + BB_VS, fs: MASK + HASH + fs, U, additive, depthTest, uniforms: { uSize: { value: new THREE.Vector2(size[0], size[1]) }, uRoll: { value: 0 }, ...uniforms } });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 20;
  return mesh;
}

// n quads with per-quad vec4 attributes `aC`, `aD`: corner in `position.xy` (+-1), uv in `uv`
export function quadSoup(n, fill) {
  const pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), aC = new Float32Array(n * 16), aD = new Float32Array(n * 16), idx = [];
  const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < n; i++) {
    const [c, d] = fill(i);
    for (let k = 0; k < 4; k++) {
      pos.set([cs[k][0], cs[k][1], 0], (i * 4 + k) * 3);
      uv.set([cs[k][0] * 0.5 + 0.5, cs[k][1] * 0.5 + 0.5], (i * 4 + k) * 2);
      aC.set(c, (i * 4 + k) * 4); aD.set(d, (i * 4 + k) * 4);
    }
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("aC", new THREE.BufferAttribute(aC, 4)); g.setAttribute("aD", new THREE.BufferAttribute(aD, 4));
  g.setIndex(idx);
  return g;
}

// non-indexed triangle soup with barycentric + flat normal.
// trisOf(i) -> [[a,b,c],...] local verts of instance i; attrNames [[name, width]]; fill(i) -> {name:[...]}
export function triSoup(count, trisOf, attrNames, fill) {
  const P = [], N = [], B = [], A = {};
  for (const [n, w] of attrNames) A[n] = { w, a: [] };
  const bary = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let i = 0; i < count; i++) {
    const tris = trisOf(i), at = fill(i);
    for (const tri of tris) {
      const a = new THREE.Vector3(...tri[0]), b = new THREE.Vector3(...tri[1]), c = new THREE.Vector3(...tri[2]);
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      for (let k = 0; k < 3; k++) {
        P.push(...tri[k]); N.push(n.x, n.y, n.z); B.push(...bary[k]);
        for (const [nm] of attrNames) A[nm].a.push(...at[nm]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("aN", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("aB", new THREE.Float32BufferAttribute(B, 3));
  for (const [nm, w] of attrNames) g.setAttribute(nm, new THREE.Float32BufferAttribute(A[nm].a, w));
  return g;
}

export const OCTA = (() => {
  const v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const f = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
  return f.map((t) => t.map((i) => v[i]));
})();

// star (4-point) glint fragment: hard-edged, two-tone. uK 0..1 size, uCol, uCore, uAlpha
export const STAR_FS = /* glsl */ `
uniform float uK; uniform vec3 uCol; uniform vec3 uCore; uniform float uAlpha;
varying vec2 vUv; varying vec3 vW;
void main(){
  vec2 p = (vUv - .5) * 2.;
  // 4-point star: sqrt|x| + sqrt|y| <= k  (astroid), long arms on the axes; hard threshold = cel glint
  float a = sqrt(abs(p.x)) + sqrt(abs(p.y));
  float arm = step(a, 1.0 * uK + .0001);
  float core = step(a, .55 * uK);
  vec3 c = mix(uCol, uCore, core);
  float al = arm * uAlpha * sealMask(vW);
  if (al < .01) discard;
  gl_FragColor = vec4(c, al);
}`;

// flat lettering sprite: red drop shadow, white brush fill, ink stroke (the bible's SFX art)
export function letteringTexture(text) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256;
  const g = cv.getContext("2d");
  g.clearRect(0, 0, 512, 256);
  let size = 150; const fam = (s) => `900 ${s}px Impact, "Arial Black", sans-serif`;
  g.font = fam(size); g.textAlign = "center"; g.textBaseline = "middle";
  while (g.measureText(text).width > 440 && size > 40) { size -= 8; g.font = fam(size); }
  const skew = -0.14;
  g.setTransform(1, 0, skew, 1, -skew * 128, 0);
  g.lineJoin = "round";
  g.fillStyle = "#8a1219"; g.fillText(text, 256 + 9, 128 + 9); // red drop shadow
  g.lineWidth = 16; g.strokeStyle = "#0b0e10"; g.strokeText(text, 256, 128); // ink stroke
  g.fillStyle = "#f6f1e6"; g.fillText(text, 256, 128); // white brush
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return tex;
}

export const hex = (s) => new THREE.Color(s);
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
