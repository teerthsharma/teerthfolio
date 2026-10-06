// THE RELEASE FX (bible 3.15, 3.21, shots 4-6): mana column, force rings, gold flash, violet dusk, god-ray bands.
//
// mana-column maths: an open cylinder shell (r 1.36 outer, .56 inner, 46 m). Per fragment with V = unit(cam - wp), n = shell normal:
//   f = |n . V|  (1 at the silhouette centre, 0 at the limb)   ->   3 hard tones: f > .62 core #fff1b8, > .28 mid #ffe9b8, else #ffc83a
//   ink streaks: cell = (floor(3 K ang), floor(.7 y - 6 uT)); a cell whose hash > .82 is painted #e0993a, so streaks climb the column on twos
//   alpha = A * pulse(sin(13 tt)) * sealClear(wp)      the seal is never covered: the shell is cleared in front of it (common.js)
// force-ring: r(k) = .6 + 25.4 (1 - (1-k)^2), alpha .55 (1-k), life 41 frames, 5 frames apart; two hard bands (bright rim, darker trailing band).
// flash / dusk: full-frame clip-space quads with a disc hole around the projected seal, so neither can blow the seal out (L1).
import { PAL, T, GLSL_CLEAR, GLSL_NOISE, shader, sstep } from "./common.js";

const COL_VERT = /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const COL_FRAG = /* glsl */ `
uniform vec3 cCore, cMid, cOuter, cInk; uniform float uA, uT, uK, uBase; uniform vec2 uC; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
${GLSL_CLEAR}
${GLSL_NOISE}
void main(){
  vec3 V = normalize(cameraPosition - vW); float f = abs(dot(normalize(vN), V));
  vec3 col = f > 0.62 ? cCore : (f > 0.28 ? cMid : cOuter);
  float ang = atan(vW.z - uC.y, vW.x - uC.x);
  float cell = floor(ang * 3.0 * uK);
  float ns = h21(vec2(cell, floor((vW.y - uBase) * 0.7 - uT * 6.0)));
  col = mix(col, cInk, step(0.82, ns) * 0.75);
  float top = 1.0 - smoothstep(26.0, 46.0, vW.y - uBase);
  gl_FragColor = vec4(col, uA * top * sealClear(vW));
}`;

const RING_VERT = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RING_FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uA, uR, uW; varying vec2 vUv; varying vec3 vW; ${GLSL_CLEAR}
void main(){
  float d = length(vUv - 0.5) * 2.0;           // 1 at the rim
  float e0 = 1.0 - uW / uR;                     // bright rim band width uW (m)
  float e1 = 1.0 - 3.2 * uW / uR;               // darker trailing band
  float rim = step(e0, d) * step(d, 1.0);
  float tr = step(e1, d) * step(d, e0);
  float a = rim + 0.45 * tr;
  gl_FragColor = vec4(uCol * (rim > 0.5 ? 1.0 : 0.72), uA * a * sealClear(vW));
}`;

const SCREEN_VERT = /* glsl */ `uniform vec3 uSeal; uniform float uSealR; varying vec2 vNdc; varying vec3 vS; varying float vAsp;
void main(){
  vNdc = position.xy;
  vec4 c = projectionMatrix * viewMatrix * vec4(uSeal, 1.0);
  float w = max(c.w, 0.05);
  vS = vec3(c.xy / w, uSealR * 1.15 * projectionMatrix[1][1] / w);
  if (c.w < 0.0) vS.z = -1.0;
  vAsp = projectionMatrix[1][1] / projectionMatrix[0][0];
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const SCREEN_FRAG = /* glsl */ `uniform vec3 uCol; uniform float uA; varying vec2 vNdc; varying vec3 vS; varying float vAsp;
void main(){
  vec2 d = (vNdc - vS.xy) * vec2(vAsp, 1.0);
  float m = vS.z < 0.0 ? 1.0 : smoothstep(vS.z, vS.z * 1.8, length(d));   // 0 on the seal
  gl_FragColor = vec4(uCol, uA * m);
}`;

const RAY_FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uA, uT, uSeedR; varying vec2 vUv; varying vec3 vW; ${GLSL_CLEAR}
${GLSL_NOISE}
void main(){
  float u = vUv.x * 2.0 - 1.0;
  float edge = 1.0 - smoothstep(0.3, 1.0, abs(u));
  float along = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
  float band = 0.65 + 0.35 * vn(vec2(u * 3.0 + uSeedR, vUv.y * 1.5 + uT * 0.03));
  gl_FragColor = vec4(uCol, uA * edge * along * band * sealClear(vW));
}`;

export default function column(ctx, S, A) {
  const THREE = ctx.THREE, group = new THREE.Group(); group.name = "release-fx";
  const C = (h) => new THREE.Color(h);
  const seal = ctx.seal;
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true); cyl.translate(0, 0.5, 0);
  const mkCol = (a, k) => shader(THREE, { vert: COL_VERT, frag: COL_FRAG, add: true, uniforms: { cCore: { value: C(PAL.colCore) }, cMid: { value: C(PAL.colMid) }, cOuter: { value: C(PAL.colOuter) }, cInk: { value: C(PAL.colInk) }, uA: { value: a }, uT: { value: 0 }, uK: { value: k }, uBase: { value: 0 }, uC: { value: new THREE.Vector2() }, uSeal: S.uSeal, uSealR: S.uSealR } });
  const outer = new THREE.Mesh(cyl, mkCol(0.55, 1.0)), inner = new THREE.Mesh(cyl, mkCol(0.9, 1.6));
  outer.renderOrder = inner.renderOrder = 10; outer.frustumCulled = inner.frustumCulled = false;
  group.add(outer, inner);

  // rings: 1 (shot 4) + 6 (release) + 2 (break, from under the scale)
  const ringGeo = new THREE.PlaneGeometry(2, 2); ringGeo.rotateX(-Math.PI / 2);
  const cols = [PAL.ringA, PAL.ringB, PAL.ringC];
  const specs = [{ t0: T.ring4, life: 1.7, r1: 26, a: 0.55, at: "seal", c: 0 }];
  for (let i = 0; i < 6; i++) specs.push({ t0: T.release + (i * 5) / 24, life: 41 / 24, r1: 26, a: 0.55, at: "seal", c: i % 3 });
  for (let i = 0; i < 2; i++) specs.push({ t0: T.brk + (i * 5) / 24, life: 41 / 24, r1: 18, a: 0.45, at: "scale", c: (i + 2) % 3, brk: true });
  const rings = specs.map((s) => {
    const m = new THREE.Mesh(ringGeo, shader(THREE, { vert: RING_VERT, frag: RING_FRAG, add: true, uniforms: { uCol: { value: C(cols[s.c]) }, uA: { value: 0 }, uR: { value: 1 }, uW: { value: 0.3 }, uSeal: S.uSeal, uSealR: S.uSealR } }));
    m.renderOrder = 4; m.frustumCulled = false; group.add(m); return { m, s };
  });

  // full-frame quads with a seal hole
  const scrGeo = new THREE.PlaneGeometry(2, 2);
  const mkScr = (col, add, order) => {
    const m = new THREE.Mesh(scrGeo, shader(THREE, { vert: SCREEN_VERT, frag: SCREEN_FRAG, add, depthTest: false, uniforms: { uCol: { value: C(col) }, uA: { value: 0 }, uSeal: S.uSeal, uSealR: S.uSealR } }));
    m.frustumCulled = false; m.renderOrder = order; group.add(m); return m;
  };
  const dusk = mkScr(PAL.dusk, false, 1), flash = mkScr(PAL.flash, true, 20);

  // god-ray bands (3 slanted quads, static, slow slide). The sun feeds the post shafts if no other layer set it.
  const auraP = A.aura;
  if (!ctx.engine.sun) ctx.engine.sun = new THREE.Vector3(auraP[0] + 16, auraP[1] + 34, auraP[2] - 14);
  const sunP = ctx.engine.sun;
  const rayGeo = new THREE.PlaneGeometry(1, 1);
  const rays = [-5.5, 0.5, 6.5].map((o, i) => {
    const m = new THREE.Mesh(rayGeo, shader(THREE, { vert: RING_VERT, frag: RAY_FRAG, add: true, depthWrite: false, uniforms: { uCol: { value: C(PAL.ray) }, uA: { value: 0.1 + 0.02 * i }, uT: { value: 0 }, uSeedR: { value: i * 7.3 }, uSeal: S.uSeal, uSealR: S.uSealR } }));
    m.userData.o = o; m.renderOrder = 3; m.frustumCulled = false; group.add(m); return m;
  });
  const dirV = new THREE.Vector3(), cen = new THREE.Vector3(), toCam = new THREE.Vector3(), side = new THREE.Vector3(), nrm = new THREE.Vector3(), tgt = new THREE.Vector3(), mat = new THREE.Matrix4();
  const cam = ctx.player?.camera;

  function update(t, dt, cue) {
    const rel = Number.isFinite(cue.since("release")) ? cue.t - cue.since("release") : T.release;
    const brk = Number.isFinite(cue.since("break")) ? cue.t - cue.since("break") : T.brk;
    const rd = rel - T.release, bd = brk - T.brk; // direction can slide the beats; the windows below follow them
    const sx = seal.at[0], sy = seal.at[1], sz = seal.at[2];

    // column
    const grow = sstep(rel, rel + 13 / 24, t), fade = sstep(T.colFade[0] + rd, T.colFade[1] + rd, t);
    const on = grow > 0.001 && fade < 0.999;
    outer.visible = inner.visible = on;
    if (on) {
      const pulse = 1 + 0.12 * Math.sin(t * 13);
      const rk = 1 - 0.45 * fade;
      for (const [m, r] of [[outer, 1.36], [inner, 0.56]]) {
        m.position.set(sx, sy, sz); m.scale.set(r * rk * pulse, 46 * grow, r * rk * pulse);
        m.material.uniforms.uT.value = t; m.material.uniforms.uBase.value = sy; m.material.uniforms.uC.value.set(sx, sz);
        m.material.uniforms.uA.value = (r > 1 ? 0.55 : 0.9) * (1 - fade) * grow;
      }
    }

    // rings
    for (const { m, s } of rings) {
      const t0 = s.t0 + (s.brk ? bd : rd), k = (t - t0) / s.life;
      m.visible = k >= 0 && k <= 1;
      if (!m.visible) continue;
      const r = 0.6 + (s.r1 - 0.6) * (1 - (1 - k) * (1 - k));
      const p = s.at === "scale" ? A.scale : [sx, sy, sz];
      m.position.set(p[0], (s.at === "scale" ? A.ground : sy) + 0.03, p[2]); m.scale.set(r, 1, r);
      const u = m.material.uniforms; u.uR.value = r; u.uW.value = 0.22 + 0.012 * r; u.uA.value = s.a * (1 - k);
    }

    // flash: 2 frames at the release (alpha .12) and at the break (alpha .2); gold #fff6d8, never white
    const f2 = 2 / 24;
    flash.material.uniforms.uA.value = (t >= rel && t < rel + f2) ? 0.12 : (t >= brk && t < brk + f2) ? 0.2 : 0;
    flash.visible = flash.material.uniforms.uA.value > 0;
    // dusk: the court goes violet round the column (uDim to 0.8), lifts into the golden afterglow by 11 s
    const dk = sstep(rel, rel + 0.5, t) * (1 - sstep(10.2 + rd, 11.0 + rd, t));
    dusk.material.uniforms.uA.value = 0.34 * dk; dusk.visible = dk > 0.001;

    // god rays: three slanted bands from the sun to the court floor, a slow slide
    S.uT.value = t;
    cen.set(0, 0, 0);
    rays.forEach((m, i) => {
      tgt.set(sx + 5 + m.userData.o, sy, sz + m.userData.o * 0.6);
      dirV.copy(tgt).sub(sunP); const L = dirV.length(); dirV.normalize();
      cen.copy(sunP).addScaledVector(dirV, L * 0.5);
      if (cam) { toCam.copy(cam.position).sub(cen); side.crossVectors(dirV, toCam).normalize(); nrm.crossVectors(side, dirV); mat.makeBasis(side, dirV, nrm); m.quaternion.setFromRotationMatrix(mat); }
      m.position.copy(cen); m.scale.set(3.2 + 1.2 * i, L, 1);
      m.material.uniforms.uT.value = t;
      m.material.uniforms.uA.value = (0.10 + 0.02 * i) * (1 - 0.6 * sstep(7.7, 8.0, t) * (1 - sstep(10.4, 11.0, t)));
    });
  }
  return { group, update, dispose() { cyl.dispose(); ringGeo.dispose(); scrGeo.dispose(); rayGeo.dispose(); [outer, inner, dusk, flash, ...rings.map((r) => r.m), ...rays].forEach((o) => o.material.dispose()); } };
}
