// FX layer for pr-highway-3244: THE GORDIUS WHEEL (Fate/Zero, Iskandar). Layer 1. Written from scripts/pr-highway-3244.md (sections 3 E2/E16-E25, 5, 6, 7).
// Every effect is a pure function of the clock (stepped time `t` from update, display time `cue.t` only for the page wipe), so a scrubbed frame equals a played one.
// Seal law: the seal is never touched here. All glow is additive and depth-tested; the cry flash and the king aura are pushed BEHIND the seal (clip-depth / view-space push),
// particles never spawn inside 1.6 m of the seal axis, and this layer never writes emissive on the seal (it stays out of bloom).
//
// CUE NAMES (all optional; each falls back to the bible's timecode in scene seconds = frame / 24):
//   cry      7.2-8.1   sky strikes on both bulls, sword fork, flash 0.5, king aura, 4-frame aberration, trauma, shock + inverted impact frame
//   launch   8.25      launch rings, smoke, cannon 1, speed lines, treadmill starts (scroll speed V)
//   charge   8.25-13.7 hoof and hub crackle at full, 3D streaks
//   trail    10.5-13.7 the light trail (race 3.95 to 5.95)
//   kachow   11.1-11.6 4-point star glint + cross flare, flash 0.22
//   slice    6.0-14.7  the mint slice window and the clean line
//   hit      per rival (args n, optional at:[x,y,z] seal-local, world:true for world coords): 5 forks, 11 frames, 1 inverted impact frame
//   cannon2  15.3      second confetti cannon (the stop)
//   motes    gold motes: wide [0,1.2] always, close [15.3,25.0] unless the beat says otherwise
//   wipe     25.0-25.4 the chequered page wipe home
// Reserved beats (impact, speedlines, shock, trauma) are honoured if scene.js has them; this layer registers its own through ctx.sakuga only when scene.js has none of that name.
import * as THREE from "three";
import { StripPool, sprite, points, hash, mulberry, sstep, clamp01, lerp, rgb } from "./lib.js";
import { buildDust } from "./dust.js";

// ------------------------------------------------------------------ palette (bible sections 2 and 6)
const C = {
  white: rgb("#ffffff"), bolt: rgb("#38a0ff"), glow: rgb("#2a60ff"), hoof: rgb("#8fd8ff"), mint: rgb("#5dffc2"),
  streak: rgb("#ffe099"), trailEdge: rgb("#8fd8ff"),
};
const CONF = ["#ffc820", "#e23a2e", "#2f8cff", "#ff8ab0"].map(rgb); // #fbf5ea dropped: it milks the bloom

// ------------------------------------------------------------------ timeline defaults, scene seconds
const T = { cry: 7.2, launch: 8.25, cross: 13.7, kachow: 11.1, stop: 15.3, wipe: 25.0 };
const DEF_HITS = [9.4, 9.8, 10.2, 10.6, 11.1, 11.5, 11.9, 12.3, 12.7, 13.0, 13.3, 13.6]; // 12 rivals, Gilgamesh first (E15); #5 lands on the Ka-chow

// ------------------------------------------------------------------ shaders (the maths in comments)
// SMOKE puff (E19): a hard-edged disc with a lumpy outline R(a) = .78 + .10 sin(3a+s) + .06 sin(5a+2s), a swirl notch
// (discard where sin(2a - 5r + 1.7s) > .9 and r > .42), a three-tone fill: lit #ffd8a8, underside #c08060 where d = p . (-.5,.8)/|.| < -.15, rim #fff0d0 where d > .25 near the edge,
// and an ink silhouette #241a2a in the outer .09 of the radius. Cutoff, never a soft falloff.
const SMOKE_FRAG = /* glsl */ `
void main(){
  vec2 p = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
  float r = length(p), a = atan(p.y, p.x);
  float R = 0.78 + 0.10 * sin(3.0 * a + vSeed) + 0.06 * sin(5.0 * a + 2.0 * vSeed);
  if (r > R) discard;
  if (r > 0.42 && sin(2.0 * a - 5.0 * r + vSeed * 1.7) > 0.9) discard;
  vec3 INK = vec3(0.141, 0.102, 0.165), LIT = vec3(1.0, 0.847, 0.659), SH = vec3(0.753, 0.502, 0.376), RIM = vec3(1.0, 0.941, 0.816);
  vec3 c = LIT;
  float d = dot(p, normalize(vec2(-0.5, 0.8)));
  if (d < -0.15 + 0.1 * sin(a * 2.0 + vSeed)) c = SH;
  if (r > R - 0.16 && d > 0.25) c = RIM;
  if (r > R - 0.09) c = INK;
  gl_FragColor = vec4(c, 1.0);
}`;
// CONFETTI: a flat tumbling rectangle. q = R(-ang) p; half height .12 + .5 |cos flip| (the card turning edge-on); the back face is the same hue x .7.
const CONF_FRAG = /* glsl */ `
void main(){
  vec2 p = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
  float ang = vSeed * 6.283 + vAux, cs = cos(ang), sn = sin(ang);
  vec2 q = vec2(cs * p.x + sn * p.y, -sn * p.x + cs * p.y);
  float flip = cos(vAux * 1.7 + vSeed * 9.0);
  if (abs(q.x) > 0.9 || abs(q.y) > 0.12 + 0.5 * abs(flip)) discard;
  gl_FragColor = vec4(vCol * (flip < 0.0 ? 0.7 : 1.0), 1.0);
}`;
// GOLD MOTE: a hard diamond |x|+|y| < 1, a cream centre where |p| < .35.
const MOTE_FRAG = /* glsl */ `
void main(){
  vec2 p = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
  if (abs(p.x) + abs(p.y) > 1.0) discard;
  gl_FragColor = vec4(length(p) < 0.35 ? vec3(1.0, 0.945, 0.816) : vCol, 1.0);
}`;
// KA-CHOW STAR (E23): the 4-point astroid sqrt|x| + sqrt|y| < 1, gold #ffc926 points, cream #fff1d0 core where the sum < .55.
const STAR_FRAG = /* glsl */ `
vec4 spr(vec2 p){
  float st = sqrt(abs(p.x)) + sqrt(abs(p.y));
  if (st > 1.0) return vec4(0.0);
  return vec4(st < 0.55 ? vec3(1.0, 0.945, 0.816) : vec3(1.0, 0.788, 0.149), 1.0);
}`;
// CROSS FLARE: thin bars |y| < .03 (1 - |x|) and |x| < .03 (1 - |y|): tapered, cream.
const CROSS_FRAG = /* glsl */ `
vec4 spr(vec2 p){
  float h = abs(p.y) < 0.03 * (1.0 - abs(p.x)) ? 1.0 : 0.0;
  float v = abs(p.x) < 0.03 * (1.0 - abs(p.y)) ? 1.0 : 0.0;
  return vec4(vec3(1.0, 0.945, 0.816), max(h, v) * 0.85);
}`;
// SUN FLARE (E2): the quad is 4:1. With isotropic d = |(x, 4y)|: core d < .06 #fffbe8, halo d < .22 at 40% #ffd890, and ONE horizontal streak |y| < .012 (1 - |x|) #ffe0a0.
// uA <= .5 so it never whites the pup.
const SUN_FRAG = /* glsl */ `
vec4 spr(vec2 p){
  float d = length(vec2(p.x, p.y * 4.0));
  if (d < 0.06) return vec4(1.0, 0.984, 0.91, 1.0);
  if (abs(p.y) < 0.012 * (1.0 - abs(p.x))) return vec4(1.0, 0.878, 0.627, 0.8);
  if (d < 0.22) return vec4(1.0, 0.847, 0.565, 0.4);
  return vec4(0.0);
}`;
// KING AURA ("to add"): flame tongues round a ring r0 = .52. a = atan(y, x); tongue phase tg = .5 + .5 sin(9a + 3 sin(3a + 5T) + 14T) (T is stepped time: redrawn on twos);
// height h = .10 + .30 tg^3 up, up = .55 + .45 max(0, y/r) (tongues lean skyward); drawn where r0 < r < r0 + h: #ffc926 outer, #fff1d0 inner 45%. The centre stays empty so the king is not tinted.
const AURA_FRAG = /* glsl */ `
vec4 spr(vec2 p){
  float r = length(p), a = atan(p.y, p.x);
  float up = 0.55 + 0.45 * max(0.0, p.y / max(r, 1e-3));
  float tg = 0.5 + 0.5 * sin(a * 9.0 + 3.0 * sin(a * 3.0 + uT * 5.0) + uT * 14.0);
  float h = 0.10 + 0.30 * tg * tg * tg * up;
  float r0 = 0.52;
  if (r < r0 || r > r0 + h) return vec4(0.0);
  return vec4(r < r0 + h * 0.45 ? vec3(1.0, 0.945, 0.816) : vec3(1.0, 0.788, 0.149), 1.0);
}`;
// GATE OF BABYLON (egg 7): hard gold rings at r in [.92,1], [.62,.66], [.30,.33], radial ticks between .66 and .92 where fract(12 a / 2pi + .1 T) < .18, a spiral glyph sin(3a + 14r - 2T) > .8 inside .6.
const GATE_FRAG = /* glsl */ `
vec4 spr(vec2 p){
  float r = length(p), a = atan(p.y, p.x);
  vec3 G = vec3(1.0, 0.690, 0.165), H = vec3(1.0, 0.898, 0.541);
  if (r > 1.0) return vec4(0.0);
  if (r > 0.92) return vec4(H, 1.0);
  if (r > 0.66 && fract(12.0 * a / 6.283 + uT * 0.1) < 0.18) return vec4(G, 1.0);
  if ((r > 0.62 && r < 0.66) || (r > 0.30 && r < 0.33)) return vec4(H, 1.0);
  if (r < 0.6 && sin(3.0 * a + 14.0 * r - 2.0 * uT) > 0.8) return vec4(G, 0.9);
  return vec4(0.0);
}`;
// THROWN BLADE: |x| 3.2 + |y| < 1 steel #eef6ff, edge band #4a5f8a at > .9, gold hilt in the low 12%.
const BLADE_FRAG = /* glsl */ `
vec4 spr(vec2 p){
  float k = abs(p.x) * 3.2 + abs(p.y);
  if (k > 1.0) return vec4(0.0);
  if (p.y < -0.78) return vec4(1.0, 0.812, 0.227, 1.0);
  return vec4(k > 0.9 ? vec3(0.290, 0.373, 0.541) : vec3(0.933, 0.965, 1.0), 1.0);
}`;
// FLASH QUAD (cry .5 / Ka-chow .22): fullscreen in clip space, but its depth is the seal chest's depth pushed .9 m AWAY, so the depth test keeps the seal (and anything nearer) clean.
// gl_Position = (xy * w_c, z_c, w_c) with c = P (V chest + (0,0,-.9)). Additive #fff1d0 x uA.
const FLASH_VERT = /* glsl */ `
uniform vec3 uChest; uniform float uBack; varying vec2 vP;
void main(){ vP = position.xy * 2.0;
  vec4 c = projectionMatrix * (viewMatrix * vec4(uChest, 1.0) + vec4(0.0, 0.0, -uBack, 0.0));
  gl_Position = vec4(position.xy * 2.0 * c.w, c.z, c.w); }`;
// LAUNCH RING (shockwave): a flat ring on the ground, uK = age 0..1: thickness .14 (1-k) + .02 about radius .9 of the quad, alpha 1 - .5k. The quad itself grows as r(k) = 1 - (1-k)^2.
const RING_FRAG = /* glsl */ `
varying vec2 vUv; uniform float uK; uniform float uA;
void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p);
  float R = 0.9; float th = 0.14 * (1.0 - uK) + 0.02;
  if (abs(r - R) > th) discard;
  gl_FragColor = vec4(vec3(1.0, 0.945, 0.816), uA * (1.0 - 0.5 * uK)); }`;
// SLICE FILL: the mint window floor. alpha .09 flat plus .05 chevron stripes step(.5, fract(14 v - shift)) running forward. Hard edged, additive.
const SLICE_FRAG = /* glsl */ `
varying vec2 vUv; uniform float uA; uniform float uShift;
void main(){ float s = step(0.5, fract(vUv.y * 14.0 - uShift)); gl_FragColor = vec4(vec3(0.365, 1.0, 0.761), uA * (0.09 + 0.05 * s)); }`;
// CHEQUERED PAGE (E25, exit wipe f600-f610): screen-space cloth with a rolled edge. Edge e(k, y) = mix(-asp - 1.5R, asp + 2R, k) + .22 y, roll radius R = .17.
// dx = x - e: dx > R not covered; dx < -R flat cloth, cells .2 alternating #fbf5ea / #1a1420; |dx| <= R a cylinder, th = asin(dx/R), shade .55 + .45 cos(th + .7),
// unrolled coordinate u = e - R (pi/2 - th), the back (dx > 0) swapped; ink #241a2a on the very edge.
const PAGE_FRAG = /* glsl */ `
varying vec2 vP; uniform float uK; uniform float uAsp;
void main(){
  vec2 p = vP; float x = p.x * uAsp; float R = 0.17;
  float e = mix(-uAsp - R * 1.5, uAsp + R * 2.0, uK) + 0.22 * p.y;
  float dx = x - e;
  if (dx > R) discard;
  vec3 cream = vec3(0.984, 0.961, 0.918), dark = vec3(0.102, 0.078, 0.125);
  float cell = 0.2; vec3 col;
  if (dx < -R) { vec2 g = floor(vec2(x, p.y) / cell); col = mod(g.x + g.y, 2.0) < 0.5 ? cream : dark; }
  else {
    float th = asin(clamp(dx / R, -1.0, 1.0));
    float u = e - R * (1.5708 - th);
    vec2 g = floor(vec2(u, p.y) / cell); float c = mod(g.x + g.y, 2.0);
    if (dx > 0.0) c = 1.0 - c;
    col = (c < 0.5 ? cream : dark) * (0.55 + 0.45 * cos(th + 0.7));
    if (abs(dx) > R * 0.93) col = vec3(0.141, 0.102, 0.165);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const GROUND_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

export default function build(ctx) {
  const { engine, scene, seal: S } = ctx;
  const group = new THREE.Group();
  const beats = scene.beats || [];
  const B = (n) => beats.find((b) => b.name === n);
  const win = (n, a, b) => { const e = B(n); return e ? [e.t, e.t + (e.dur ?? (b - a))] : [a, b]; };
  const has = (n) => beats.some((b) => b.name === n);

  // ---- windows
  const [cry0] = win("cry", T.cry, T.cry + 0.9);
  const LAUNCH = win("launch", T.launch, T.launch + 1.4)[0];
  const [chg0, chg1] = win("charge", LAUNCH, T.cross);
  const [trl0, trl1] = win("trail", 10.5, T.cross);
  const [kc0] = win("kachow", T.kachow, T.kachow + 0.5);
  const [sl0, sl1] = win("slice", 6.0, 14.7);
  const [cn2] = win("cannon2", T.stop, T.stop + 3.2);
  const [wp0, wp1] = win("wipe", T.wipe, T.wipe + 0.4);
  const mW = B("motes");
  const MOTE_WIDE = [0, 1.2], MOTE_NEAR = mW ? [mW.t, mW.t + (mW.dur ?? 9.7)] : [T.stop, T.wipe];
  const CROSS = chg1;

  // ---- seal-local layout (x right, y up, z forward), overridable by scene.fx.layout
  const LAY = Object.assign({
    bulls: [[-1.1, 0, 4.2], [1.1, 0, 4.2]], hubs: [[-1.35, 0.55, -0.4], [1.35, 0.55, -0.4], [-1.35, 0.55, -1.7], [1.35, 0.55, -1.7]],
    sword: [0.5, 3.1, 0.9], king: [0, 1.3, 1.4], nose: [0, 0.9, 2.6], rear: [0, 0.7, -1.4], gateFrom: [-1.6, 2.4, -1.0],
    cannon1: [-4, 0, -6], cannon2: [5, 0, -3], slice: { x: 1.7, z0: 1.5, z1: 14.3 }, sunDir: [-0.78, 0.09, -0.62],
  }, scene.fx?.layout || {});
  const W = (x, y, z) => { const s = Math.sin(S.yaw), c = Math.cos(S.yaw); return [S.at[0] + x * c + z * s, S.at[1] + y, S.at[2] - x * s + z * c]; };
  const Wv = (a) => W(a[0], a[1], a[2]);

  // ---- rival hits (E15 / E17): scene beats `hit` or the 12 defaults
  const hb = beats.filter((b) => b.name === "hit").sort((a, b) => a.t - b.t);
  const HITS = (hb.length ? hb.map((b, i) => ({ t: b.t, at: b.at, world: !!b.world, n: b.n ?? i })) : DEF_HITS.map((t, i) => ({ t, at: null, world: false, n: i })))
    .map((h, i) => ({ ...h, at: h.at ?? [(i % 2 ? 1 : -1) * (2.4 + (i % 3) * 0.9), 0.7, 4 + ((i * 1.7) % 6)] }));

  // ---- treadmill (the world slides under the lens): scroll speed V(t), cumulative distance Sc(t) tabulated at 60 Hz
  const VMAX = 13;
  const V = (t) => VMAX * sstep(LAUNCH, LAUNCH + 0.9, t) * (1 - sstep(CROSS, CROSS + 1.4, t));
  const SC = new Float32Array(40 * 60 + 2); for (let i = 1; i < SC.length; i++) SC[i] = SC[i - 1] + V(i / 60) / 60;
  const Sc = (t) => { const f = clamp01(t / 40) * (SC.length - 2), i = Math.floor(f); return lerp(SC[i], SC[i + 1], f - i); };

  // ---- register our own sakuga windows only when scene.js has none (a direction beat always wins)
  const sk = ctx.sakuga;
  if (!has("impact")) { sk.impact(cry0, [[2, 2]]); for (const h of HITS) sk.impact(h.t, [[2, 1]]); } // 2 frames inverted on the cry, 1 per rival hit
  if (!has("speedlines")) {
    sk.speedLines({ t: cry0, dur: 0.5, kind: "radial", at: [0.5, 0.5], strength: 0.8, col: "#fff1d0" });
    sk.speedLines({ t: LAUNCH, dur: Math.max(1, CROSS - LAUNCH), kind: "speed", strength: 0.42, col: "#ffe099" }); // heavy parallel, redrawn per step
  }
  if (!has("shock")) { sk.shock({ t: cry0, dur: 0.5, at: [0.5, 0.5], amp: 0.04, r1: 0.9 }); sk.shock({ t: LAUNCH, dur: 0.4, at: [0.5, 0.6], amp: 0.03, r1: 0.7 }); }

  // ---- parts
  const dust = buildDust(ctx); group.add(dust.group);
  const pool = new StripPool(9000, 1.25); group.add(pool.mesh);

  const smoke = points(110, { fragBody: SMOKE_FRAG, order: 24 }); group.add(smoke.pts);
  const conf = points(240, { fragBody: CONF_FRAG, order: 24 }); group.add(conf.pts);
  const mote = points(70, { fragBody: MOTE_FRAG, order: 24 }); group.add(mote.pts);
  const dbs = new THREE.Vector2();
  for (let i = 0; i < 240; i++) { const c = CONF[Math.floor(hash(i, 3) * 4)]; conf.col.setXYZ(i, c[0], c[1], c[2]); conf.seed.setX(i, hash(i, 9)); }
  const gold = rgb("#ffcf5a"); for (let i = 0; i < 70; i++) { mote.col.setXYZ(i, gold[0], gold[1], gold[2]); mote.seed.setX(i, hash(i, 5)); }
  for (let i = 0; i < 110; i++) smoke.seed.setX(i, hash(i, 7) * 6.283);

  const star = sprite(STAR_FRAG), cross = sprite(CROSS_FRAG), sun = sprite(SUN_FRAG);
  const aura = sprite(AURA_FRAG), gate = sprite(GATE_FRAG, { blending: THREE.NormalBlending }), blade = sprite(BLADE_FRAG, { blending: THREE.NormalBlending });
  for (const m of [star, cross, sun, aura, gate, blade]) group.add(m);

  const flashMat = new THREE.ShaderMaterial({
    uniforms: { uChest: { value: new THREE.Vector3() }, uBack: { value: 0.9 }, uA: { value: 0 } }, vertexShader: FLASH_VERT,
    fragmentShader: "varying vec2 vP; uniform float uA; void main(){ gl_FragColor = vec4(vec3(1.0, 0.945, 0.816), uA); }",
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flashMat); flash.frustumCulled = false; flash.renderOrder = 40; group.add(flash);

  const ringMat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 1 }, uA: { value: 0 } }, vertexShader: GROUND_VERT, fragmentShader: RING_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringMat); m.rotation.x = -Math.PI / 2; m.frustumCulled = false; m.scale.set(0.001, 0.001, 0.001); m.renderOrder = 22; group.add(m); return m; });

  const sliceMat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uShift: { value: 0 } }, vertexShader: GROUND_VERT, fragmentShader: SLICE_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const sliceFill = new THREE.Mesh(new THREE.PlaneGeometry(2 * LAY.slice.x, LAY.slice.z1 - LAY.slice.z0), sliceMat); sliceFill.frustumCulled = false; sliceFill.renderOrder = 21; group.add(sliceFill);

  // the page stays visible (its program links with the layer); uK < 0 puts the edge far left so the shader discards every pixel
  const pageMat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: -10 }, uAsp: { value: 16 / 9 } },
    vertexShader: "varying vec2 vP; void main(){ vP = position.xy * 2.0; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }",
    fragmentShader: PAGE_FRAG, transparent: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pageMat); page.frustumCulled = false; page.renderOrder = 999; group.add(page);

  // ------------------------------------------------------------------ bolt maths
  // fork(a, b, n, jit, rnd): n equal segments from a to b, each interior point displaced by a random 3-vector of size jit * sin(pi u) (fat belly, pinned ends): the jagged strike (E17).
  const fork = (a, b, n, jit, rnd) => {
    const pts = [a];
    for (let i = 1; i < n; i++) { const u = i / n, e = Math.sin(Math.PI * u) * jit; pts.push([lerp(a[0], b[0], u) + (rnd() - 0.5) * 2 * e, lerp(a[1], b[1], u) + (rnd() - 0.5) * 2 * e * 0.6, lerp(a[2], b[2], u) + (rnd() - 0.5) * 2 * e]); }
    pts.push(b); return pts;
  };
  // drawBolt: outer glow #2a60ff at 25% (2.8 x width), then the hard 2-tone: core #ffffff (40% of the width), edge #38a0ff. Branches: 3 segments, 0.3 of the length.
  const drawBolt = (a, b, n, jit, w, al, rnd, branches = 0) => {
    const pts = fork(a, b, n, jit, rnd), L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const taper = (u) => w * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(0.98, u + 0.02)));
    pool.strip(pts, { w: (u) => taper(u) * 2.8, a: 0.25 * al, core: C.glow });
    pool.strip(pts, { w: taper, a: al, core: C.white, edge: C.bolt, cw: 0.4 });
    for (let k = 0; k < branches; k++) {
      const idx = 2 + Math.floor(rnd() * Math.max(1, n - 3)), s = pts[idx], len = Math.min(5, 0.3 * L), ang = rnd() * 6.283;
      const e = [s[0] + Math.cos(ang) * len, s[1] - (0.4 + rnd() * 0.6) * len * 0.6, s[2] + Math.sin(ang) * len];
      pool.strip(fork(s, e, 3, len * 0.18, rnd), { w: (u) => w * 0.5 * (1 - 0.6 * u), a: al * 0.9, core: C.white, edge: C.bolt, cw: 0.35 });
    }
  };

  // ------------------------------------------------------------------ update
  const U = engine.composer?.u; const mis0 = U?.uMisreg?.value ?? 0;
  const tmp = new THREE.Vector3();

  function update(t, dt, cue) {
    const ct = cue.t, tf = Math.floor(t * 12 + 1e-6); // 12 Hz re-fork (twos)
    const rbase = tf * 977;
    try { engine.renderer.getDrawingBufferSize(dbs); } catch { dbs.set(1280, 720); }
    const H = dbs.y || 720; smoke.mat.uniforms.uH.value = H; conf.mat.uniforms.uH.value = H; mote.mat.uniforms.uH.value = H;
    S.chest(tmp);

    pool.begin();

    // ---- E17 sky strike: sword fork up 22 m and two strikes onto the bulls, cry-0.1 .. cry+0.9, flicker 12 Hz
    const cAge = t - cry0;
    if (cAge > -0.1 && cAge < 0.9) {
      const env = 1 - sstep(0.45, 0.9, cAge), rnd = mulberry(rbase + 11);
      const flick = (i) => (hash(tf, i + 3) > 0.22 ? 1 : 0.35);
      const tip = Wv(LAY.sword);
      drawBolt(tip, [tip[0] + (rnd() - 0.5) * 3, tip[1] + 22, tip[2] + (rnd() - 0.5) * 3], 9, 1.6, 0.30, env * flick(0), rnd, 3);
      LAY.bulls.forEach((b, i) => {
        const top = Wv([b[0], b[1] + 1.4, b[2]]), from = Wv([b[0] * 2.4, 24, b[2] + 1.5]);
        drawBolt(from, top, 9, 1.6, 0.32, env * flick(i + 1), mulberry(rbase + 31 + i), 3);
      });
    }

    // ---- hoof and hub crackle: 8 hooves and 4 hubs, 3-segment micro forks, re-forked per 2 frames. Level: .3 idle (from the wide), .7 after the cry, 1 in the charge.
    const lvl = (t < 1.2 ? 0 : t < cry0 ? 0.3 : t < chg0 ? 0.7 : t < chg1 + 0.6 ? 1 : 0.25) * (t > CROSS + 1.4 ? 0.1 : 1);
    if (lvl > 0.05 && t < wp0) {
      const r = mulberry(rbase + 71), pts = [];
      for (const b of LAY.bulls) for (let k = 0; k < 4; k++) pts.push([b[0] + (k % 2 ? 0.28 : -0.28), 0.12, b[2] + (k < 2 ? 0.7 : -0.7)]);
      for (const h of LAY.hubs) pts.push(h);
      pts.forEach((p, i) => {
        if (hash(tf, i + 40) > lvl) return;
        const a = Wv(p), ang = r() * 6.283, up = r() * 0.5 + 0.1, l = 0.35 + r() * 0.35;
        pool.strip(fork(a, [a[0] + Math.cos(ang) * l, a[1] + up * l, a[2] + Math.sin(ang) * l], 3, 0.09, r), { w: 0.07, a: 0.9, core: C.white, edge: C.hoof, cw: 0.4 });
      });
    }

    // ---- hit bursts: 5 forks 1 to 3.4 m, 11 frames per rival (0.458 s)
    for (const h of HITS) {
      const age = t - h.t; if (age < -1e-6 || age > 11 / 24) continue;
      const c = h.world ? h.at : Wv(h.at), grow = sstep(0, 0.2, age), al = 1 - 0.6 * (age / (11 / 24)), r = mulberry(rbase + 500 + h.n * 13);
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * 6.283 + r() * 0.9, d = (1 + r() * 2.4) * grow;
        drawBolt(c, [c[0] + Math.cos(ang) * d, c[1] + (r() - 0.2) * d * 0.7, c[2] + Math.sin(ang) * d], 4, 0.22 * d, 0.2, al, r, 0);
      }
    }

    // ---- E16 slice window and the clean line (mint #5dffc2 additive 0.9, flat white edge, no tangle)
    const sk0 = sstep(sl0, sl0 + 0.5, t) * (1 - sstep(sl1 - 0.12, sl1, t));
    if (sk0 > 0.01) {
      const { x, z0, z1 } = LAY.slice, y = 0.05, a = 0.9 * sk0;
      const edge = (p, q) => pool.strip([Wv(p), Wv(q)], { w: 0.22, a, core: C.white, edge: C.mint, cw: 0.16 });
      edge([-x, y, z0], [x, y, z0]); edge([x, y, z0], [x, y, z1]); edge([x, y, z1], [-x, y, z1]); edge([-x, y, z1], [-x, y, z0]);
      pool.strip([Wv([0, y, z0]), Wv([0, y, lerp(z0, z1, 0.5)]), Wv([0, y, z1])], { w: 0.14, a: a * (0.75 + 0.25 * Math.sin(t * 12)), core: C.white, edge: C.mint, cw: 0.2 });
    }
    sliceMat.uniforms.uA.value = sk0; sliceMat.uniforms.uShift.value = Sc(t) * 0.35;
    { const p = Wv([0, 0.04, (LAY.slice.z0 + LAY.slice.z1) / 2]); sliceFill.position.set(p[0], p[1], p[2]); sliceFill.rotation.set(-Math.PI / 2, S.yaw, 0, "YXZ"); }

    // ---- E18 light trail: ribbon 0.34 m, 14 samples, flat two-tone, thicker tail, 3 streak lines; hot behind the car
    const tk = sstep(trl0, trl0 + 0.5, t) * (1 - sstep(trl1, trl1 + 0.9, t));
    if (tk > 0.01) {
      const len = 11 * tk, pts = (off) => Array.from({ length: 14 }, (_, i) => { const u = i / 13; return Wv([off + 0.06 * Math.sin(i * 0.9 + tf * 1.7), LAY.rear[1] + 0.05 * Math.sin(i * 0.7 + tf), LAY.rear[2] - u * len]); });
      pool.strip(pts(0), { w: (u) => 0.34 * (1 + 0.9 * u), a: (u) => 0.9 * (1 - u) * tk + 0.05, core: C.white, edge: C.trailEdge, cw: 0.35 });
      for (const o of [-0.6, 0, 0.6]) pool.strip(pts(o * 1.1).map((p) => [p[0], p[1] + 0.25 * o * o + (o ? 0.2 : -0.1), p[2]]), { w: 0.05, a: (u) => 0.7 * (1 - u) * tk, core: C.trailEdge });
    }

    // ---- E21 3D speed streaks (screen-space lines come from sakuga): 120 strips 2.5 to 9.5 m x speed, #ffe099, wrapped on the treadmill
    const vf = V(t) / VMAX;
    if (vf > 0.04) {
      const sc = Sc(t), al = 0.45 * Math.min(1, vf * 2);
      for (let i = 0; i < 120; i++) {
        const x = (hash(i, 1) < 0.5 ? -1 : 1) * (1.9 + hash(i, 2) * 9), y = 0.15 + hash(i, 3) * 4.2;
        let z = hash(i, 4) * 50 - sc * (0.6 + hash(i, 6) * 0.8); z = (((z + 18) % 50) + 50) % 50 - 18;
        const L = (2.5 + hash(i, 5) * 7) * vf;
        pool.strip([Wv([x, y, z]), Wv([x, y, z + L])], { w: 0.05, a: (u) => al * (1 - u * 0.8), core: C.streak });
      }
    }
    pool.end();

    // ---- E19 smoke (110 cel puffs): the launch burst then drift puffs to the cross; treadmill-scrolled, rising, growing, shrunk (not faded) at the end
    for (let i = 0; i < 110; i++) {
      const st = i < 75 ? LAUNCH + hash(i, 1) * 1.4 : LAUNCH + 1.4 + hash(i, 1) * Math.max(0.1, chg1 - LAUNCH - 1.4);
      const life = 1.3 + hash(i, 2) * 1.1, age = t - st, u = age / life;
      if (age < 0 || u > 1) { smoke.size.setX(i, 0); continue; }
      const x = (hash(i, 3) - 0.5) * 2.6 * (1 + 0.35 * age), z0 = -2.0 - hash(i, 4) * 1.2;
      const p = W(x, 0.15 + 0.9 * age * (1 - 0.3 * age), z0 - (Sc(t) - Sc(st)));
      smoke.pos.setXYZ(i, p[0], p[1], p[2]);
      smoke.size.setX(i, (0.3 + 1.7 * (1 - (1 - u) * (1 - u))) * (1 - sstep(0.8, 1, u)) * (i < 75 ? 1 : 0.7));
    }
    smoke.flush();

    // ---- E20 confetti: two cannons (launch; the stop). Drag-limited ballistics: x = p0 + v (1-e^{-ka})/k ; y adds -(g/k)(a - (1-e^{-ka})/k)
    for (let i = 0; i < 240; i++) {
      const c2 = i >= 120, t0 = (c2 ? cn2 : LAUNCH) + hash(i, 11) * 0.12, a = t - t0;
      if (a < 0 || a > 3.2) { conf.size.setX(i, 0); continue; }
      const k = 1.8, ek = (1 - Math.exp(-k * a)) / k, sp = 9 + hash(i, 12) * 7, el = 0.96 + hash(i, 13) * 0.55, az = (hash(i, 14) - 0.5) * 1.5;
      const vx = Math.sin(az) * Math.cos(el) * sp * 0.6, vy = Math.sin(el) * sp, vz = Math.cos(az) * Math.cos(el) * sp * 0.3;
      const o = c2 ? LAY.cannon2 : LAY.cannon1, y = o[1] + vy * ek - (6 / k) * (a - ek);
      if (y < 0.02 && a > 0.4) { conf.size.setX(i, 0); continue; }
      const p = W(o[0] + vx * ek, Math.max(0.02, y), o[2] + vz * ek - (c2 ? 0 : Sc(t) - Sc(t0)));
      conf.pos.setXYZ(i, p[0], p[1], p[2]); conf.size.setX(i, 0.16); conf.aux.setX(i, a * (4 + hash(i, 15) * 6));
    }
    conf.flush();

    // ---- gold motes: wide in shot 1 (the swelling bubble), close at the stop and the credit
    {
      const near = t >= MOTE_NEAR[0] - 0.4 && t < MOTE_NEAR[1], wide = t < MOTE_WIDE[1] + 0.4;
      const env = wide ? sstep(0, 0.3, t) * (1 - sstep(MOTE_WIDE[1] - 0.3, MOTE_WIDE[1] + 0.4, t)) : near ? sstep(MOTE_NEAR[0], MOTE_NEAR[0] + 0.6, t) * (1 - sstep(MOTE_NEAR[1] - 0.5, MOTE_NEAR[1], t)) : 0;
      for (let i = 0; i < 70; i++) {
        if (env <= 0.01) { mote.size.setX(i, 0); continue; }
        const ang = hash(i, 1) * 6.283 + t * 0.12 * (hash(i, 2) - 0.5), r = wide ? 4 + hash(i, 3) * 10 : 1.6 + hash(i, 3) * 3; // never inside 1.6 m of the seal axis
        const y = ((hash(i, 4) * 4.5 + t * 0.18) % 4.5) + 0.3, p = W(Math.cos(ang) * r, y, Math.sin(ang) * r);
        mote.pos.setXYZ(i, p[0], p[1], p[2]);
        mote.size.setX(i, (0.05 + hash(i, 5) * 0.08) * env * (wide ? 3 : 1) * (0.7 + 0.3 * Math.sin(t * 5 + i)));
      }
      mote.flush();
    }

    // ---- launch rings: two thin rings from the rear wheels, 8 frames
    {
      const k = (t - LAUNCH) / (8 / 24);
      if (k >= 0 && k <= 1) {
        const R = 0.5 + 6.5 * (1 - (1 - k) * (1 - k)); ringMat.uniforms.uK.value = k; ringMat.uniforms.uA.value = 0.8;
        [-1.35, 1.35].forEach((x, i) => { const p = W(x, 0.07, -1.0); rings[i].position.set(p[0], p[1], p[2]); rings[i].scale.set(R * 2, R * 2, 1); });
      } else { ringMat.uniforms.uA.value = 0; rings.forEach((m) => m.scale.set(0.001, 0.001, 1)); }
    }

    // ---- king aura (flame-edge rim, 12 frames on the cry), pushed .6 m behind the king so the seal is never overdrawn
    {
      const k = (t - cry0) / 0.5;
      if (k >= 0 && k <= 1) { const s = 3.4 * (0.85 + 0.25 * sstep(0, 0.3, k)); aura.set(Wv(LAY.king), s, s, 0, 0.6); aura.material.uniforms.uT.value = t; aura.material.uniforms.uA.value = 1 - sstep(0.6, 1, k); } else aura.hide();
    }

    // ---- E23 Ka-chow glint: 4-point star at the nose, 0.5 s, 2.2 m, spin 4 rad/s, three flat sizes on twos, plus the cross flare
    {
      const a = t - kc0;
      if (a >= 0 && a < 0.5) {
        const sz = [0.9, 2.2, 1.4][Math.min(2, Math.floor((a / 0.5) * 3))], p = Wv(LAY.nose);
        star.set(p, sz, sz, 4 * t, 0.4); cross.set(p, sz * 2.6, sz * 2.6, 0, 0.4);
      } else { star.hide(); cross.hide(); }
    }

    // ---- E2 sun flare: stable, anamorphic, one streak; far along sunDir; alpha capped .5 (the pup is never whited)
    {
      const d = LAY.sunDir, n = Math.hypot(d[0], d[1], d[2]) || 1;
      sun.set([tmp.x + (d[0] / n) * 300, tmp.y + (d[1] / n) * 300 + 8, tmp.z + (d[2] / n) * 300], 150, 37, 0, 0);
      sun.material.uniforms.uA.value = 0.5 * sstep(1.0, 1.6, t) * (1 - sstep(wp0 - 0.2, wp0, t));
    }

    // ---- easter egg 7: the Gate of Babylon and one thrown blade behind rival 1 (Gilgamesh), about 11 s
    {
      const h0 = HITS[0], k = (t - (h0.t - 0.6)) / 2.4;
      if (k >= 0 && k <= 1) {
        const base = h0.world ? h0.at : Wv([h0.at[0] + LAY.gateFrom[0], LAY.gateFrom[1], h0.at[2] + LAY.gateFrom[2]]), s = 2.8 * sstep(0, 0.25, k) * (1 - sstep(0.8, 1, k));
        gate.set(base, s, s, 0.2, 1.0); gate.material.uniforms.uT.value = t; gate.material.uniforms.uA.value = 1;
        blade.set(base, 0.2 * s, 1.1 * s, 9 * t, 0.7); blade.material.uniforms.uA.value = 1;
      } else { gate.hide(); blade.hide(); }
    }

    // ---- flash quads: cry 0.5 over 4 frames, Ka-chow 0.22 over 3 frames (#fff1d0 additive, drawn behind the seal)
    {
      const fc = t - cry0, fk = t - kc0;
      const a1 = fc >= 0 && fc < 4 / 24 ? 0.5 * (1 - fc / (4 / 24)) : 0, a2 = fk >= 0 && fk < 3 / 24 ? 0.22 * (1 - fk / (3 / 24)) : 0;
      flashMat.uniforms.uA.value = Math.max(a1, a2); flashMat.uniforms.uChest.value.copy(tmp);
    }

    // ---- chequered page wipe home (exit, f600-f610): uK 0..1 on the display clock
    {
      const k = clamp01((ct - wp0) / Math.max(1e-3, wp1 - wp0));
      pageMat.uniforms.uK.value = ct >= wp0 ? k : -10; pageMat.uniforms.uAsp.value = cue.aspect || ctx.aspect();
    }

    // ---- 2 px aberration for 4 frames on the cry (composer misregistration, restored to its base every frame)
    if (U?.uMisreg) U.uMisreg.value = mis0 + (cAge >= 0 && cAge < 4 / 24 ? 0.0016 : 0);

    // ---- stateful camera shake (the one non-pure cue): trauma on the cry, the launch and each hit
    for (const b of cue.fired || []) { if (b.name === "cry") sk.trauma(0.55); else if (b.name === "launch") sk.trauma(0.35); else if (b.name === "hit") sk.trauma(0.22); }
    dust.update(t, cue);
  }

  function dispose() {
    dust.dispose(); pool.dispose(); smoke.dispose(); conf.dispose(); mote.dispose();
    for (const m of [star, cross, sun, aura, gate, blade, flash, ...rings, sliceFill, page]) { m.geometry?.dispose(); m.material?.dispose(); }
    ringMat.dispose(); sliceMat.dispose(); pageMat.dispose(); flashMat.dispose();
    if (U?.uMisreg) U.uMisreg.value = mis0;
  }

  return { group, update, dispose };
}
