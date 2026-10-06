// p-tangle FX helpers (own folder only; Consolidate may promote billboard(), ribbon(), pool() to shared).
// All materials are plain ShaderMaterials built once in build(ctx): nothing links during playback.
// Colours are THREE.Color (linear); the post chain is linear half-float -> sRGB, a uHdr above 1 blooms.
// The seal is never covered: full-frame quads sit BEHIND the seal's depth (depth-tested against it, never written),
// local billboards and particles fade to zero where they would sit between the lens and the seal.
//
// Maths
//   billboard      view-space centre mc = V c. The quad sits at z' = mc.z - push and is scaled by z'/mc.z, so its
//                  angular size is unchanged by the push. Full-frame: half height hH = -z/P11, half width hW = hH * aspect,
//                  z = min(seal view z, -0.6) - push, so the whole frame is painted behind the seal.
//   sun in frame   a direction d (w = 0) projects as clip = P (V (d, 0)); clip.w = -z_view > 0 means in front of the lens;
//                  ndc = clip.xy / clip.w. Translation is dropped, so the sun stays at infinity.
//   seal fade      particle p and seal chest s in view space; if p is nearer than s - 0.3 scale AND the NDC distance
//                  (aspect-corrected) is under 0.55 scale / -s.z * P11, alpha -> 0 (smoothstep 0.8..1.3 of that radius).
//   ribbon         P(u) = head + tailDir len u + bend u^2 (u = 0 at the head). The vertex is pushed by
//                  perp = normalize(T_view x P_view) * side * w(u), so the strip is always seen face on.

export const NZ = /* glsl */ `
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
// 4-point glint: soft core + a thin vertical and horizontal spike (the Shinkai lens star). s = size in p units.
float glint(vec2 p, float s){
  float d = length(p);
  float core = exp(-d / s * 7.);
  float hz = exp(-abs(p.y) / (s * .05)) * exp(-abs(p.x) / s);
  float vt = exp(-abs(p.x) / (s * .05)) * exp(-abs(p.y) / s);
  return core + .85 * (hz + vt);
}
// regular hexagon distance (flat top): 1 on the hexagon of circumradius 1
float hexd(vec2 p){ vec2 q = abs(p); return max(q.x * .8660254 + q.y * .5, q.y); }
`;

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const hash = (a, b = 0, c = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s); };

// ---- the beat times (real seconds of the card). The direction layer may name them as beats (t, dur); absent beats
// fall back to the bible's shot list, scaled by scene.duration / 28.6.
export const DEFAULT_T = {
  dimension: [0, 2.8], ghosts: [1.9, 1.3], posterFlare: [2.8, 0.2], shafts: [2.8, 8.2],
  loopLight: [7.7, 2.5], link: [10.2, 0.9], cometStart: [11.0, 2.9], cometSplit: [11.9, 0.7], cometThird: [12.6, 0.7],
  cometImpact: [13.9, 1.6], pull: [14.2, 1.0], bowPop: [15.2, 1.0], girlBurst: [16.4, 1.2], flareCross: [16.4, 3.0],
  kimi: [19.4, 2.2], ghostsOut: [19.4, 3.0], retract: [22.4, 1.2], titleCard: [22.4, 2.6], dissolve: [25.0, 2.8], wipe: [27.8, 0.8],
};
export function timeline(ctx) {
  const beats = ctx.scene.beats ?? [];
  const sc = (ctx.scene.duration || 28.6) / 28.6;
  const T = { sc };
  for (const k of Object.keys(DEFAULT_T)) {
    const b = beats.find((x) => x.name === k);
    T[k] = b ? b.t : DEFAULT_T[k][0] * sc;
    T[k + "D"] = b && b.dur ? b.dur : DEFAULT_T[k][1] * sc;
  }
  // k in 0..1 across a named beat window
  T.k = (t, name) => clamp01((t - T[name]) / Math.max(1e-3, T[name + "D"]));
  // a trapezoid envelope: in over `a` s from the start, out over `b` s ending at start + dur
  T.env = (t, name, a = 0.3, b = 0.5) => sstep(T[name], T[name] + a, t) * (1 - sstep(T[name] + T[name + "D"] - b, T[name] + T[name + "D"], t));
  return T;
}

// ---- layout in world metres, relative to the seal unless scene.layout.fx overrides ------------------------------
// seal faces +z in its own frame; yaw turns it. fwd = (sin yaw, 0, cos yaw), right = (cos yaw, 0, -sin yaw).
export function layoutOf(ctx) {
  const S = ctx.scene.seal ?? {}, at = S.at ?? [0, 0, 0], sc = S.scale ?? 1, yaw = S.yaw ?? 0;
  const o = ctx.scene.layout?.fx ?? {};
  const fwd = [Math.sin(yaw), 0, Math.cos(yaw)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const at3 = (f, r, y) => [at[0] + fwd[0] * f + rt[0] * r, at[1] + y, at[2] + fwd[2] * f + rt[2] * r];
  const lakeY = o.lakeY ?? at[1];
  return {
    fwd, rt, at, sc, lakeY, at3,
    hand: o.hand ?? at3(28 * sc, 0.2 * sc, 0.45 * sc),       // the girl's flipper, 28 m across the water
    flip: o.flipper ?? at3(0.35 * sc, 0.2 * sc, 0.5 * sc),   // the seal's own flipper (cord end)
    loops: o.loops ?? at3(14 * sc, 0, 1.7 * sc),             // where loops A and B link
    impact: o.impact ?? at3(85 * sc, -24 * sc, 0),           // the far shore where the ember lands
    cometFrom: o.cometFrom ?? at3(800 * sc, -260 * sc, 420 * sc), // the comet's entry high in the sky
    sunDir: o.sun ?? null,
  };
}

// ---- the per-frame shared uniforms ------------------------------------------------------------------------------
export function makeShared(THREE, ctx, L) {
  const res = new THREE.Vector2(1280, 720);
  const sh = {
    res, uRes: { value: res }, uHs: { value: 1 }, uAsp: { value: 16 / 9 }, uSealW: { value: new THREE.Vector3() },
    uSealS: { value: ctx.seal.scale ?? 1 }, uSun: { value: new THREE.Vector3(0, 0.05, 1).normalize() }, uStep: { value: 0 },
    sync(t) {
      try { ctx.engine.renderer.getDrawingBufferSize(res); } catch { /* keep the last size */ }
      this.uHs.value = res.y / 720; this.uAsp.value = res.x / Math.max(1, res.y);
      ctx.seal.chest(this.uSealW.value); this.uSealS.value = ctx.seal.scale ?? 1;
      this.uStep.value = Math.floor(t * 8); // threes: the sparkle and dust twinkle step
    },
  };
  // the sun: low over the far shore, a little right of the lake axis, sinking from +4.2 deg to -3 deg by the end.
  sh.setSun = (t, dur) => {
    const el = THREE.MathUtils.degToRad(lerp(4.2, -3.0, Math.pow(clamp01(t / Math.max(1, dur)), 1.15)));
    const az = 0.28, c = Math.cos(el), f = L.fwd, r = L.rt;
    if (L.sunDir) sh.uSun.value.set(...L.sunDir).normalize();
    else sh.uSun.value.set(f[0] * Math.cos(az) * c + r[0] * Math.sin(az) * c, Math.sin(el), f[2] * Math.cos(az) * c + r[2] * Math.sin(az) * c);
  };
  return sh;
}

export function mat(THREE, { vs, fs, u, add = false, depthTest = true, side }) {
  return new THREE.ShaderMaterial({
    vertexShader: vs, fragmentShader: fs, uniforms: u, transparent: true, depthWrite: false, depthTest,
    blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, side: side ?? THREE.DoubleSide,
  });
}

// ---- billboards ---------------------------------------------------------------------------------------------------
const BB_VS = /* glsl */ `
uniform vec3 uCenter; uniform vec2 uSize; uniform float uPush; uniform float uFull; uniform float uRot;
uniform vec3 uSealW; uniform float uSealS; uniform vec3 uSun;
varying vec2 vUv; varying vec2 vSun; varying float vSunOk; varying float vAsp; varying float vFade;
void main() {
  vUv = position.xy;
  vAsp = projectionMatrix[1][1] / projectionMatrix[0][0];
  vec4 sp = projectionMatrix * (viewMatrix * vec4(uSun, 0.0));
  vSunOk = sp.w > 0.001 ? 1.0 : 0.0; vSun = sp.xy / max(sp.w, 0.001);
  vec4 ms = viewMatrix * vec4(uSealW, 1.0);
  vec4 mv; vFade = 1.0;
  if (uFull > .5) {
    float z = min(ms.z, -.6) - uPush;
    float hH = -z / projectionMatrix[1][1], hW = hH * vAsp;
    mv = vec4(position.x * hW * 1.06, position.y * hH * 1.06, z, 1.0);
  } else {
    vec4 mc = viewMatrix * vec4(uCenter, 1.0);
    float z = mc.z - uPush, k = z / min(mc.z, -.01);
    float cr = cos(uRot), sr = sin(uRot);
    vec2 q = vec2(position.x * uSize.x, position.y * uSize.y); q = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
    mv = vec4(mc.xy * k + q * k, z, 1.0);
    vec4 cn = projectionMatrix * mc, sn = projectionMatrix * ms;
    vec2 d = (cn.xy / cn.w - sn.xy / sn.w) * vec2(vAsp, 1.);
    float rr = (0.55 * uSealS) / max(-ms.z, .1) * projectionMatrix[1][1];
    float inFront = step(ms.z - .3 * uSealS, mc.z);
    vFade = 1. - inFront * (1. - smoothstep(rr * .8, rr * 1.3 + .0001, length(d)));
  }
  gl_Position = projectionMatrix * mv;
}`;
const BB_VARY = "uniform float uK; uniform float uT; uniform float uStep; varying vec2 vUv; varying vec2 vSun; varying float vSunOk; varying float vAsp; varying float vFade;\n";

export function billboard(THREE, sh, fs, extra = {}, o = {}) {
  const u = {
    uCenter: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector2(1, 1) }, uPush: { value: o.push ?? 0 },
    uFull: { value: o.full ? 1 : 0 }, uRot: { value: 0 }, uSealW: sh.uSealW, uSealS: sh.uSealS, uSun: sh.uSun,
    uRes: sh.uRes, uHs: sh.uHs, uAsp: sh.uAsp, uStep: sh.uStep, uK: { value: 0 }, uT: { value: 0 }, ...extra,
  };
  const m = mat(THREE, { vs: BB_VS, fs: NZ + BB_VARY + fs, u, add: o.add ?? true, depthTest: o.depthTest ?? true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 3; mesh.visible = false;
  mesh.userData.u = u;
  return mesh;
}

// ---- ribbon along a quadratic path (comet tails) -----------------------------------------------------------------
const RB_VS = /* glsl */ `
attribute vec2 aUV; uniform vec3 uHead; uniform vec3 uTail; uniform vec3 uBend; uniform float uLen; uniform float uW0; uniform float uW1;
varying vec2 vUV;
vec3 P(float u){ return uHead + uTail * uLen * u + uBend * u * u; }
void main() {
  float u = aUV.x;
  vec4 a = viewMatrix * vec4(P(u), 1.0);
  vec4 b = viewMatrix * vec4(P(min(u + .02, 1.)), 1.0);
  vec4 c = viewMatrix * vec4(P(max(u - .02, 0.)), 1.0);
  vec3 tg = normalize(b.xyz - c.xyz + 1e-5);
  vec3 perp = normalize(cross(tg, a.xyz) + 1e-6);
  float w = mix(uW0, uW1, pow(u, .8));
  a.xyz += perp * aUV.y * w;
  vUV = aUV;
  gl_Position = projectionMatrix * a;
}`;
export function ribbon(THREE, fs, extra = {}, o = {}) {
  const n = o.n ?? 72, pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) { pos.push(0, 0, 0, 0, 0, 0); uv.push(i / n, -1, i / n, 1); if (i < n) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aUV", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const u = {
    uHead: { value: new THREE.Vector3() }, uTail: { value: new THREE.Vector3(0, 0, 1) }, uBend: { value: new THREE.Vector3() },
    uLen: { value: 500 }, uW0: { value: 30 }, uW1: { value: 8 }, uK: { value: 1 }, uSeed: { value: 1 }, uStep: { value: 0 }, uT: { value: 0 }, ...extra,
  };
  const m = mat(THREE, { vs: RB_VS, fs: NZ + "varying vec2 vUV;\n" + fs, u, add: o.add ?? true });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false; mesh.renderOrder = o.order ?? 2; mesh.visible = false; mesh.userData.u = u;
  return mesh;
}

// ---- instanced point pools: fireflies (petals), bursts (4-point sparkles), water glints ---------------------------
// mode 0 fireflies: p = origin + (r - .5) area + drift(t); alpha = (.5 + .5 sin(w t + phase))^3; 4-40 px irregular petals.
// mode 1 burst:     p = origin + d v age (1 - .3 age/L) + (0, -1.1 age^2, 0), alpha (1 - age/L)^2.
// mode 2 glints:    on the lake plane; on(step) = h(seed + floor(8 t + phase*8)) > .78, so a glint holds for a three.
const PT_VS = /* glsl */ `
attribute vec4 aR; uniform float uMode; uniform float uTime; uniform vec3 uOrigin; uniform vec3 uArea; uniform float uLife; uniform float uSpeed;
uniform float uSizeK; uniform float uHs; uniform float uAsp; uniform vec3 uSealW; uniform float uSealS; uniform float uOn;
varying float vA; varying vec4 vR;
void main() {
  vec3 p; float a = 1., sz = 1.; float t = uTime;
  if (uMode < .5) {
    p = uOrigin + (aR.xyz - .5) * uArea + vec3(sin(t * .31 + aR.w * 6.283) * 1.4, sin(t * .47 + aR.x * 9.) * .5, cos(t * .27 + aR.y * 6.283) * 1.4);
    float tw = .5 + .5 * sin(t * (.7 + aR.z * 1.3) + aR.w * 40.);
    a = tw * tw * tw; sz = mix(4., 40., pow(aR.z, 2.5));
  } else if (uMode < 1.5) {
    float age = t - aR.w * .12; float k = age / uLife;
    float th = aR.x * 6.2832, ph = acos(aR.y * 2. - 1.);
    vec3 d = vec3(sin(ph) * cos(th), sin(ph) * sin(th) * .8 + .25, cos(ph));
    float sp = uSpeed * (.35 + aR.z * .9);
    float ag = max(age, 0.);
    p = uOrigin + d * sp * ag * (1. - .3 * clamp(k, 0., 1.)) + vec3(0., -1.1 * ag * ag, 0.);
    a = (age > 0. && k < 1.) ? (1. - k) * (1. - k) : 0.;
    sz = mix(9., 28., aR.z) * (1. - .45 * clamp(k, 0., 1.));
  } else {
    p = uOrigin + vec3((aR.x - .5) * uArea.x, 0., (aR.y - .5) * uArea.z);
    float st = floor(t * 8. + aR.w * 8.);
    float on = step(.78, h21(vec2(aR.z * 91.3 + st * 7.7, aR.w * 13.1 + aR.x)));
    a = on * (.6 + .4 * aR.z); sz = mix(10., 26., aR.w);
  }
  a *= uOn;
  vec4 mp = viewMatrix * vec4(p, 1.0), ms = viewMatrix * vec4(uSealW, 1.0);
  vec4 pn = projectionMatrix * mp, sn = projectionMatrix * ms;
  vec2 d2 = (pn.xy / pn.w - sn.xy / sn.w) * vec2(uAsp, 1.);
  float rr = (0.55 * uSealS) / max(-ms.z, .1) * projectionMatrix[1][1];
  float inFront = step(ms.z - .3 * uSealS, mp.z);
  a *= 1. - inFront * (1. - smoothstep(rr * .8, rr * 1.3 + .0001, length(d2)));
  vA = a; vR = aR;
  gl_PointSize = a > .002 ? sz * uHs * uSizeK : 0.;
  gl_Position = pn;
}`;
const PT_FS = /* glsl */ `
uniform float uMode; uniform vec3 uCol; uniform vec3 uCol2; uniform float uHdr; uniform float uA;
varying float vA; varying vec4 vR;
void main() {
  if (vA < .002) discard;
  vec2 q = gl_PointCoord * 2. - 1.; q.y = -q.y;
  float shape; vec3 col;
  if (uMode < .5) {
    // petal: an elongated, irregular blob rotated per particle (the specks of the frightened-girl frame)
    float rot = vR.w * 6.2832, cr = cos(rot), sr = sin(rot);
    vec2 r2 = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y) * vec2(1., 1.75);
    float ang = atan(r2.y, r2.x);
    float edge = 1. - .22 * sin(ang * 3. + vR.x * 9.) - .12 * sin(ang * 5. + vR.y * 7.);
    float rr = length(r2) / edge;
    shape = 1. - smoothstep(.5, .86, rr);
    col = mix(uCol, uCol2, smoothstep(.2, .0, rr));
  } else {
    shape = glint(q * .5, .5); shape = min(shape, 1.5) * (1. - smoothstep(.7, 1., length(q)));
    col = mix(uCol, uCol2, clamp(shape - .6, 0., 1.));
  }
  gl_FragColor = vec4(col * uHdr, clamp(shape, 0., 1.) * vA * uA);
}`;
export function pool(THREE, sh, rng, o) {
  const n = o.count, aR = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) aR[i] = rng();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aR", new THREE.BufferAttribute(aR, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const u = {
    uMode: { value: o.mode }, uTime: { value: 0 }, uOrigin: { value: new THREE.Vector3(...(o.origin ?? [0, 0, 0])) },
    uArea: { value: new THREE.Vector3(...(o.area ?? [10, 4, 10])) }, uLife: { value: o.life ?? 1.6 }, uSpeed: { value: o.speed ?? 7 },
    uSizeK: { value: o.sizeK ?? 1 }, uHs: sh.uHs, uAsp: sh.uAsp, uSealW: sh.uSealW, uSealS: sh.uSealS, uOn: { value: 1 },
    uCol: { value: new THREE.Color(o.col ?? "#f0ffc0") }, uCol2: { value: new THREE.Color(o.col2 ?? "#ffffff") },
    uHdr: { value: o.hdr ?? 1.1 }, uA: { value: 1 },
  };
  const m = mat(THREE, { vs: NZ + PT_VS, fs: NZ + PT_FS, u, add: true });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false; pts.renderOrder = o.order ?? 6; pts.visible = false; pts.userData.u = u;
  return pts;
}

export function disposeAll(group) {
  group.traverse((o) => { o.geometry?.dispose?.(); const ms = o.material; if (ms) (Array.isArray(ms) ? ms : [ms]).forEach((x) => { x.map?.dispose?.(); x.dispose(); }); });
}
