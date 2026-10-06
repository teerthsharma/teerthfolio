// p-nerve FX: the four hypotheses. Bible 3.9 (bead as 2-tone sphere with hard star glint, ring a 3-frame flat pop),
// 3.10 / FX 4 (160 umber grains, heaps 32, 48, 64, 16), FX 6 (bead flare: #4aa8ff 4-point star, 12 f up and hold),
// shot 4 (the SHING slash: a two-value red/white blade). Cues read: bead x4, flare, shing.
import * as THREE from "three";
import { billboard, triSoup, STAR_FS, OCTA, hex, clamp01, sstep } from "./common.js";

export default function gauges(ctx, S) {
  const { U, TL, A, D } = S;
  const group = new THREE.Group(); group.name = "nerve-gauges";
  const rng = ctx.rng(31);
  const own = [];
  const beads = TL.evs("bead", D.bead), flares = TL.evs("flare", D.flare), shing = TL.evs("shing", D.shing)[0];
  const gz = A.gaugeZ, top = A.gaugeH - 0.2, rest = 0.42, FALL = 0.5;

  // ---- beads: sphere r .11, hard cel: lit #d9efff (n.L > .35), body #4aa8ff, shadow #1f5fb0 (n.L < -.1), one white spec cut
  // (n.H > .93). Ink hull = back-face copy at 1.16x in #0b0e10.
  const sph = new THREE.SphereGeometry(0.11, 20, 14);
  const beadMat = new THREE.ShaderMaterial({
    toneMapped: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){
      vec3 L = normalize(vec3(.4,.8,.45)); float d = dot(normalize(vN), L);
      vec3 c = d > .35 ? vec3(.851,.937,1.) : (d > -.1 ? vec3(.29,.659,1.) : vec3(.122,.373,.69));
      float h = dot(normalize(vN), normalize(L + vV)); if (h > .93) c = vec3(1.);
      gl_FragColor = vec4(c, 1.); }`,
  });
  const inkMat = new THREE.MeshBasicMaterial({ color: 0x0b0e10, side: THREE.BackSide, toneMapped: false });
  own.push(sph, beadMat, inkMat);
  const beadObj = [], glints = [], pops = [];
  const popFS = /* glsl */ `
    uniform float uAgo; varying vec2 vUv; varying vec3 vW;
    void main(){
      float k = uAgo / .125; if (k > 1.) discard;
      float r = mix(.25, 1., (floor(k * 3.) + 1.) / 3.);
      float a = step(abs(length((vUv - .5) * 2.) - r), .12) * sealMask(vW);
      if (a < .01) discard;
      gl_FragColor = vec4(1., .353, .302, a);
    }`;
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); g.position.set(A.gaugeX[i], rest, gz);
    const m = new THREE.Mesh(sph, beadMat), h = new THREE.Mesh(sph, inkMat); h.scale.setScalar(1.16);
    g.add(m, h); group.add(g); beadObj.push(g);
    const gl = billboard({ U, size: [0.7, 0.7], uniforms: { uK: { value: 0 }, uAlpha: { value: 1 }, uCol: { value: hex("#4aa8ff") }, uCore: { value: hex("#d9efff") } }, fs: STAR_FS });
    gl.position.set(A.gaugeX[i] + 0.06, rest + 0.08, gz + 0.1); group.add(gl); glints.push(gl);
    const pp = billboard({ U, size: [0.9, 0.9], uniforms: { uAgo: { value: 9 } }, fs: popFS });
    pp.position.set(A.gaugeX[i], rest, gz + 0.05); group.add(pp); pops.push(pp);
  }

  // fourth bead flare: star grows from 0 to 1 over 12 frames at 24 (0.5 s) with an ease-out, then HOLDS (the live one).
  // 2.4 m star, #4aa8ff arms with #d9efff core, plus a 3-step posterised halo (radius .3/.6/.9 at alpha .26/.15/.08)
  const flare = billboard({ U, size: [2.4, 2.4], uniforms: { uK: { value: 0 }, uAlpha: { value: 1 }, uCol: { value: hex("#4aa8ff") }, uCore: { value: hex("#d9efff") } }, fs: STAR_FS });
  flare.position.set(A.gaugeX[3], rest + 0.1, gz + 0.12); flare.renderOrder = 22; group.add(flare);
  const halo = billboard({
    U, size: [3.2, 3.2], uniforms: { uK: { value: 0 }, uCol: { value: hex("#4aa8ff") } },
    fs: /* glsl */ `uniform float uK; uniform vec3 uCol; varying vec2 vUv; varying vec3 vW;
      void main(){ float d = length((vUv - .5) * 2.) / max(uK, .001);
        float a = d < .3 ? .26 : (d < .6 ? .15 : (d < .9 ? .08 : 0.)); a *= sealMask(vW);
        if (a < .01) discard; gl_FragColor = vec4(uCol, a); }`,
  });
  halo.position.copy(flare.position); halo.renderOrder = 21; group.add(halo);

  // ---- grains: 160 octahedra (r .045), heaps [32,48,64,16] at the gauge feet. Each falls 0.55 s from the tube foot to its
  // heap slot: pos = S + (E - S) (u, u^2, u), u = clamp(age/.55). Heap height y = .04 + .1 (1 - r/.3): a cone. Spin 9 rad/s
  // about a per-grain axis, time on threes. Cel: lit #7a4a2a, shadow #3a2412 (n.L step), ink edge #1c1816 at bary < .07.
  const counts = [32, 48, 64, 16], gi = [];
  counts.forEach((n, b) => { for (let j = 0; j < n; j++) gi.push(b); });
  const gg = triSoup(gi.length, () => OCTA.map((t) => t.map((v) => v.map((x) => x * 0.045))), [["aS", 3], ["aE", 3], ["aP", 2]], (i) => {
    const b = gi[i], gx = A.gaugeX[b], land = (beads[b] ?? beads[beads.length - 1]).t + FALL * 0.8;
    const ox = (rng() - 0.5) * 0.55, oz = (rng() - 0.5) * 0.35, r = Math.hypot(ox, oz);
    return { aS: [gx + (rng() - .5) * .08, 0.5, gz], aE: [gx + ox, 0.04 + 0.1 * Math.max(0, 1 - r / 0.3), gz + oz], aP: [land + rng() * 0.35, rng() * 6.28] };
  });
  const gm = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } }, toneMapped: false,
    vertexShader: /* glsl */ `
      attribute vec3 aS, aE, aN, aB; attribute vec2 aP; uniform float uT; varying vec3 vN; varying vec3 vB;
      vec3 rot(vec3 v, vec3 k, float a){ return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1. - cos(a)); }
      void main(){
        float age = uT - aP.x; float u = clamp(age / .55, 0., 1.);
        vec3 k = normalize(vec3(sin(aP.y * 7.), cos(aP.y * 5.), .5));
        float ang = 9. * min(age, .55) + aP.y;
        vec3 c = mix(aS, aE, vec3(u, u * u, u));
        vN = rot(aN, k, ang); vB = aB;
        gl_Position = age < 0. ? vec4(2., 2., 2., 1.) : projectionMatrix * viewMatrix * vec4(c + rot(position, k, ang), 1.);
      }`,
    fragmentShader: /* glsl */ `varying vec3 vN; varying vec3 vB; void main(){
      float lit = step(0., dot(normalize(vN), normalize(vec3(.4, .8, .45))));
      vec3 c = mix(vec3(.227, .141, .071), vec3(.478, .290, .165), lit);
      if (min(vB.x, min(vB.y, vB.z)) < .07) c = vec3(.11, .094, .086);
      gl_FragColor = vec4(c, 1.); }`,
  });
  const grains = new THREE.Mesh(gg, gm); grains.frustumCulled = false; group.add(grains); own.push(gg, gm);

  // ---- SHING slash (shot 4): billboard blade, three layered values on normal blending (ink #0b0e10, red #b3171f, white).
  // Blade half-width w(x) = .16 (1 - |x|)^1.3, f = floor(ago * 24):  f0 white blade over ink, f1 red blade (offset +.2) under a thin white core,
  // f2 thin white, f >= 3 gone. Sits outboard of the seal (+.9 right, +.35 up, +.35 fwd in the seal frame), rolled -0.5 rad.
  const slash = billboard({
    U, additive: false, size: [4.2, 1.2], uniforms: { uAgo: { value: 9 } },
    fs: /* glsl */ `
      uniform float uAgo; varying vec2 vUv; varying vec3 vW;
      float blade(vec2 p, float w, float off){ float x = abs(p.x); return step(abs(p.y - off), w * pow(max(1. - x, 0.), 1.3)) * step(x, 1.); }
      void main(){
        float f = floor(uAgo * 24.); if (f < 0. || f > 2.) discard;
        vec2 p = (vUv - .5) * 2.;
        vec4 o = vec4(0.);
        float ink = blade(p, .34, 0.);
        if (f < .5) { if (ink > 0.) o = vec4(.043, .055, .063, 1.); if (blade(p, .22, 0.) > 0.) o = vec4(1., 1., 1., 1.); }
        else if (f < 1.5) { if (ink > 0.) o = vec4(.043, .055, .063, 1.); if (blade(p, .2, .2) > 0.) o = vec4(.702, .09, .122, 1.); if (blade(p, .08, 0.) > 0.) o = vec4(1., 1., 1., 1.); }
        else { if (blade(p, .08, 0.) > 0.) o = vec4(1., 1., 1., 1.); }
        o.a *= sealMask(vW);
        if (o.a < .05) discard;
        gl_FragColor = o;
      }`,
  });
  slash.material.uniforms.uRoll.value = -0.5; slash.renderOrder = 30; group.add(slash);

  const chest = new THREE.Vector3(), off = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);

  return {
    group,
    update(t, dt, cue) {
      const ct = cue.t;
      for (let i = 0; i < 4; i++) {
        const ev = beads[i]; if (!ev) continue;
        const ago = ct - ev.t, o = beadObj[i];
        o.visible = ago >= 0;
        const u = clamp01(ago / FALL);
        o.position.y = top + (rest - top) * u * u;
        const land = ago - FALL; // seconds since landing
        pops[i].material.uniforms.uAgo.value = i < 3 && land >= 0 ? land : 9; // the three that die pop red
        const k = land >= 0 && land < 0.4 ? Math.sin(Math.PI * clamp01(land / 0.4)) : 0; // a small glint on landing
        glints[i].material.uniforms.uK.value = k * (i === 3 ? 1 : 0.8);
      }
      // flare: up over 12 f then hold
      const fl = TL.last(flares, ct);
      const fk = fl.ev ? sstep(0, 0.5, fl.ago) : 0;
      flare.material.uniforms.uK.value = fk; halo.material.uniforms.uK.value = fk;
      // slash
      const s = ct - shing.t; slash.material.uniforms.uAgo.value = s;
      ctx.seal.chest(chest);
      off.set(0.9, 0.35, 0.35).applyAxisAngle(Y, ctx.seal.yaw || 0).multiplyScalar(ctx.seal.scale || 1);
      slash.position.copy(chest).add(off);
      gm.uniforms.uT.value = Math.floor(ct * 8) / 8;
    },
    dispose() { for (const o of own) o.dispose?.(); for (const m of [...glints, ...pops, flare, halo, slash]) { m.geometry.dispose(); m.material.dispose(); } },
  };
}
