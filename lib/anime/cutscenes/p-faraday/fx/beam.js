// THE RAILGUN: outlined posterised beam, Imagine Breaker cancel, sonic ring, muzzle flash, 170 sparks, flash quad,
// heat-shimmer lines, river reflection, afterglow sparks.
//
// Beam (rule: Broly-aura, a coloured outline around a posterised volume)
//   timing       t0 = shot (6.8 s, f163). Hit-stop 4 frames: the head holds at the hand (D) from t0 to t0 + 4/24.
//                head(ts) = D for ts < t0 + hs, else min(46, D + 55 (ts - t0 - hs)) (55 m/s, capped at 46 m).
//   radius       env(ts) = min(1, (ts - t0) / (4/24))          full radius in 4 frames
//                        * (1 - smoothstep(t0 + 37/24, t0 + 58/24, ts))   holds to f200, thins to 0 by f221
//                R_outer = 0.62 m (glow), body 0.38, core 0.18; cone: R(x) = R_outer (c + (1 - c) smoothstep(0, 4, x)).
//   bands        r = |v| / (1 + 0.07 * 2 (vn - 0.5))  ragged edge, then HARD bands (no gradient):
//                r < .14 white core, < .29 gold core, < .61 body (streaks scroll with the head, re-randomised on twos),
//                < 1 edge orange, outline #e8470a 3 px outside it (a second strip padded by 3 px). During hit-stop the
//                core is white-hot and a 2 px #fff6d6 line is drawn on the body/edge boundary: |r - .61| < fwidth(r).
//   Imagine Breaker  6.9-7.2 s: on x in [D + .1, D + 1.1] the beam alpha is cut and the cut is edged in 4 px black.
//   sparks       p(a) = p0 + v a (1 - .3 a) + (0, -4.5 a^2, 0), a = ts - t0 - hs - birth, life 1.2 s, 170 bits.
//   sonic ring   billboard ring at the muzzle, r = .6 + 3.4 (1 - (1 - k)^2) over 10 frames on twos, thickness .15 m.
import { stripGeo, strip, billboard, mat, NZ, sstep, clamp01, muzzleOf } from "./lib.js";

export default function makeBeam(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "beam";
  const geo = stripGeo(THREE, 72);
  const C = (h) => new THREE.Color(h);
  const muzzle = new THREE.Vector3(), tmp = new THREE.Vector3();

  const beamFs = /* glsl */ `
    uniform float uSeed; uniform float uTime; uniform float uHit; uniform float uCancel; uniform vec2 uCancelX; uniform float uHdr; uniform float uA;
    varying float vX; varying float vV; varying float vU;
    void main() {
      float edgeN = (vn(vec2(vX * 2.3 + uSeed * 1.7, uSeed)) - .5) * 2. + (vn(vec2(vX * 9.0, uSeed * .31)) - .5) * .8;
      float r = abs(vV) / (1. + .07 * edgeN);
      if (r > 1.) discard;
      // Imagine Breaker: cut the beam on [x0, x1], edge the cut in black (4 px via fwidth)
      float cutA = 1.;
      if (uCancel > .5) {
        float fw = max(fwidth(vX) * 2., .004);
        float inCut = step(uCancelX.x, vX) * step(vX, uCancelX.y);
        float edge = 1. - smoothstep(0., fw * 2., min(abs(vX - uCancelX.x), abs(vX - uCancelX.y)));
        if (inCut > .5 && edge < .5) discard;
        if (edge > .5) { gl_FragColor = vec4(0., 0., 0., 1.); return; }
      }
      // streaks scroll along the beam on the step (re-randomised per step on twos)
      float st = vn(vec2(vX * .9 - uTime * 18. + uSeed * 3.1, vV * 5. + uSeed));
      vec3 core0 = vec3(1., .957, .812), core1 = vec3(1., .824, .227);
      vec3 body0 = vec3(1., .702, .278), body1 = vec3(1., .663, .153), edgeC = vec3(1., .478, .102);
      // convert the sRGB hexes of the bible to linear
      core0 = pow(core0, vec3(2.2)); core1 = pow(core1, vec3(2.2)); body0 = pow(body0, vec3(2.2)); body1 = pow(body1, vec3(2.2)); edgeC = pow(edgeC, vec3(2.2));
      vec3 col; float hdr;
      if (r < .14) { col = mix(core0, vec3(1.), uHit); hdr = 1.8; }
      else if (r < .29) { col = mix(core1, core0, uHit); hdr = 1.6; }
      else if (r < .61) { col = st > .6 ? mix(body0, core1, .5) : (st > .3 ? body0 : body1); hdr = 1.0; }
      else { col = edgeC; hdr = .95; }
      if (uHit > .5 && abs(r - .61) < fwidth(r) * 1.1) { col = pow(vec3(1., .965, .839), vec3(2.2)); hdr = 1.8; }
      gl_FragColor = vec4(col * hdr * uHdr, uA);
    }`;
  const outFs = `uniform float uA; varying float vX; varying float vV; varying float vU;
    void main() { gl_FragColor = vec4(pow(vec3(.91, .278, .039), vec3(2.2)), uA); }`;
  const beamU = { uSeed: { value: 0 }, uTime: { value: 0 }, uHit: { value: 0 }, uCancel: { value: 0 }, uCancelX: { value: new THREE.Vector2() }, uHdr: { value: 1 }, uA: { value: 1 } };
  const outline = strip(THREE, sh, geo, outFs, { uA: { value: 1 } }, { pad: 3, cone: 0.22, tip: 0.7, order: 8 });
  const body = strip(THREE, sh, geo, beamFs, beamU, { pad: 0, cone: 0.22, tip: 0.7, order: 9 });
  group.add(outline, body);

  // ---- Imagine Breaker flare at the hand: a white star with a 4 px black outline ------------------------------------
  const starFs = /* glsl */ `
    uniform float uK; uniform float uBlack; varying vec2 vUv;
    float star(vec2 p, float n, float R, float sharp) { float a = atan(p.y, p.x), r = length(p);
      float k = pow(abs(cos(a * n * .5)), sharp); return step(r, R * (.25 + .75 * k)); }
    void main() {
      vec2 p = vUv; float R = mix(.25, 1., uK);
      float s0 = star(p, 6., R, 2.5), s1 = star(p, 6., R + .1, 2.5);
      if (s1 < .5) discard;
      vec3 c = s0 > .5 ? vec3(1., .95, .8) * 1.8 : vec3(0.);
      gl_FragColor = vec4(c, 1.);
    }`;
  const star = billboard(THREE, sh, starFs, { uK: { value: 0 }, uBlack: { value: 1 } }, { order: 11 });
  group.add(star);

  // ---- muzzle flash + anamorphic head flare (one horizontal streak #ffd689 .3) ----------------------------------------
  const flareFs = /* glsl */ `
    uniform float uK; uniform vec3 uCol; uniform float uStreak; varying vec2 vUv;
    void main() {
      float x = abs(vUv.x), y = abs(vUv.y);
      float hz = exp(-x * 2.4) * exp(-y * (uStreak > .5 ? 26. : 9.));
      float disc = (1. - smoothstep(.0, .35, length(vUv))) * (uStreak > .5 ? 0. : 1.);
      float a = (hz * (uStreak > .5 ? .55 : .8) + disc) * uK;
      if (a < .004) discard;
      gl_FragColor = vec4(uCol * 2., a);
    }`;
  const headFlare = billboard(THREE, sh, flareFs, { uK: { value: 0 }, uCol: { value: C("#ffd689") }, uStreak: { value: 1 } }, { add: true, order: 12 });
  headFlare.userData.u.uSize.value.set(9, 1.6);
  const muzzFlare = billboard(THREE, sh, flareFs, { uK: { value: 0 }, uCol: { value: C("#fff6d6") }, uStreak: { value: 0 } }, { add: true, order: 12 });
  muzzFlare.userData.u.uSize.value.set(2.2, 1.2);
  group.add(headFlare, muzzFlare);

  // ---- sonic ring (flat, camera-facing: reads as a ring from every law angle) -----------------------------------------
  const ringFs = /* glsl */ `
    uniform float uR; uniform float uK; uniform float uSizeM; varying vec2 vUv;
    void main() {
      float m = length(vUv) * uSizeM;           // metres from the centre
      float th = .15;
      float inRing = step(uR - th, m) * step(m, uR);
      if (inRing < .5) discard;
      vec3 c = m > uR - th * .45 ? vec3(1., .824, .227) : vec3(1., .965, .839);
      c = pow(c, vec3(2.2));
      gl_FragColor = vec4(c * 1.6, 1. - smoothstep(.55, 1., uK));
    }`;
  const sonic = billboard(THREE, sh, ringFs, { uR: { value: 1 }, uK: { value: 0 }, uSizeM: { value: 4.5 } }, { order: 12 });
  group.add(sonic);

  // ---- sparks: 170 bits on the head's wake, + 60 wake sparks off the muzzle ---------------------------------------------
  const sparkVs = /* glsl */ `
    attribute vec4 rnd; attribute vec4 rnd2;
    uniform float uT; uniform vec3 uMuz; uniform float uHead0; uniform float uMode; uniform float uHs; uniform float uSpd;
    varying float vA; varying float vH;
    void main() {
      float b = rnd.x * .35, a = uT - b;
      vec3 p; float life = 1.2;
      if (uMode < .5) {            // head wake: born where the head is (D + 55 b), thrown forward-ish with spread
        vec3 p0 = uMuz + vec3(uHead0 + uSpd * b, 0., 0.) + (rnd2.xyz - .5) * vec3(.5, .8, .8);
        vec3 v = vec3(rnd.y * 16. - 4., (rnd.z - .35) * 7., (rnd.w - .5) * 7.);
        p = p0 + v * a * (1. - .3 * a) + vec3(0., -4.5 * a * a, 0.);
      } else {                       // muzzle wake: a short radial burst, gravity light
        life = .8; b = rnd.x * .2; a = uT - b;
        vec3 v = vec3(rnd.y * 9., (rnd.z - .5) * 9., (rnd.w - .5) * 9.);
        p = uMuz + v * a * (1. - .5 * a) + vec3(0., -2. * a * a, 0.);
      }
      float ok = step(0., a) * step(a, life);
      vH = a / life; vA = ok * (1. - smoothstep(.55, 1., a / life));
      vec4 mv = viewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = ok * (2.6 + 4.2 * rnd2.w) * (1. - .6 * a / life) * uHs;
    }`;
  const sparkFs = `varying float vA; varying float vH; void main() {
      vec2 q = abs(gl_PointCoord - .5) * 2.; if (q.x + q.y > 1.) discard; if (vA < .01) discard;
      vec3 c = mix(vec3(1., .824, .227), vec3(1., .663, .153), clamp(vH * 1.5, 0., 1.)); c = pow(c, vec3(2.2));
      gl_FragColor = vec4(c * 1.5, 1.); }`;
  const mkSparks = (n, mode, seed) => {
    const rnd = new Float32Array(n * 4), rnd2 = new Float32Array(n * 4);
    let s = seed;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < n * 4; i++) { rnd[i] = r(); rnd2[i] = r(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("rnd", new THREE.BufferAttribute(rnd, 4)); g.setAttribute("rnd2", new THREE.BufferAttribute(rnd2, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const u = { uT: { value: -1 }, uMuz: { value: new THREE.Vector3() }, uHead0: { value: L.handD }, uMode: { value: mode }, uHs: sh.uHs, uSpd: { value: 55 } };
    const m = mat(THREE, { vs: sparkVs, fs: sparkFs, u });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 10;
    return { p, u, g, m };
  };
  const bits = mkSparks(170, 0, ctx.scene.seed * 97 + 11), wake = mkSparks(60, 1, ctx.scene.seed * 31 + 5);
  group.add(bits.p, wake.p);

  // ---- afterglow sparks: gold, slow, rising (shot 7 to the credit) --------------------------------------------------------
  const NG = 90;
  const glowG = new THREE.BufferGeometry();
  {
    const rnd = new Float32Array(NG * 4), rnd2 = new Float32Array(NG * 4), r = ctx.rng(404);
    for (let i = 0; i < NG * 4; i++) { rnd[i] = r(); rnd2[i] = r(); }
    glowG.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NG * 3), 3));
    glowG.setAttribute("rnd", new THREE.BufferAttribute(rnd, 4)); glowG.setAttribute("rnd2", new THREE.BufferAttribute(rnd2, 4));
    glowG.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  }
  const glowU = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uHs: sh.uHs, uVis: { value: 0 } };
  const glowM = mat(THREE, {
    u: glowU,
    vs: `attribute vec4 rnd; attribute vec4 rnd2; uniform float uT; uniform vec3 uC; uniform float uHs; uniform float uVis; varying float vA;
      void main() {
        float life = 5. + rnd.w * 4., ph = fract(uT / life + rnd.x);
        vec3 p = uC + vec3((rnd.y - .35) * 9., rnd2.x * .5 + ph * (1.6 + rnd2.y * 1.8), (rnd.z - .5) * 6.);
        p.x += sin(floor(uT * 3.) * .7 + rnd2.z * 6.) * .15;
        vA = uVis * sin(ph * 3.14159) * step(.35, fract(rnd2.w * 7. + floor(uT * 3.) * .37)); // twinkle on threes
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); gl_PointSize = (2.2 + 3. * rnd2.y) * uHs * step(.01, vA);
      }`,
    fs: `varying float vA; void main() { vec2 q = abs(gl_PointCoord - .5) * 2.; if (q.x + q.y > 1. || vA < .01) discard;
      gl_FragColor = vec4(pow(vec3(1., .702, .278), vec3(2.2)) * 1.4, vA); }`,
  });
  const glowPts = new THREE.Points(glowG, glowM); glowPts.frustumCulled = false; glowPts.renderOrder = 10;
  group.add(glowPts);

  // ---- heat shimmer: flat ink wave lines along the beam line (f221-288). The UV warp of a post pass is not reachable
  //      from a layer; this is the flat-ink version of it: pale refraction lines, 1.2 m band. ---------------------------------
  const shimFs = /* glsl */ `
    uniform float uK; uniform float uTime; varying float vX; varying float vV; varying float vU;
    void main() {
      float v = vV;
      float wave = sin(vX * 2.1 - uTime * 5. + vn(vec2(vX * .6, uTime)) * 4.) * .08;
      float line = 0.;
      for (int i = 0; i < 4; i++) { float c = -.7 + float(i) * .47 + wave * (1. + float(i) * .3);
        line = max(line, 1. - smoothstep(.015, .05, abs(v - c))); }
      float seg = step(.45, vn(vec2(vX * .9 + floor(uTime * 12.) * .3, v * 2.)));
      float a = line * seg * (1. - smoothstep(.55, 1., abs(v))) * uK * .45;
      if (a < .005) discard;
      gl_FragColor = vec4(vec3(.78, .9, 1.), a);
    }`;
  const shim = strip(THREE, sh, geo, shimFs, { uK: { value: 0 }, uTime: { value: 0 } }, { cone: 1, tip: 3, order: 7 });
  group.add(shim);

  // ---- river reflection: a gold band under the beam, flat bands that wobble (appears at the shot, strongest in shot 7) ----------
  const riverGeo = new THREE.PlaneGeometry(1, 1); riverGeo.rotateX(-Math.PI / 2);
  const riverM = mat(THREE, {
    u: { uK: { value: 0 }, uTime: { value: 0 }, uHead: { value: 10 } },
    vs: `uniform float uHead; varying vec2 vP; void main() { vP = vec2(position.x + .5, position.z * 2.);
      vec3 w = vec3(position.x * uHead + 0., 0., position.z * 3.); gl_Position = projectionMatrix * viewMatrix * vec4(w + vec3(uHead * .5, 0., 0.) + (modelMatrix * vec4(0., 0., 0., 1.)).xyz, 1.); }`,
    fs: `uniform float uK; uniform float uTime; varying vec2 vP;
      float h(float p) { return fract(sin(p * 91.3) * 43758.5); }
      void main() {
        float v = vP.y; float band = floor((abs(v) + .06 * sin(vP.x * 14. + uTime * 3.)) * 7.);
        float on = step(band, 2.5) * step(.28, h(band + floor(vP.x * 26. + uTime * 4.) * .37));
        float a = on * uK * (1. - smoothstep(.0, 1., abs(v)) * .6) * (1. - vP.x * .5);
        if (a < .01) discard;
        vec3 c = band < 1. ? vec3(1., .824, .227) : vec3(1., .702, .278);
        gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.1, a * .85);
      }`,
  });
  const river = new THREE.Mesh(riverGeo, riverM); river.frustumCulled = false; river.renderOrder = 2; river.visible = false;
  group.add(river);

  // ---- the 0.22 flash + two-tone burst behind the seal on the shot ---------------------------------------------------------------
  const flashFs = `uniform float uK; varying vec2 vUv; varying vec2 vSealNdc; varying float vAsp; uniform vec3 uCol;
    void main() { if (uK < .004) discard; vec2 p = (vUv - vSealNdc) * vec2(vAsp, 1.);
      float rad = 1. - smoothstep(.2, 1.9, length(p)) * .35;
      gl_FragColor = vec4(uCol * 1.4, uK * rad); }`;
  const flash = billboard(THREE, sh, flashFs, { uK: { value: 0 }, uCol: { value: C("#fff6d6") } }, { full: true, push: 0.5, order: 1 });
  group.add(flash);

  const state = { traumaFired: false, lastT: -1 };
  function update(t, dt, cue) {
    const ts = cue.ts, t0 = T.shot, hs = T.hitStop;
    muzzleOf(ctx.seal, muzzle);
    sh.sync();
    const step = Math.floor(ts * 12);
    // the shot's stateful camera kick: fires once per forward crossing of the shot, resets when scrubbed back
    if (cue.t < t0 - 0.05) state.traumaFired = false;
    else if (!state.traumaFired && cue.t >= t0) { state.traumaFired = true; ctx.sakuga.trauma(0.7); }

    // beam
    const age = ts - t0;
    const alive = age >= 0 && age < 58 / 24 + 0.05;
    const env = clamp01(age / (4 / 24)) * (1 - sstep(37 / 24, 58 / 24, age));
    const D = L.handD;
    const head = age < hs ? D : Math.min(46, D + 55 * (age - hs));
    for (const m of [outline, body]) {
      m.visible = alive && env > 0.01;
      const u = m.userData.u;
      u.uOrigin.value.copy(muzzle); u.uLen.value = Math.max(0.05, head); u.uR.value = 0.62 * env;
    }
    if (alive) {
      beamU.uSeed.value = step; beamU.uTime.value = age; beamU.uHit.value = age < hs ? 1 : 0;
      const ib = ts >= 6.9 && ts < 7.2;
      beamU.uCancel.value = ib ? 1 : 0; beamU.uCancelX.value.set(D + 0.1, D + 1.1);
      beamU.uHdr.value = age < 0.3 ? 1 + 0.35 * (1 - age / 0.3) : 1; // 1.6 core on the strike, settling to 1.0
    }
    // Imagine Breaker star at the hand
    {
      const k = ts >= 6.9 && ts < 7.2 ? (ts - 6.9) / 0.3 : (age >= 0 && age < hs ? 0.4 : -1);
      star.visible = k >= 0;
      if (k >= 0) { const u = star.userData.u; u.uK.value = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6 * 0.5; u.uCenter.value.set(muzzle.x + D, muzzle.y, muzzle.z); u.uSize.value.set(1.1, 1.1); u.uRot.value = 0.3; }
    }
    // flares
    {
      const hk = alive && head < 46 ? env * (1 - sstep(37 / 24, 58 / 24, age)) : 0;
      headFlare.visible = hk > 0.02;
      if (headFlare.visible) { headFlare.userData.u.uCenter.value.set(muzzle.x + head, muzzle.y, muzzle.z); headFlare.userData.u.uK.value = hk * 0.3 / 0.3; }
      const mk = age >= 0 && age < 0.45 ? 1 - age / 0.45 : 0;
      muzzFlare.visible = mk > 0.01;
      if (muzzFlare.visible) { muzzFlare.userData.u.uCenter.value.copy(muzzle); muzzFlare.userData.u.uK.value = mk; muzzFlare.userData.u.uRot.value = 0; }
    }
    // sonic ring: 10 frames on twos
    {
      const k = age >= 0 ? clamp01(age / (10 / 24)) : -1, life = age >= 0 && age < 16 / 24;
      sonic.visible = life;
      if (life) {
        const kk = Math.floor(k * 5) / 5; // on twos: 5 poses over 10 frames
        const R = 0.6 + 3.4 * (1 - (1 - kk) ** 2), u = sonic.userData.u;
        u.uCenter.value.copy(muzzle); u.uR.value = R; u.uSizeM.value = 4.6; u.uSize.value.set(4.6, 4.6); u.uK.value = clamp01((age - 8 / 24) / (8 / 24));
      }
    }
    // sparks
    {
      const a = age - hs;
      bits.p.visible = a > -0.05 && a < 1.7;
      bits.u.uT.value = Math.max(-1, a); bits.u.uMuz.value.copy(muzzle); bits.u.uHead0.value = D;
      wake.p.visible = age > -0.05 && age < 1.2; wake.u.uT.value = age; wake.u.uMuz.value.copy(muzzle);
    }
    // flash quad f163-170, 0.22
    {
      const k = age >= 0 && age < 7 / 24 ? 1 - age / (7 / 24) : 0;
      flash.visible = k > 0; flash.userData.u.uK.value = 0.22 * (k > 0.5 ? 1 : k * 2);
    }
    // shimmer f221-288 along the beam line
    {
      const s0 = 221 / 24, s1 = 288 / 24, k = ts >= s0 && ts < s1 ? 1 - sstep(s0 + 1, s1, ts) : 0;
      shim.visible = k > 0.01;
      const u = shim.userData.u; u.uOrigin.value.set(muzzle.x + 1.5, muzzle.y + 0.1, muzzle.z); u.uLen.value = 26; u.uR.value = 0.6; u.uK.value = k; u.uTime.value = ts;
    }
    // river reflection
    {
      const k = ts >= t0 ? clamp01((ts - t0) / 0.12) * (1 - 0.55 * sstep(t0 + 1, T.afterglow + 0.5, ts)) * (1 - sstep(T.proof + 1.5, T.face, ts)) : 0;
      river.visible = k > 0.01;
      if (river.visible) {
        river.position.set(muzzle.x, L.riverY, muzzle.z); river.scale.set(1, 1, 1);
        riverM.uniforms.uK.value = k; riverM.uniforms.uTime.value = ts; riverM.uniforms.uHead.value = Math.min(40, Math.max(6, head));
      }
    }
    // afterglow sparks: in over 1 s from the afterglow beat, gone by the credit's end
    {
      const vis = sstep(T.afterglow, T.afterglow + 1, ts) * (1 - sstep(T.wipe - 0.6, T.wipe, ts));
      glowPts.visible = vis > 0.01; glowU.uVis.value = vis; glowU.uT.value = ts; ctx.seal.chest(tmp); glowU.uC.value.set(tmp.x + 1.5, L.deckY, tmp.z);
    }
    void dt;
  }
  function dispose() {
    geo.dispose(); for (const m of [outline, body, shim]) m.material.dispose();
    for (const o of [star, headFlare, muzzFlare, sonic, flash]) { o.geometry.dispose(); o.material.dispose(); }
    for (const s of [bits, wake]) { s.g.dispose(); s.m.dispose(); }
    glowG.dispose(); glowM.dispose(); riverGeo.dispose(); riverM.dispose();
  }
  return { group, update, dispose };
}
