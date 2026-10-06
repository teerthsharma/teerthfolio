// E10 SHOCKWAVE RINGS AND DOME (shockwave-dome) + the ground dust push + landing puffs.
// Graphic single-line rings, never additive blobs. MATHS:
//   ring A   outer r(t) = 0.25 + 2.40 ease3((t - TP)/(17/24)), band [0.9 r, r]; alpha .95 (1 - k); mint #3de0b0 band, 2 px white outer edge, 1 px ink beyond
//   ring B   0.15 -> 1.45 m over 10 frames from f96, cream #f3ecd8, same edge grammar
//   core     additive pass ONLY on ring A's band centre (+-1.5 px, HDR 1.35) = "glow on the core only"
//   px       pixel width in world metres = fwidth(r): every line is a constant number of pixels at any distance
//   dome     hemisphere about the mitt's ground point, r(t) = .5 + 8.5 ease3((t - TP - 4f)/(25f)) -> 9 m by f123 (rises to the deck);
//            FRONT faces draw the rim only: 1 - smoothstep(0, 2.5 fwidth(ndv) + .003, ndv), ndv = |n . v|  (2 px white at 60 percent);
//            BACK faces draw the 14 percent #cffff0 fill (depth-tested behind the seal, so the seal is never milky)
//   dust     flat ring on the plain from the seal's feet: outer q(t) = .1 + .9 ease3(k), band .16, torn edge q(1 + .08(h(14 ang) - .5)),
//            two cel tones by h(14 ang), 2 px ink on the outer edge
//   puffs    5 thieves + the leader land f126-132: a one-drawing scalloped puff r(a) = 1 + .16 sin(5a + seed), lit top / shadow bottom, ink 2 px
import { DoubleSide, BackSide, FrontSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, AdditiveBlending, RingGeometry } from "three";
import { C, PAL, fr, easeOut3, sstep, clamp, GLSL_HASH } from "./util.js";

const BB_V = `uniform float uSize; varying vec2 vP;
void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * uSize; gl_Position = projectionMatrix * mv; }`;
const RING_F = `uniform float uR, uBand, uA, uSize, uCore; uniform vec3 uCol, uWhite, uInk, uCoreC; varying vec2 vP;
void main(){
  float r = length(vP) * uSize, px = fwidth(r);
  float inner = uR * uBand;
  if (uCore > 0.5) {                                                     // additive core: a thin hot line at the band centre
    float m = 0.5 * (inner + uR), d = abs(r - m);
    float a = (1.0 - smoothstep(1.0 * px, 2.5 * px, d)) * uA * 0.7;
    if (a < 0.003) discard; gl_FragColor = vec4(uCoreC * 1.35, a); return;
  }
  float band = step(inner, r) * step(r, uR);
  float white = step(uR - 2.0 * px, r) * band;
  float ink = step(uR, r) * step(r, uR + 1.0 * px);
  vec3 c = mix(uCol, uWhite, white); if (ink > 0.5) c = uInk;
  float a = max(band, ink) * uA; if (a < 0.003) discard;
  gl_FragColor = vec4(c, a);
}`;
const DOME_V = `varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const DOME_F = `uniform float uA, uRim; uniform vec3 uCol; varying vec3 vN, vV;
void main(){
  if (uRim > 0.5) { float ndv = abs(dot(normalize(vN), normalize(vV))); float rim = 1.0 - smoothstep(0.0, 2.5 * fwidth(ndv) + 0.003, ndv); if (rim < 0.02) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, rim * 0.6 * uA); }
  else gl_FragColor = vec4(uCol, 0.14 * uA);
}`;
const DUST_F = `${GLSL_HASH}
uniform float uQ, uA; uniform vec3 uLit, uMid, uInk; varying vec2 vP;
void main(){
  float r = length(vP), ang = atan(vP.y, vP.x), px = fwidth(r);
  float torn = 1.0 + 0.08 * (h11(floor(ang * 14.0 / 6.28318 * 6.28318)) - 0.5);
  float q = uQ * torn, inner = q - 0.16;
  if (r > q + 2.0 * px || r < inner) discard;
  vec3 c = h11(floor(ang * 14.0) + 3.0) > 0.5 ? uLit : uMid;           // two cel tones, hard cut
  if (r > q - 2.0 * px) c = uInk;                                      // 2 px ink on the outer edge
  gl_FragColor = vec4(c, uA);
}`;
const PUFF_F = `uniform float uA, uSeed; uniform vec3 uLit, uMid, uInk; varying vec2 vP;
void main(){
  float r = length(vP), a = atan(vP.y, vP.x), px = fwidth(r);
  float edge = 0.82 * (1.0 + 0.16 * sin(5.0 * a + uSeed));
  if (r > edge + 2.0 * px) discard;
  vec3 c = vP.y > -0.1 + 0.25 * sin(3.0 * vP.x + uSeed) ? uLit : uMid;
  if (r > edge - 2.0 * px) c = uInk;
  gl_FragColor = vec4(c, uA);
}`;

export function make(ctx, S) {
  const { T, F } = S, TP = T.TP;
  const group = new Group();
  const bbMat = (frag, u, extra = {}) => new ShaderMaterial({ vertexShader: BB_V, fragmentShader: frag, uniforms: u, transparent: true, depthWrite: false, side: DoubleSide, ...extra });
  const disposables = [];
  const ringU = (col, Rmax) => ({ uSize: { value: Rmax * 1.12 }, uR: { value: 0.2 }, uBand: { value: 0.9 }, uA: { value: 0 }, uCore: { value: 0 }, uCol: { value: C(col) }, uWhite: { value: C("#ffffff") }, uInk: { value: C(PAL.ink) }, uCoreC: { value: C(PAL.mintLit) } });
  const mkRing = (col, Rmax, core) => {
    const g = new PlaneGeometry(2, 2), m = bbMat(RING_F, ringU(col, Rmax)), mesh = new Mesh(g, m);
    mesh.renderOrder = 8; mesh.frustumCulled = false; mesh.position.copy(F.M);
    let coreMesh = null;
    if (core) { const mc = bbMat(RING_F, ringU(col, Rmax), { blending: AdditiveBlending }); mc.uniforms.uCore.value = 1; coreMesh = new Mesh(g, mc); coreMesh.renderOrder = 9; coreMesh.frustumCulled = false; coreMesh.position.copy(F.M); group.add(coreMesh); disposables.push(mc); }
    group.add(mesh); disposables.push(g, m);
    return { mesh, coreMesh };
  };
  const A = mkRing(PAL.mint, 2.65, true), B = mkRing(PAL.cream, 1.45, false);

  // dome: hemisphere about the mitt's ground point
  const dg = new SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const du = (rim) => ({ uA: { value: 0 }, uRim: { value: rim }, uCol: { value: C(PAL.dome) } });
  const domeFill = new Mesh(dg, new ShaderMaterial({ vertexShader: DOME_V, fragmentShader: DOME_F, uniforms: du(0), transparent: true, depthWrite: false, side: BackSide }));
  const domeRim = new Mesh(dg, new ShaderMaterial({ vertexShader: DOME_V, fragmentShader: DOME_F, uniforms: du(1), transparent: true, depthWrite: false, side: FrontSide }));
  for (const d of [domeFill, domeRim]) { d.position.set(F.M.x, 0, F.M.z); d.renderOrder = 7; d.frustumCulled = false; group.add(d); }

  // dust ring on the plain
  const rg = new RingGeometry(0, 1, 96), dm = new ShaderMaterial({
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: DUST_F,
    uniforms: { uQ: { value: 0 }, uA: { value: 0 }, uLit: { value: C(PAL.dustLit) }, uMid: { value: C(PAL.dust) }, uInk: { value: C(PAL.dustInk) } }, transparent: true, depthWrite: false, side: DoubleSide,
  });
  const dust = new Mesh(rg, dm); dust.rotation.x = -Math.PI / 2; dust.position.y = 0.03; dust.scale.setScalar(7.5); dust.renderOrder = 1; dust.frustumCulled = false; group.add(dust);

  // landing puffs: the leader + four thieves, displaced along the ring normal (stagger 2 frames per metre)
  const puffs = [];
  const spots = [[0, 9.0], [-48, 7.5], [-24, 8.2], [24, 7.0], [50, 8.6]];
  spots.forEach(([deg, rad], i) => {
    const a = deg * Math.PI / 180, g = new PlaneGeometry(2, 2);
    const m = bbMat(PUFF_F, { uSize: { value: 1 }, uA: { value: 0 }, uSeed: { value: i * 1.9 }, uLit: { value: C(PAL.dustLit) }, uMid: { value: C(PAL.dust) }, uInk: { value: C(PAL.dustInk) } });
    const mesh = new Mesh(g, m); mesh.position.set(Math.cos(a) * rad, 0.25, -Math.sin(a) * rad); mesh.renderOrder = 6; mesh.frustumCulled = false;
    group.add(mesh); puffs.push({ mesh, m, land: TP + fr(32 + 2 * (rad - 5)) }); disposables.push(g, m);
  });

  return {
    group,
    update(ts) {
      // rings
      const kA = (ts - T.ringA) / fr(17), kB = (ts - T.ringB) / fr(10);
      for (const [R, k, r0, r1, a0] of [[A, kA, 0.25, 2.65, 0.95], [B, kB, 0.15, 1.45, 0.9]]) {
        const on = k >= 0 && k <= 1, r = r0 + (r1 - r0) * easeOut3(k), a = a0 * (1 - clamp(k));
        for (const m of [R.mesh, R.coreMesh]) if (m) { m.visible = on; m.material.uniforms.uR.value = r; m.material.uniforms.uA.value = a; m.position.copy(F.M); }
      }
      // dome
      const kd = (ts - T.dome0) / (T.dome1 - T.dome0), on = kd >= 0 && kd <= 1.25;
      const rd = 0.5 + 8.5 * easeOut3(kd);
      for (const d of [domeFill, domeRim]) { d.visible = on; d.scale.setScalar(Math.max(0.01, rd)); d.material.uniforms.uA.value = 1 - sstep(0.4, 1.25, kd); }
      // dust
      const kq = (ts - TP) / 0.9;
      dust.visible = kq >= 0 && kq <= 1.3; dm.uniforms.uQ.value = 0.1 + 0.9 * easeOut3(kq); dm.uniforms.uA.value = 0.9 * (1 - sstep(0.7, 1.3, kq));
      // puffs: one drawing (6 frames) each
      for (const p of puffs) {
        const k = (ts - p.land) / fr(6), v = k >= 0 && k < 1;
        p.mesh.visible = v; p.m.uniforms.uSize.value = 0.3 + 0.6 * easeOut3(k); p.m.uniforms.uA.value = 0.95 * (1 - 0.5 * clamp(k));
      }
    },
    dispose() { for (const o of [...disposables, dg, rg, dm, domeFill.material, domeRim.material]) o.dispose(); },
  };
}
