// p-monodromy FX helpers (own folder only). Consolidate may promote RibbonBatch, SparkField, bb() and sealVis to shared.
//
// Everything is drawn with plain ShaderMaterials built once in build(ctx) (no shader links in playback). The post chain is linear
// half-float, so an HDR value above 1 blooms (lightning). The seal is never touched: full-frame and screen-space quads are pushed BEHIND
// the seal's depth, and anything that must sit in front of the lens (particles, wreath arcs) is hidden inside the seal's screen disc.
//
// Maths shared by the files
//   screen ribbon  polyline P_i, tangent T_i. s_i = ndc(P_i) * res / 2 (pixels); d = ndc(P_i + T_i) - s_i; n = (-d.y, d.x) / |d|.
//                  clip.xy += n * side * 0.5 * w_px * (2 / res) * clip.w, so the ribbon keeps a CONSTANT pixel width (1280x720 basis, x H/720).
//   behind seal    seal chest in view space ms; z = min(ms.z, -0.6) - push; half extents hH = -z / P11, hW = hH * P11 / P00.
//                  A quad at that z covers the frame yet every seal fragment (nearer) wins the depth test: the hero is never covered.
//   seal disc      sealVis(mv): 0 when the point is nearer than the seal's slab AND inside the seal's screen circle
//                  (radius R_ndc = uSealRad * P11 / -ms.z, aspect-corrected), smooth over 15 percent. Used by particles and wreath arcs.

export const NZ = /* glsl */ `
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
`;

// vertex-shader snippet: needs uniforms uSealW (world chest) and uSealRad (m). Uses the built-in viewMatrix/projectionMatrix.
export const SEAL_VIS = /* glsl */ `
uniform vec3 uSealW; uniform float uSealRad;
float sealVis(vec4 mv) {
  vec4 ms = viewMatrix * vec4(uSealW, 1.0);
  if (ms.z > -0.05) return 1.0;
  vec4 pc = projectionMatrix * mv, ps = projectionMatrix * ms;
  float asp = projectionMatrix[1][1] / projectionMatrix[0][0];
  vec2 d = (pc.xy / max(pc.w, 1e-4) - ps.xy / ps.w) * vec2(asp, 1.0);
  float R = uSealRad * projectionMatrix[1][1] / -ms.z;
  float inFront = step(ms.z - uSealRad * 0.5, mv.z);
  return mix(1.0, smoothstep(R * 0.9, R * 1.15, length(d)), inFront);
}
`;

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
// deterministic hash in [0,1) of up to three numbers (never Math.random: scrubbing equals playing)
export const hash3 = (a, b = 0, c = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s); };

// Beat times from scene.js, falling back to the bible's card times (seconds). Every cue name here is optional.
export function timeline(ctx) {
  const beats = ctx.scene.beats ?? [];
  const list = (name, def) => { const f = beats.filter((b) => b.name === name).map((b) => b.t); return f.length ? f : def; };
  const one = (name, def) => list(name, [def])[0];
  const durOf = (name, def) => beats.find((b) => b.name === name)?.dur ?? def;
  const has = (n) => beats.some((b) => b.name === n);
  return { list, one, durOf, has };
}

// world layout, relative to the seal unless scene.layout.fx overrides { vortex, palace, cultists:[[x,y,z]...], floorY }
export function layoutOf(ctx) {
  const S = ctx.scene.seal ?? {}, at = S.at ?? [0, 0, 0], sc = S.scale ?? 1, o = ctx.scene.layout?.fx ?? {};
  const add = (dx, dy, dz) => [at[0] + dx, at[1] + dy, at[2] + dz];
  const cultists = o.cultists ?? Array.from({ length: 8 }, (_, i) => add(-9 + (18 * i) / 7, 0.45, -9.5 + (i % 2) * 3.5));
  return { at, scale: sc, vortex: o.vortex ?? add(0, 18, -14), palace: o.palace ?? add(0, 9, -52), cultists, floorY: o.floorY ?? at[1] };
}

// per-frame shared uniforms
export function makeShared(THREE, ctx) {
  const res = new THREE.Vector2(1280, 720);
  const sh = {
    res, uRes: { value: res }, uHs: { value: 1 }, uAsp: { value: 16 / 9 },
    uSealW: { value: new THREE.Vector3() }, uSealRad: { value: 0.6 * (ctx.scene.seal?.scale ?? 1) },
    sync() {
      try { ctx.engine.renderer.getDrawingBufferSize(res); } catch { /* keep last */ }
      this.uHs.value = res.y / 720; this.uAsp.value = res.x / Math.max(1, res.y);
      ctx.seal.chest(this.uSealW.value);
    },
  };
  return sh;
}

export function mat(THREE, { vs, fs, u, add = false, depthTest = true, side }) {
  return new THREE.ShaderMaterial({
    vertexShader: vs, fragmentShader: fs, uniforms: u, transparent: true, depthWrite: false, depthTest,
    blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, side: side ?? THREE.DoubleSide,
  });
}

// ---- constant-pixel-width ribbons (world polylines) ---------------------------------------------------------------
const RIB_VS = /* glsl */ `
attribute vec3 tang; attribute float side; attribute float uu; attribute float al;
uniform vec2 uRes; uniform float uHs; uniform float uPx; uniform float uTaper; uniform float uHide;
varying float vU; varying float vS; varying float vA;
${SEAL_VIS}
void main() {
  mat4 M = projectionMatrix * viewMatrix;
  vec4 c0 = M * vec4(position, 1.0), c1 = M * vec4(position + tang, 1.0);
  vec2 s0 = c0.xy / c0.w * uRes * .5, s1 = c1.xy / c1.w * uRes * .5;
  vec2 d = s1 - s0; float dl = length(d); d = dl > 1e-4 ? d / dl : vec2(1., 0.);
  vec2 n = vec2(-d.y, d.x);
  float tp = mix(1., max(.12, pow(sin(3.14159 * clamp(uu, 0., 1.)), .55)), uTaper);
  c0.xy += n * side * .5 * uPx * uHs * tp / uRes * 2. * c0.w;
  gl_Position = c0; vU = uu; vS = side; vA = al;
  if (uHide > .5) vA *= sealVis(viewMatrix * vec4(position, 1.0));
}`;
const RIB_FS = /* glsl */ `
uniform vec3 uCol; uniform float uA; uniform float uHdr; uniform float uSoft;
varying float vU; varying float vS; varying float vA;
void main() {
  float a = uA * vA; if (a < .004) discard;
  a *= 1. - uSoft * smoothstep(.0, 1., abs(vS));
  gl_FragColor = vec4(uCol * uHdr, a);
}`;

export class RibbonBatch {
  constructor(THREE, shared, nRib, nPts, hide = false) {
    this.THREE = THREE; this.shared = shared; this.nRib = nRib; this.nPts = nPts; this.hide = hide;
    const nV = nRib * nPts * 2;
    this.pos = new Float32Array(nV * 3); this.tan = new Float32Array(nV * 3);
    this.side = new Float32Array(nV); this.uu = new Float32Array(nV); this.al = new Float32Array(nV);
    const idx = [];
    for (let r = 0; r < nRib; r++) for (let i = 0; i < nPts; i++) {
      const v = (r * nPts + i) * 2;
      this.side[v] = -1; this.side[v + 1] = 1; this.uu[v] = this.uu[v + 1] = i / (nPts - 1);
      if (i < nPts - 1) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("tang", new THREE.BufferAttribute(this.tan, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("side", new THREE.BufferAttribute(this.side, 1));
    g.setAttribute("uu", new THREE.BufferAttribute(this.uu, 1));
    g.setAttribute("al", new THREE.BufferAttribute(this.al, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.geo = g; this.mats = [];
  }
  // pts: flat [x,y,z,...] nPts points; a: alpha 0..1
  set(r, pts, a = 1) {
    const n = this.nPts, P = this.pos, T = this.tan;
    for (let i = 0; i < n; i++) {
      const v = (r * n + i) * 2, x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
      const j0 = Math.max(0, i - 1), j1 = Math.min(n - 1, i + 1);
      const tx = pts[j1 * 3] - pts[j0 * 3], ty = pts[j1 * 3 + 1] - pts[j0 * 3 + 1], tz = pts[j1 * 3 + 2] - pts[j0 * 3 + 2];
      for (let k = 0; k < 2; k++) {
        const o = (v + k) * 3;
        P[o] = x; P[o + 1] = y; P[o + 2] = z; T[o] = tx; T[o + 1] = ty; T[o + 2] = tz;
        this.al[v + k] = a;
      }
    }
  }
  hideRib(r) { const n = this.nPts * 2, b = r * n; for (let i = 0; i < n; i++) this.al[b + i] = 0; }
  commit() { const a = this.geo.attributes; a.position.needsUpdate = true; a.tang.needsUpdate = true; a.al.needsUpdate = true; }
  // a drawable pass: { col, px, a, hdr, soft, taper, add, order }
  pass(o) {
    const THREE = this.THREE, sh = this.shared;
    const u = {
      uRes: sh.uRes, uHs: sh.uHs, uPx: { value: o.px ?? 3 }, uTaper: { value: o.taper ?? 1 },
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uA: { value: o.a ?? 1 }, uHdr: { value: o.hdr ?? 1 },
      uSoft: { value: o.soft ?? 0 }, uHide: { value: this.hide ? 1 : 0 }, uSealW: sh.uSealW, uSealRad: sh.uSealRad,
    };
    const m = mat(THREE, { vs: RIB_VS, fs: RIB_FS, u, add: !!o.add });
    const mesh = new THREE.Mesh(this.geo, m);
    mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 5;
    this.mats.push(m); mesh.userData.u = u;
    return mesh;
  }
  dispose() { this.geo.dispose(); for (const m of this.mats) m.dispose(); }
}

// ---- billboards: a full-frame quad behind the seal, or a camera-facing world quad ----------------------------------
const BB_VS = /* glsl */ `
uniform vec3 uCenter; uniform vec2 uSize; uniform float uPush; uniform float uFull; uniform float uRot; uniform vec3 uSealW;
varying vec2 vUv; varying vec2 vSealNdc; varying float vAsp;
void main() {
  vUv = position.xy;
  vec4 sc = projectionMatrix * viewMatrix * vec4(uSealW, 1.0); vSealNdc = sc.xy / sc.w;
  vAsp = projectionMatrix[1][1] / projectionMatrix[0][0];
  vec4 mv;
  if (uFull > .5) {
    vec4 ms = viewMatrix * vec4(uSealW, 1.0);
    float z = min(ms.z, -.6) - uPush;
    float hH = -z / projectionMatrix[1][1], hW = hH * vAsp;
    mv = vec4(position.x * hW * 1.08, position.y * hH * 1.08, z, 1.0);
  } else {
    vec4 mc = viewMatrix * vec4(uCenter, 1.0);
    float z = mc.z - uPush, k = z / min(mc.z, -.01);
    float cr = cos(uRot), sr = sin(uRot);
    vec2 q = vec2(position.x * uSize.x, position.y * uSize.y); q = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
    mv = vec4(mc.xy * k + q * k, z, 1.0);
  }
  gl_Position = projectionMatrix * mv;
}`;

// fs: fragment source using vUv (-1..1), vSealNdc, vAsp plus the uniforms in `extra`. o: { full, add, push, order, depthTest }
export function bb(THREE, sh, fs, extra = {}, o = {}) {
  const u = {
    uCenter: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector2(1, 1) }, uPush: { value: o.push ?? 0.5 },
    uFull: { value: o.full ? 1 : 0 }, uRot: { value: 0 }, uSealW: sh.uSealW, uRes: sh.uRes, uHs: sh.uHs, uAsp: sh.uAsp, ...extra,
  };
  const m = mat(THREE, { vs: BB_VS, fs: NZ + fs, u, add: !!o.add, depthTest: o.depthTest ?? true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 3; mesh.visible = false; mesh.userData.u = u;
  return mesh;
}

// ---- SparkField: instanced hard diamonds, stateless (position is a function of the clock) -------------------------
//   p(tau) = P0 + V tau - (0, g tau^2 / 2, 0); tau = uT - t0 (loop: mod life). Size shrinks over the last 40 percent of life.
const SPK_VS = /* glsl */ `
attribute vec3 aP0; attribute vec3 aV; attribute vec3 aCol; attribute vec4 aT; // t0, life, size px, seed
uniform float uT; uniform float uG; uniform float uLoop; uniform float uOn; uniform vec2 uRes; uniform float uHs;
varying vec3 vC; varying vec2 vQ;
${SEAL_VIS}
void main() {
  float tau = uT - aT.x;
  float ok = step(0., tau);
  if (uLoop > .5) tau = mod(max(tau, 0.), aT.y); else ok *= step(tau, aT.y);
  float k = tau / aT.y;
  vec3 p = aP0 + aV * tau - vec3(0., .5 * uG * tau * tau, 0.);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float sz = aT.z * uHs * (1. - smoothstep(.6, 1., k)) * ok * uOn * sealVis(mv);
  vec4 c = projectionMatrix * mv;
  c.xy += position.xy * sz / uRes * 2. * c.w;
  gl_Position = c; vC = aCol; vQ = position.xy;
}`;
const SPK_FS = /* glsl */ `
varying vec3 vC; varying vec2 vQ;
void main() {
  float d = abs(vQ.x) + abs(vQ.y); if (d > 1.) discard;
  gl_FragColor = vec4(mix(vC, vec3(1.), step(d, .34)), 1.);
}`;

export class SparkField {
  constructor(THREE, sh, n, o = {}) {
    this.n = n;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.p0 = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.t = new Float32Array(n * 4);
    g.setAttribute("aP0", new THREE.InstancedBufferAttribute(this.p0, 3));
    g.setAttribute("aV", new THREE.InstancedBufferAttribute(this.v, 3));
    g.setAttribute("aCol", new THREE.InstancedBufferAttribute(this.col, 3));
    g.setAttribute("aT", new THREE.InstancedBufferAttribute(this.t, 4));
    g.instanceCount = n; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.u = { uT: { value: 0 }, uG: { value: o.g ?? 0 }, uLoop: { value: o.loop ? 1 : 0 }, uOn: { value: 1 }, uRes: sh.uRes, uHs: sh.uHs, uSealW: sh.uSealW, uSealRad: sh.uSealRad };
    this.mat = mat(THREE, { vs: SPK_VS, fs: SPK_FS, u: this.u, add: !!o.add });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = o.order ?? 6;
    this.geo = g; this.THREE = THREE;
  }
  // i: slot; p0 [x,y,z]; v [x,y,z]; col hex; t0, life, px, seed
  setP(i, p0, v, colHex, t0, life, px, seed = 0) {
    const c = new this.THREE.Color(colHex);
    this.p0.set(p0, i * 3); this.v.set(v, i * 3); this.col.set([c.r, c.g, c.b], i * 3); this.t.set([t0, life, px, seed], i * 4);
  }
  commit() { for (const k of ["aP0", "aV", "aCol", "aT"]) this.geo.attributes[k].needsUpdate = true; }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
