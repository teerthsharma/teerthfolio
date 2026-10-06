// p-nerve FX: atmosphere. Bible FX 1 (floodlight shaft), 2 (rain, splash rings, puddle ripples), 10 (light-streak bands).
// Cues read: rain (start), toll (shaft flicker e^-5t).
import * as THREE from "three";
import { MASK, HASH, BEHIND_VS, shader, quadSoup, hex } from "./common.js";

export default function atmos(ctx, S) {
  const { U, TL, A, D } = S;
  const group = new THREE.Group(); group.name = "nerve-atmos";
  const rng = ctx.rng(11);
  const own = [];
  const keyAt = new THREE.Vector3(...A.keyAt), keyAim = new THREE.Vector3(...A.keyAim);
  const axis = keyAim.clone().sub(keyAt).normalize();
  const half = THREE.MathUtils.degToRad(A.keyHalf);

  // ---- 1. FLOODLIGHT SHAFT -------------------------------------------------------------------
  // A cone from KEY_AT along KEY_AIM, half-angle 27 deg. Additive #f4efe3 at 0.10 base + 0.08 inside 9 hard streak
  // bands (total 0.18 on a band). Bands: cell = floor(u*18); active when hash(cell) > 0.5 (about 9 of 18), width
  // w = 0.3 + 0.6 hash; edge softness ZERO (step). Along-axis fade is posterised to 3 flat steps (cel).
  // Flicker on toll: gain = 1 + 0.6 sum_i e^{-5 (t - t_i)}.
  const len = 9, rad = Math.tan(half) * len;
  const shaftFS = MASK + HASH + /* glsl */ `
    uniform float uFlick, uTime, uBands, uAlpha; uniform vec3 uCol;
    varying vec2 vUv; varying vec3 vW;
    void main(){
      float along = 1. - vUv.y;                        // 0 apex .. 1 base
      float q = floor((1. - along * .8) * 3.) / 3.;    // 3 posterised steps
      float cell = floor(vUv.x * 18.);
      float h = h11(cell + 3.7), h2 = h11(cell + 9.1);
      float f = fract(vUv.x * 18. + uTime * .02);
      float band = uBands * step(.5, h) * step(f, .3 + .6 * h2);
      float al = (uAlpha + .08 * band) * q * (1. + uFlick);
      al *= sealMask(vW);
      if (al < .004) discard;
      gl_FragColor = vec4(uCol, al);
    }`;
  const shaftVS = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const mkCone = (r, col, alpha, bands) => {
    const g = new THREE.ConeGeometry(r, len, 48, 1, true);
    const m = shader({ vs: shaftVS, fs: shaftFS, U, side: THREE.DoubleSide, uniforms: { uFlick: { value: 0 }, uTime: { value: 0 }, uBands: { value: bands }, uAlpha: { value: alpha }, uCol: { value: hex(col) } } });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.copy(keyAt).addScaledVector(axis, len / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), axis);
    mesh.renderOrder = 10; mesh.frustumCulled = false; own.push(g, m); group.add(mesh); return m;
  };
  const shaft = mkCone(rad, "#f4efe3", 0.10, 1);
  const core = mkCone(rad * 0.22, "#fff6e0", 0.07, 0);

  // ---- 2. RAIN ----------------------------------------------------------------------------------
  // 150 constant 1 px GL lines (so "1 px" is exact), 0.6 m long, slanted 12 deg, 14 m/s, falling in a looped volume
  // y = H - mod(t v + phase H, H), x = x0 - (H - y) tan 12deg.  Cone gating: inCone = [ cos(angle(p - KEY, axis)) >= cos 27deg ]:
  // #cfe8ea at 0.55 inside, #7fa4a6 at 0.30 outside. Time is quantised to threes (8 fps).
  const NR = 150;
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NR * 6), 3));
  const aR = new Float32Array(NR * 8), aE = new Float32Array(NR * 2);
  for (let i = 0; i < NR; i++) {
    const x = (rng() * 2 - 1) * 9, z = -6 + rng() * 14, ph = rng(), sp = 12 + rng() * 4;
    for (let k = 0; k < 2; k++) { aR.set([x, z, ph, sp], (i * 2 + k) * 4); aE[i * 2 + k] = k; }
  }
  rg.setAttribute("aR", new THREE.BufferAttribute(aR, 4)); rg.setAttribute("aEnd", new THREE.BufferAttribute(aE, 1));
  const rainMat = shader({
    additive: false, U, uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uKey: { value: keyAt }, uAx: { value: axis }, uCos: { value: Math.cos(half) } },
    vs: /* glsl */ `
      uniform float uTime; uniform vec3 uKey, uAx; uniform float uCos;
      attribute vec4 aR; attribute float aEnd; varying vec3 vW; varying float vIn;
      void main(){
        float H = 14.;
        float y = H - mod(uTime * aR.w + aR.z * H, H);
        vec3 p = vec3(aR.x - (H - y) * .2126, y, aR.y);
        vec3 pp = p - normalize(vec3(-.2126, -1., 0.)) * .6 * aEnd;
        vIn = step(uCos, dot(normalize(pp - uKey), uAx));
        vW = pp; gl_Position = projectionMatrix * viewMatrix * vec4(pp, 1.);
      }`,
    fs: MASK + /* glsl */ `
      uniform float uOn; varying vec3 vW; varying float vIn;
      void main(){
        vec3 c = mix(vec3(.498,.643,.651), vec3(.812,.91,.918), vIn);
        float a = mix(.30, .55, vIn) * uOn * sealMask(vW);
        if (a < .01) discard;
        gl_FragColor = vec4(c, a);
      }`,
  });
  const rain = new THREE.LineSegments(rg, rainMat); rain.frustumCulled = false; rain.renderOrder = 12; group.add(rain); own.push(rg, rainMat);

  // splash rings and puddle ripples: flat ellipse rings on the deck, 3 drawn frames each (age/0.375 s quantised to thirds)
  // radius_f = lerp(.05, .95, (f+1)/3), ring half-width .07 (hard), 42 of them with their own period.
  const NS = 42;
  const sg = quadSoup(NS, () => [[A.deckX[0] + rng() * (A.deckX[1] - A.deckX[0]), A.deckZ[0] + rng() * (A.deckZ[1] - A.deckZ[0]), 0.6 + rng() * 1.0, rng() * 2], [0, 0, 0, 0]]);
  const splMat = shader({
    additive: false, U, uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    vs: /* glsl */ `
      attribute vec4 aC; uniform float uTime; varying vec2 vUv; varying vec3 vW; varying float vAge; varying float vIn;
      void main(){
        float age = mod(uTime + aC.w, aC.z); vAge = age / .375;
        vec3 w = vec3(aC.x, .03, aC.y) + vec3(position.x, 0., position.y * .8) * .3;
        vUv = uv; vW = w; vIn = step(length(vec2(aC.x, aC.y) - vec2(-.5, -1.6)), 4.5);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
      }`,
    fs: MASK + /* glsl */ `
      uniform float uOn; varying vec2 vUv; varying vec3 vW; varying float vAge; varying float vIn;
      void main(){
        if (vAge > 1.) discard;
        float fr = (floor(vAge * 3.) + 1.) / 3.;
        float r = mix(.05, .95, fr);
        vec2 p = (vUv - .5) * 2.;
        float line = step(abs(length(p) - r), .07);
        float a = line * mix(.28, .55, vIn) * uOn * sealMask(vW);
        if (a < .01) discard;
        gl_FragColor = vec4(.812, .91, .918, a);
      }`,
  });
  const spl = new THREE.Mesh(sg, splMat); spl.frustumCulled = false; spl.renderOrder = 11; group.add(spl); own.push(sg, splMat);

  // ---- 10. LIGHT-STREAK BANDS -------------------------------------------------------------------
  // Pale diagonals at 38 deg, about 20% opacity, laid on a plane that sits just behind the seal (BEHIND_VS), so the
  // seal never takes the light (L8). q = p . d + 0.015 t ; cell = floor(6 q); lit when hash(cell) > .55, width .18 + .35 hash.
  const bandMat = shader({
    vs: BEHIND_VS, depthTest: true, uniforms: { uT: { value: 0 }, uAspect: { value: 16 / 9 } },
    fs: HASH + /* glsl */ `
      uniform float uT, uAspect; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - .5) * vec2(uAspect, 1.);
        float ang = radians(-38.); vec2 d = vec2(cos(ang), sin(ang));
        float q = dot(p, d) + uT * .015;
        float id = floor(q * 6.), f = fract(q * 6.);
        float h = h11(id), h2 = h11(id + 5.3);
        float band = step(.55, h) * step(f, .18 + .35 * h2);
        float al = band * .20 * (.6 + .4 * h11(id + 2.));
        if (al < .005) discard;
        gl_FragColor = vec4(.81, .90, .90, al);
      }`,
  });
  const bg = new THREE.PlaneGeometry(1, 1);
  const bands = new THREE.Mesh(bg, bandMat); bands.frustumCulled = false; bands.renderOrder = 3; group.add(bands); own.push(bg, bandMat);

  const tolls = TL.evs("toll", D.toll), rainEv = TL.evs("rain", D.rain)[0];

  return {
    group,
    update(t, dt, cue) {
      const t8 = Math.floor(cue.t * 8) / 8; // threes
      let flick = 0; for (const e of tolls) if (e.t <= cue.t) flick += Math.exp(-5 * (cue.t - e.t));
      for (const m of [shaft, core]) { m.uniforms.uFlick.value = 0.6 * flick; m.uniforms.uTime.value = t8; }
      const on = cue.t >= rainEv.t ? 1 : 0;
      rainMat.uniforms.uTime.value = t8 - rainEv.t; rainMat.uniforms.uOn.value = on;
      splMat.uniforms.uTime.value = t8; splMat.uniforms.uOn.value = on;
      bandMat.uniforms.uT.value = t8; bandMat.uniforms.uAspect.value = ctx.aspect();
    },
    dispose() { for (const o of own) o.dispose?.(); },
  };
}
