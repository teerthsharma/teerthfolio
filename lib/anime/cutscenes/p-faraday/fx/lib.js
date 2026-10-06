// p-faraday FX helpers (own folder only; Consolidate may promote RibbonBatch, billboard() and strip() to shared).
//
// Everything here is drawn with plain ShaderMaterials built once in build(ctx) (no shader links in playback).
// Colours are THREE.Color (linear under colour management); the post chain is linear half-float -> sRGB, so a
// uHdr above 1 blooms. The seal is never touched: every full-frame quad is pushed BEHIND the seal's depth.
//
// Maths used across the files
//   screen ribbon   a polyline P_i with tangent T_i. In pixels s_i = ndc(P_i) * res/2 and d = ndc(P_i + T_i) - s_i.
//                   n = (-d.y, d.x)/|d|. The vertex moves by side * 0.5 * w_px * n  in pixel space, so every ribbon
//                   keeps a CONSTANT width in pixels (the J.C.Staff line: 1.5 / 3.5 px at 1280x720, scaled by H/720).
//   billboard       view-space centre mc = V c. The quad is placed at z = mc.z - push (pushed away from the lens) and
//                   scaled by z'/mc.z so its angular size does not change. Used to sit flashes BEHIND the seal.
//   full-frame      half-height at depth z is hH = -z / P11, half-width hW = hH P11 / P00; the quad sits behind the
//                   seal's depth, so the seal (nearer) is never covered. vUv in [-1,1] is the screen NDC.
//   cylinder strip  a straight beam about axis a (world): perp = normalize(a_v x mv) in view space, so the strip is
//                   always the silhouette of a cylinder of radius R. Pixel pad p adds p * (2 |z| / (P11 H)) metres.

export const NZ = /* glsl */ `
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
`;

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
// a deterministic hash in [0,1) of up to three integers (never Math.random: scrubbing equals playing)
export const hash3 = (a, b = 0, c = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s); };

// the beat times (s). The direction layer may name them as beats; absent beats fall back to the bible's card times.
export const DEFAULT_T = {
  zap: 1.15, fieldsStart: 1.2, tickLock: 4.0, amber: 4.85, coinToss: 6.4, shot: 6.8, afterglow: 9.2,
  proof: 12.0, face: 14.4, credit: 16.7, wipe: 20.0,
};
export function timeline(ctx) {
  const beats = ctx.scene.beats ?? [];
  const T = {};
  for (const k of Object.keys(DEFAULT_T)) { const b = beats.find((x) => x.name === k); T[k] = b ? b.t : DEFAULT_T[k]; }
  T.hitStop = 4 / 24; // f163-167
  T.hasBeatNear = (name, t, tol = 0.35) => beats.some((b) => b.name === name && Math.abs(b.t - t) < tol);
  return T;
}

// layout in world metres, relative to the seal unless scene.layout.fx overrides (A, B bushing bases; deckY; riverY; muzzle; hand)
export function layoutOf(ctx) {
  const S = ctx.scene.seal ?? {}, at = S.at ?? [0, 0, 0], sc = S.scale ?? 1;
  const o = ctx.scene.layout?.fx ?? {};
  const deckY = o.deckY ?? at[1];
  const base = deckY + 0.16;
  const z0 = o.fieldZ ?? at[2] - 1.6;
  return {
    A: o.A ?? [at[0] - 2.1, base, z0],
    B: o.B ?? [at[0] + 2.1, base, z0],
    base, deckY, scale: sc,
    levels: [1.15, 2.35, 3.55], bows: [-0.52, 0, 0.52], rho: 0.95, bushH: 4.4,
    riverY: o.riverY ?? deckY - 3.5,
    handD: o.handD ?? 2.6, // beam length at which Touma's hand meets it
    moon: o.moon ?? [-0.62, 0.52, -0.58],
  };
}

// the per-frame shared uniforms
export function makeShared(THREE, ctx) {
  const res = new THREE.Vector2(1280, 720);
  const sh = {
    res, uRes: { value: res }, uHs: { value: 1 }, uAsp: { value: 16 / 9 }, uSeal: { value: new THREE.Vector3() },
    sync() {
      try { ctx.engine.renderer.getDrawingBufferSize(res); } catch { /* keep the last size */ }
      this.uHs.value = res.y / 720; this.uAsp.value = res.x / Math.max(1, res.y);
      ctx.seal.chest(this.uSeal.value);
    },
  };
  return sh;
}

export function mat(THREE, { vs, fs, u, add = false, depthTest = true }) {
  return new THREE.ShaderMaterial({
    vertexShader: vs, fragmentShader: fs, uniforms: u, transparent: true, depthWrite: false, depthTest,
    blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, side: THREE.DoubleSide,
  });
}

// ---- constant-pixel-width ribbons -------------------------------------------------------------------------------
const RIB_VS = /* glsl */ `
attribute vec3 tang; attribute float side; attribute float uu; attribute float al;
uniform vec2 uRes; uniform float uHs; uniform float uPx; uniform float uTaper;
varying float vU; varying float vS; varying float vA;
void main() {
  mat4 M = projectionMatrix * viewMatrix;
  vec4 c0 = M * vec4(position, 1.0), c1 = M * vec4(position + tang, 1.0);
  vec2 s0 = c0.xy / c0.w * uRes * .5, s1 = c1.xy / c1.w * uRes * .5;
  vec2 d = s1 - s0; float dl = length(d); d = dl > 1e-4 ? d / dl : vec2(1., 0.);
  vec2 n = vec2(-d.y, d.x);
  float tp = mix(1., max(.12, pow(sin(3.14159 * clamp(uu, 0., 1.)), .55)), uTaper);
  c0.xy += n * side * .5 * uPx * uHs * tp / uRes * 2. * c0.w;
  gl_Position = c0; vU = uu; vS = side; vA = al;
}`;
const RIB_FS = /* glsl */ `
uniform vec3 uCol; uniform float uA; uniform float uHdr; uniform float uSoft; uniform float uDashN; uniform float uDuty; uniform float uPhase;
varying float vU; varying float vS; varying float vA;
void main() {
  float a = uA * vA; if (a < .004) discard;
  if (uDashN > 0.) { if (fract(vU * uDashN + uPhase) > uDuty) discard; }
  a *= 1. - uSoft * smoothstep(.0, 1., abs(vS));
  gl_FragColor = vec4(uCol * uHdr, a);
}`;

export class RibbonBatch {
  constructor(THREE, shared, nRib, nPts) {
    this.THREE = THREE; this.shared = shared; this.nRib = nRib; this.nPts = nPts;
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
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); // never frustum-culled
    this.geo = g; this.mats = [];
  }
  // pts: flat [x,y,z,...] with nPts points; a: alpha 0..1
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
  hide(r) { for (let i = 0; i < this.nPts * 2; i++) this.al[r * this.nPts * 2 + i] = 0; }
  commit() {
    const g = this.geo;
    g.attributes.position.needsUpdate = true; g.attributes.tang.needsUpdate = true; g.attributes.al.needsUpdate = true;
  }
  // a drawable pass: { col, px, a, hdr, soft, taper, add, dashN, duty, order }
  pass(o) {
    const THREE = this.THREE;
    const u = {
      uRes: this.shared.uRes, uHs: this.shared.uHs, uPx: { value: o.px ?? 3 }, uTaper: { value: o.taper ?? 1 },
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uA: { value: o.a ?? 1 }, uHdr: { value: o.hdr ?? 1 },
      uSoft: { value: o.soft ?? 0 }, uDashN: { value: o.dashN ?? 0 }, uDuty: { value: o.duty ?? 1 }, uPhase: { value: 0 },
    };
    const m = mat(THREE, { vs: RIB_VS, fs: RIB_FS, u, add: !!o.add });
    const mesh = new THREE.Mesh(this.geo, m);
    mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 5;
    this.mats.push(m);
    mesh.userData.u = u;
    return mesh;
  }
  dispose() { this.geo.dispose(); for (const m of this.mats) m.dispose(); }
}

// ---- billboards: camera-facing quads, optionally pushed behind the seal, optionally the whole frame -----------------
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

export function billboard(THREE, shared, fs, extra = {}, o = {}) {
  const u = {
    uCenter: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector2(1, 1) }, uPush: { value: o.push ?? 0 },
    uFull: { value: o.full ? 1 : 0 }, uRot: { value: 0 }, uSealW: shared.uSeal,
    uRes: shared.uRes, uHs: shared.uHs, uAsp: shared.uAsp, ...extra,
  };
  const m = mat(THREE, { vs: BB_VS, fs: NZ + fs, u, add: !!o.add, depthTest: o.depthTest ?? true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 3; mesh.visible = false;
  mesh.userData.u = u;
  return mesh;
}

// ---- cylinder strip along +x: beam, outline, shimmer, coin streak -------------------------------------------------
const STRIP_VS = /* glsl */ `
uniform vec3 uOrigin; uniform float uLen; uniform float uR; uniform float uPad; uniform float uCone; uniform float uTip; uniform vec2 uRes; uniform float uHs;
varying float vX; varying float vV; varying float vU;
void main() {
  float u = position.x, x = u * uLen;
  float prof = mix(uCone, 1., smoothstep(0., 4., x));
  prof *= sqrt(clamp(1. - smoothstep(uLen - uTip, uLen, x), 0., 1.));
  vec4 mv = viewMatrix * vec4(uOrigin + vec3(x, 0., 0.), 1.0);
  vec3 ax = mat3(viewMatrix) * vec3(1., 0., 0.);
  vec3 cp = cross(ax, mv.xyz); float cl = length(cp);
  vec3 perp = cl > 1e-5 ? cp / cl : vec3(0., 1., 0.);
  float R = max(uR * prof, 1e-4);
  float wpp = 2. * max(-mv.z, .05) / (projectionMatrix[1][1] * uRes.y);
  float Rp = R + uPad * wpp * uHs;
  mv.xyz += perp * position.y * Rp;
  vV = position.y * Rp / R; vX = x; vU = u;
  gl_Position = projectionMatrix * mv;
}`;

export function stripGeo(THREE, n = 72) {
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) { pos.push(i / n, -1, 0, i / n, 1, 0); if (i < n) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
}

export function strip(THREE, shared, geo, fs, extra = {}, o = {}) {
  const u = {
    uOrigin: { value: new THREE.Vector3() }, uLen: { value: 1 }, uR: { value: 0.3 }, uPad: { value: o.pad ?? 0 },
    uCone: { value: o.cone ?? 1 }, uTip: { value: o.tip ?? 0.6 }, uRes: shared.uRes, uHs: shared.uHs, ...extra,
  };
  const m = mat(THREE, { vs: STRIP_VS, fs: NZ + fs, u, add: !!o.add, depthTest: o.depthTest ?? true });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 6; mesh.visible = false;
  mesh.userData.u = u;
  return mesh;
}

// the seal's flipper tip, where the coin sits (the seal faces +x in profile)
export function coinTip(seal, out) {
  const s = seal.scale ?? 1;
  return out.set(seal.at[0] + 0.46 * s, seal.at[1] + 0.56 * s, seal.at[2] + 0.2 * s);
}
export function muzzleOf(seal, out) {
  const s = seal.scale ?? 1;
  return out.set(seal.at[0] + 0.62 * s, seal.at[1] + 0.52 * s, seal.at[2] + 0.2 * s);
}
