// p-planimeter FX helpers (own folder only; Consolidate may promote `mat`, `backQuad`, `CLEAR`, `timeline`).
//
// Maths shared by every file here
//   keep-clear   the seal must never be covered. For a fragment at world point F seen from the eye E:
//                  rd = (F - E)/|F - E|,  tS = (S - E).rd (depth of the seal chest S along the ray),
//                  c  = | E + rd tS - S |  (the ray's miss distance from the seal chest).
//                A fragment NEARER than the seal (|F - E| < tS) is faded by smoothstep(R0, R1, c / scale), so
//                nothing translucent ever sits between the lens and the seal; fragments behind it are untouched.
//   back quad    a full-frame quad on the view axis at depth dS + gap (behind the seal chest). Half-height there is
//                hH = d tan(fov/2), half-width hW = hH aspect, so it fills the frame yet the seal (nearer) draws over it.
//   stepped time every animation reads the STEPPED clock t the player hands to update(); only camera-facing
//                billboards read cue.t.
import * as THREE from "three";

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const hash = (a, b = 0, c = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s); };

// beat times (s). scene.js beats win; otherwise the bible's frame numbers / 24.
export const DEFAULT = {
  chalk:     { t: 3.5, dur: 0.875 },  // Reviewer writes, shot 2 (21 frames on twos)
  glint:     { t: 6.9, dur: 1.6 },    // f166 eye glint, pop 0.18 s, fade by 1.6 s
  cardframe: { t: 7.1, dur: 0.4 },    // f170 green card frame, 0.4 s
  corpus:    { t: 6.9, dur: 1.125 },  // f166-f193 the S^2 sphere
  chalkS2:   { t: 7.55, dur: 0.5 },   // writes "S^2 | VR" while the sphere blooms
  project:   { t: 7.67, dur: 0.37 },  // f184 sphere projects onto the board
  flash:     { t: 8.04, dur: 0.05 },  // f193 white flash, 1 frame
  board:     { t: 8.04, dur: 0.35 },  // f193-f201 slam in
  pawn:      { t: 8.25, dur: 0.25 },  // f198 pawn takes king
  checkmate: { t: 8.33, dur: 0.42 },  // f200 lettering pop
  bluekey:   { t: 8.37, dur: 0.5 },   // f200 impact then 12 frames of blue key
  boardOut:  { t: 8.475, dur: 0.4 },  // draws away 0.4 s before f213
  ghost50:   { t: 8.9, dur: 3.2 },    // easter egg 1
  bell:      { t: 14.1, dur: 0.6 },   // f338 the bell: a soft pulse of the window glow
  wipe:      { t: 22.1, dur: 0.4 },   // f562-f571 sky shell collapse wash
};
export function timeline(ctx) {
  const beats = ctx.scene.beats ?? [], T = {};
  for (const k of Object.keys(DEFAULT)) {
    const b = beats.find((x) => x.name === k);
    T[k] = { t: b ? b.t : DEFAULT[k].t, dur: b?.dur ?? DEFAULT[k].dur };
  }
  return T;
}
// 0..1 progress of a timeline entry at clock t (0 before, 1 after)
export const prog = (e, t) => clamp01((t - e.t) / Math.max(1e-6, e.dur));
// how visible the chess board is at t: slam in then draw away
export function boardK(T, t) {
  return sstep(0, 1, prog(T.board, t)) * (1 - sstep(0, 1, prog(T.boardOut, t)));
}

// layout in the seal's own frame (x right, y up, z forward; scene.layout.fx may override)
export function layoutOf(ctx) {
  const o = ctx.scene.layout?.fx ?? {};
  return {
    board: o.board ?? [0, 1.55, -3.4],        // the chalkboard on the north wall
    chess: o.chess ?? [0, 1.5, -3.0],         // the chess overlay hangs in front of it, still BEHIND the seal
    sphere: o.sphere ?? [0, 2.75, 0.3],       // the S^2 corpus floats above the paper, over the seal's head
    windowX: o.windowX ?? -5.6,               // west windows
    windows: o.windows ?? [-3.6, -0.4, 2.8],  // z of the 3 windows
  };
}

// a root group that rides the seal frame: local = seal-space
export function sealFrame(ctx) {
  const g = new THREE.Group();
  const sync = () => {
    const s = ctx.seal;
    g.position.set(s.at[0], s.at[1], s.at[2]);
    g.rotation.set(0, s.yaw, 0);
    g.scale.setScalar(s.scale);
  };
  sync();
  return { group: g, sync };
}

export const NOISE = /* glsl */ `
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
`;

// keep-clear chunk (maths at the top). uClear = (R0, R1) in seal heights.
export const CLEAR = /* glsl */ `
uniform vec3 uSeal; uniform vec2 uClear; uniform float uScale;
float keepClear(vec3 F){
  vec3 d = F - cameraPosition; float lf = length(d); vec3 rd = d / max(lf, 1e-4);
  float tS = dot(uSeal - cameraPosition, rd);
  float c = length(cameraPosition + rd * tS - uSeal) / max(uScale, 1e-3);
  float near = step(lf, tS);
  return mix(1., smoothstep(uClear.x, uClear.y, c), near);
}
`;
// one shared uniform bundle: every material points at the same objects, updated once per frame
export function makeShared() {
  const U = {
    uSeal: { value: new THREE.Vector3() }, uClear: { value: new THREE.Vector2(0.55, 1.5) }, uScale: { value: 1 },
    uT: { value: 0 }, uPx: { value: 700 },
  };
  const v = new THREE.Vector3();
  U.update = (ctx, t) => {
    ctx.seal.chest(v); U.uSeal.value.copy(v); U.uScale.value = ctx.seal.scale; U.uT.value = t;
    const cam = ctx.player?.camera; const h = ctx.engine?.renderer?.domElement?.height ?? 720;
    if (cam) U.uPx.value = h / (2 * Math.tan((cam.fov * Math.PI) / 360));
  };
  return U;
}

const VERT = (o) => /* glsl */ `
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
${o.tone ? "attribute float aTone; varying float vTone;" : ""}
${o.points ? "uniform float uPx; uniform float uSize; attribute float aSize; varying float vSz;" : ""}
void main(){
  vec4 p = vec4(position, 1.); vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = modelMatrix * p; vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); vUv = uv;
  ${o.tone ? "vTone = aTone;" : ""}
  vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv;
  ${o.points ? "gl_PointSize = max(1.6, uSize * aSize * uPx / max(0.05, -mv.z)); vSz = aSize;" : ""}
}`;

// the one material factory: the frag body sees vW vN vUv uT keepClear() h21() vn(); returns a ShaderMaterial
export function mat(U, frag, extra = {}, o = {}) {
  const uniforms = { uSeal: U.uSeal, uClear: U.uClear, uScale: U.uScale, uT: U.uT, uPx: U.uPx, ...extra };
  const m = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT(o),
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      ${o.tone ? "varying float vTone;" : ""}
      ${o.points ? "varying float vSz;" : ""}
      uniform float uT;
      ${CLEAR}
      ${NOISE}
      ${frag}`,
    transparent: true, depthWrite: false, side: o.side ?? THREE.DoubleSide,
    blending: o.blend ?? THREE.NormalBlending,
  });
  m.toneMapped = false;
  return m;
}

// full-frame quad behind the seal (flash, grade, veil, wash). uMode 0 flat, 1 vignette; uCol, uA
export function backQuad(U, { blend = THREE.NormalBlending, gap = 1.2, order = -10 } = {}) {
  const extra = { uCol: { value: new THREE.Color("#ffffff") }, uA: { value: 0 }, uMode: { value: 0 }, uPow: { value: 2.0 } };
  const m = mat(U, /* glsl */ `
    uniform vec3 uCol; uniform float uA; uniform int uMode; uniform float uPow;
    void main(){
      vec2 q = vUv * 2. - 1.;
      float a = uA;
      // vignette: alpha rises with r^pow toward the frame edge (the veil of the chess beat)
      if (uMode == 1) a *= clamp(pow(length(q) * .78, uPow), 0., 1.);
      gl_FragColor = vec4(uCol, a);
    }`, extra, { blend, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
  const fwd = new THREE.Vector3(), ctr = new THREE.Vector3();
  mesh.userData.place = (cam, aspect) => {
    cam.getWorldDirection(fwd);
    ctr.copy(U.uSeal.value).sub(cam.position);
    const d = Math.max(0.5, ctr.dot(fwd)) + gap * (U.uScale.value || 1);
    const hH = d * Math.tan((cam.fov * Math.PI) / 360) * 1.06, hW = hH * aspect;
    mesh.position.copy(cam.position).addScaledVector(fwd, d);
    mesh.quaternion.copy(cam.quaternion);
    mesh.scale.set(hW * 2, hH * 2, 1);
  };
  return mesh;
}

export function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}

// every module returns { group, update(t, dt, cue), dispose() }; collect disposables here
export function disposer() {
  const list = [];
  const add = (x) => { list.push(x); return x; };
  const run = () => { for (const x of list) x.dispose?.(); list.length = 0; };
  return { add, run };
}
