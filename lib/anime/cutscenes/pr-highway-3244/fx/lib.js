// FX helpers for pr-highway-3244. Pure functions of the clock; no Math.random. Candidates for promotion to a shared module:
//   StripPool  camera-facing 2-tone ribbons in one draw call (bolts, trails, streaks, light bands)
//   sprite     a view-facing quad with a custom fragment (stars, flares, flames, discs)
//   points     a hard-edged Points cloud with metre-sized sprites (cel puffs, confetti, motes)
// Maths used across the file:
//   hash(i, s)          fract(sin(i*127.1 + s*311.7) * 43758.5453): a stable per-particle random in [0,1)
//   sstep(a,b,x)        t = clamp((x-a)/(b-a)), t^2 (3 - 2t)
//   camera-facing strip side vector s = normalize(cross(tangent, eye - p)); the ribbon is p +- s w/2
import * as THREE from "three";

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const hash = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const mulberry = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// raw sRGB bytes: the ShaderMaterials here skip colour management
export const rgb = (hex) => { const n = parseInt(String(hex).replace("#", ""), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// ---------------------------------------------------------------- StripPool
const STRIP_VERT = /* glsl */ `
attribute vec3 aTan; attribute float aSide; attribute vec3 aCore; attribute vec3 aEdge; attribute vec3 aInfo;
varying float vS; varying vec3 vCore; varying vec3 vEdge; varying vec3 vI;
void main(){
  vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 d = normalize(aTan + vec3(1e-5));
  vec3 v = normalize(cameraPosition - wp);
  vec3 s = cross(d, v); float l = length(s);
  s = l > 1e-4 ? s / l : vec3(0.0, 1.0, 0.0);
  wp += s * aSide * aInfo.x * 0.5;                 // aInfo = (width m, alpha, core half-width 0..1)
  vS = aSide; vCore = aCore; vEdge = aEdge; vI = aInfo;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const STRIP_FRAG = /* glsl */ `
uniform float uGain; varying float vS; varying vec3 vCore; varying vec3 vEdge; varying vec3 vI;
void main(){
  float v = abs(vS);
  if (vI.y <= 0.001) discard;
  vec3 c = v < vI.z ? vCore : vEdge;               // hard two-tone: no gradient (cel law)
  gl_FragColor = vec4(min(c * uGain, vec3(1.6)), vI.y);
}`;

export class StripPool {
  constructor(maxV = 7000, gain = 1.25) {
    this.maxV = maxV;
    const g = new THREE.BufferGeometry();
    const mk = (n) => { const a = new THREE.BufferAttribute(new Float32Array(maxV * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPos = mk(3); this.aTan = mk(3); this.aSide = mk(1); this.aCore = mk(3); this.aEdge = mk(3); this.aInfo = mk(3);
    g.setAttribute("position", this.aPos); g.setAttribute("aTan", this.aTan); g.setAttribute("aSide", this.aSide);
    g.setAttribute("aCore", this.aCore); g.setAttribute("aEdge", this.aEdge); g.setAttribute("aInfo", this.aInfo);
    this.aIdx = new THREE.BufferAttribute(new Uint32Array(maxV * 3), 1); this.aIdx.setUsage(THREE.DynamicDrawUsage);
    g.setIndex(this.aIdx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uGain: { value: gain } }, vertexShader: STRIP_VERT, fragmentShader: STRIP_FRAG,
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 20;
    this.v = 0; this.i = 0;
  }
  begin() { this.v = 0; this.i = 0; }
  // pts: [[x,y,z],...]; o: { w: number | (u,i)=>m, a: number | (u,i)=>0..1, core:[r,g,b], edge:[r,g,b], cw: 0..1 }
  strip(pts, o) {
    const n = pts.length; if (n < 2 || this.v + n * 2 > this.maxV) return;
    const w = o.w ?? 0.2, a = o.a ?? 1, cw = o.cw ?? 0.4, core = o.core, edge = o.edge ?? o.core;
    const base = this.v;
    for (let i = 0; i < n; i++) {
      const p = pts[i], p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n - 1, i + 1)], u = i / (n - 1);
      const tw = typeof w === "function" ? w(u, i) : w, ta = typeof a === "function" ? a(u, i) : a;
      for (let s = 0; s < 2; s++) {
        const k = this.v++;
        this.aPos.setXYZ(k, p[0], p[1], p[2]);
        this.aTan.setXYZ(k, p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
        this.aSide.setX(k, s ? 1 : -1);
        this.aCore.setXYZ(k, core[0], core[1], core[2]); this.aEdge.setXYZ(k, edge[0], edge[1], edge[2]);
        this.aInfo.setXYZ(k, tw, ta, cw);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const q = base + i * 2, I = this.aIdx.array;
      I[this.i++] = q; I[this.i++] = q + 1; I[this.i++] = q + 2;
      I[this.i++] = q + 1; I[this.i++] = q + 3; I[this.i++] = q + 2;
    }
  }
  end() {
    this.geo.setDrawRange(0, this.i);
    for (const a of [this.aPos, this.aTan, this.aSide, this.aCore, this.aEdge, this.aInfo, this.aIdx]) a.needsUpdate = true;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

// ---------------------------------------------------------------- view-facing sprite
const SPR_VERT = /* glsl */ `
uniform vec3 uC; uniform vec2 uS; uniform float uRot; uniform float uPush; varying vec2 vP;
void main(){
  vP = position.xy * 2.0;
  vec4 mv = viewMatrix * vec4(uC, 1.0);
  float c = cos(uRot), s = sin(uRot);
  vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
  mv.xy += q * uS;                                   // uS = (width, height) in metres; 0 = hidden
  mv.z -= uPush;                                     // push away from the camera so the seal stays in front
  gl_Position = projectionMatrix * mv;
}`;
// frag: GLSL body defining `vec4 spr(vec2 p)` (p in -1..1, y up); uniforms uA (alpha), uT (time), uK (free)
export function sprite(frag, { blending = THREE.AdditiveBlending, depthTest = true, extra = {} } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Vector3() }, uS: { value: new THREE.Vector2(0, 0) }, uRot: { value: 0 }, uPush: { value: 0 }, uA: { value: 1 }, uT: { value: 0 }, uK: { value: 0 }, ...extra },
    vertexShader: SPR_VERT,
    fragmentShader: `varying vec2 vP; uniform float uA; uniform float uT; uniform float uK;\n${frag}\nvoid main(){ vec4 c = spr(vP); if (c.a <= 0.002) discard; gl_FragColor = vec4(c.rgb, c.a * uA); }`,
    transparent: true, depthWrite: false, depthTest, blending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 30;
  mesh.set = (c, w, h, rot = 0, push = 0) => { mat.uniforms.uC.value.set(c[0], c[1], c[2]); mat.uniforms.uS.value.set(w, h); mat.uniforms.uRot.value = rot; mat.uniforms.uPush.value = push; };
  mesh.hide = () => mat.uniforms.uS.value.set(0, 0);
  return mesh;
}

// ---------------------------------------------------------------- hard-edged point clouds
// vert gives gl_PointSize in px from a size in metres: px = size * (H/2) * P[1][1] / -z
export function points(n, { vertExtra = "", fragBody, depthTest = true, blending = THREE.NormalBlending, transparent = false, order = 25 }) {
  const g = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3), size = new THREE.BufferAttribute(new Float32Array(n), 1);
  const seed = new THREE.BufferAttribute(new Float32Array(n), 1), col = new THREE.BufferAttribute(new Float32Array(n * 3), 3), aux = new THREE.BufferAttribute(new Float32Array(n), 1);
  for (const a of [pos, size, seed, col, aux]) a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("position", pos); g.setAttribute("aSize", size); g.setAttribute("aSeed", seed); g.setAttribute("aCol", col); g.setAttribute("aAux", aux);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uH: { value: 720 } },
    vertexShader: `uniform float uH; attribute float aSize; attribute float aSeed; attribute vec3 aCol; attribute float aAux; varying float vSeed; varying vec3 vCol; varying float vAux;
      ${vertExtra}
      void main(){ vSeed = aSeed; vCol = aCol; vAux = aAux;
        vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
        if (aSize <= 0.0 || mv.z > -0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
        gl_PointSize = clamp(aSize * uH * 0.5 * projectionMatrix[1][1] / -mv.z, 1.0, 400.0);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vSeed; varying vec3 vCol; varying float vAux;\n${fragBody}`,
    depthTest, depthWrite: !transparent, transparent, blending,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = order;
  return { pts, pos, size, seed, col, aux, mat, geo: g, flush() { pos.needsUpdate = size.needsUpdate = seed.needsUpdate = col.needsUpdate = aux.needsUpdate = true; }, dispose() { g.dispose(); mat.dispose(); } };
}
