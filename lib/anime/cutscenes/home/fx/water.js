// FX 2 + 4(ripples) + 16/3.16: WAKE, RINGS, RAIN RIPPLES, THE VINLAND SUN-GLINT, THE ORCA'S TILT SMEAR.
//
// RINGS (one instanced draw). Each instance: (x, z, birth, life) + (maxR, kind, bright, seed).
//     age = (t - birth) / life,  R = maxR * (1 - (1 - age)^2)        ease-out growth
//     line  = 1 - smoothstep(0.5 w, w, | |p| - R |),  w = 1.5 * fwidth(|p|)    a constant 1.5 px line at any distance (uPx)
//     alpha = 0.55 * line * (1 - age)^1.3                               white #e8f4f6 at 55% fading
//     kind 1  the bloop: three concentric lines at R, 0.74 R, 0.5 R
//     kind 2  the blade glint: a bright arc (+-0.25 rad) on the ring, the only "sword" the dimension draws (egg 2)
// A ring every 10 frames (0.4167 s) is born under the surfaced orca; 90 rain ripples after the first drops.
//
// WAKE: two triangle arms (V) behind the orca's nose, 0.16 m wide tapering to a point, hard dashes
//     dash = step(0.18, fract(v * 6 - t * 1.5)),  alpha = 0.8 (1 - v)^0.7 dash,   #f2f6f6
//
// SUN-GLINT: a trapezoid on the water from the pup toward Vinland (gold #ffd37a). Rows of height h(z) = 0.8 + 0.02 |z|
//     each row owns a random dash: centre c = (h21 - .5) * .5, half-length l = .08 + .22 h21', hard-edged, twos shimmer,
//     reveal = smoothstep over 1.2 s from the Vinland beat, far fade by distance. Luma <= 0.86 (never blooms).
//
// SMEAR: a 2-frame white crescent billboard on the orca's tilt-up (f257): arc of radius .78, thickness .16 sin(taper).
import * as S from "./shared.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const C = S.clock(ctx.scene);
  const rng = ctx.rng(7711);
  const orca = {};

  // ================= rings =================
  const ringList = [];
  const push = (x, z, birth, life, maxR, kind, bright, seed) => ringList.push([x, z, birth, life, maxR, kind, bright, seed]);
  // under the orca: one ring per 10 frames while it breaks the surface
  const ORCA_STEP = 10 / 24;
  for (let tt = S.TRK.rise[0]; tt < S.TRK.sink[1]; tt += ORCA_STEP) {
    S.orcaAt(tt, orca);
    if (orca.surf > 0.25) push(orca.x, orca.z, tt, 1.5, 1.5 + 0.5 * rng(), 0, 1, 0);
  }
  // the spy-hop splash and the bloop
  push(3.7, 0.45, 10.75, 1.2, 1.9, 0, 1, 0);
  push(3.55, 0.55, C.bloop, 1.6, 2.2, 1, 1, 0);          // three concentric lines on the bloop
  push(3.55, 0.55, C.bloop - 0.04, 1.35, 1.7, 2, 1, 0.9); // the blade glint on the sinking ring (egg 2)
  // rain ripples on the open water, never on the planks
  const r0 = C.rain[0] + 0.2;
  for (let i = 0; i < 90; i++) {
    let x = 0, z = 0;
    for (let k = 0; k < 6; k++) {
      x = -7 + 12 * rng(); z = -6 + 12 * rng();
      const onJetty = x > S.JETTY.x0 - 0.2 && x < S.JETTY.x1 + 0.2 && Math.abs(z) < S.JETTY.w * 0.5 + 0.2;
      const onLand = x < -5.5;
      if (!onJetty && !onLand) break;
    }
    push(x, z, r0 + (C.end - r0) * (i / 90) + 0.25 * rng(), 0.7, 0.3 + 0.3 * rng(), 0, 0.8, 0);
  }
  const NR = ringList.length;
  const aRing = new Float32Array(NR * 4), aShape = new Float32Array(NR * 4);
  ringList.forEach((r, i) => { aRing.set(r.slice(0, 4), i * 4); aShape.set(r.slice(4), i * 4); });
  const rg = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2));
  rg.setAttribute("aRing", new THREE.InstancedBufferAttribute(aRing, 4));
  rg.setAttribute("aShape", new THREE.InstancedBufferAttribute(aShape, 4));
  rg.instanceCount = NR;
  const ringMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uT: { value: 0 }, uWY: { value: S.WATER_Y + 0.04 } },
    vertexShader: /* glsl */ `
      attribute vec4 aRing; attribute vec4 aShape; uniform float uT, uWY;
      varying vec2 vL; varying float vAge, vR, vKind, vBright, vSeed;
      void main() {
        float age = (uT - aRing.z) / aRing.w;
        float on = step(0.0, age) * step(age, 1.0);
        float ca = clamp(age, 0.0, 1.0);
        float R = aShape.x * (1.0 - (1.0 - ca) * (1.0 - ca));
        float hf = (R + 0.15) * on + 1e-4;
        vL = position.xz * hf;
        vAge = age; vR = R; vKind = aShape.y; vBright = aShape.z; vSeed = aShape.w;
        gl_Position = projectionMatrix * viewMatrix * vec4(aRing.x + vL.x, uWY, aRing.y + vL.y, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vL; varying float vAge, vR, vKind, vBright, vSeed;
      void main() {
        if (vAge < 0.0 || vAge > 1.0) discard;
        float d = length(vL);
        float aa = fwidth(d) + 1e-5;
        float w = 1.5 * aa;
        float line = 1.0 - smoothstep(0.5 * w, w, abs(d - vR));
        if (vKind > 0.5 && vKind < 1.5) {
          line = max(line, 1.0 - smoothstep(0.5 * w, w, abs(d - vR * 0.74)));
          line = max(line, 1.0 - smoothstep(0.5 * w, w, abs(d - vR * 0.5)));
        }
        float fade = pow(1.0 - clamp(vAge, 0.0, 1.0), 1.3);
        float a = 0.55 * line * fade * vBright;
        if (vKind > 1.5) {
          float w2 = 2.6 * aa;
          float l2 = 1.0 - smoothstep(0.5 * w2, w2, abs(d - vR));
          float da = abs(mod(atan(vL.y, vL.x) - vSeed + 3.14159265, 6.2831853) - 3.14159265);
          a = l2 * (1.0 - smoothstep(0.2, 0.3, da)) * fade * 0.95;
        }
        gl_FragColor = vec4(vec3(0.91, 0.957, 0.965), a);
      }`,
  });
  const rings = new THREE.Mesh(rg, ringMat);
  rings.frustumCulled = false; rings.renderOrder = 6;
  group.add(rings);

  // ================= wake arms =================
  const wv = [], wuv = [];
  const L = 4.5, ang = 0.36;
  for (const s of [-1, 1]) {
    const hx = 0, hz = -0.1, ex = s * L * Math.sin(ang), ez = -L * Math.cos(ang);
    const px = Math.cos(ang) * 0.08, pz = s * Math.sin(ang) * 0.08; // perpendicular to the arm (head width 0.16)
    wv.push(hx - px, 0, hz - pz, hx + px, 0, hz + pz, ex, 0, ez); wuv.push(0, 0, 0, 1, 1, 1);
  }
  const wgeo = new THREE.BufferGeometry();
  wgeo.setAttribute("position", new THREE.Float32BufferAttribute(wv, 3));
  wgeo.setAttribute("aV", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 1));
  const wakeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: "attribute float aV; varying float vV; void main(){ vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uT, uA; varying float vV;
      void main() {
        float dash = step(0.18, fract(vV * 6.0 - uT * 1.5));
        gl_FragColor = vec4(0.949, 0.965, 0.965, 0.8 * pow(max(1.0 - vV, 0.0), 0.7) * dash * uA);
      }`,
  });
  const wake = new THREE.Mesh(wgeo, wakeMat);
  wake.frustumCulled = false; wake.renderOrder = 5; wake.visible = false;
  group.add(wake);

  // ================= the Vinland sun-glint =================
  const gMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    uniforms: { uT: { value: 0 }, uReveal: { value: 0 }, uWY: { value: S.WATER_Y + 0.03 }, uZ0: { value: -14 }, uZ1: { value: -158 }, uX1: { value: S.VIN.x } },
    vertexShader: /* glsl */ `
      uniform float uWY, uZ0, uZ1, uX1;
      varying vec2 vW; varying float vU;
      void main() {
        float v = position.y + 0.5;                       // 0 near .. 1 far
        float z = mix(uZ0, uZ1, v);
        float hw = 1.4 + 0.045 * abs(z);                  // the strip widens with distance so it reads in the wide
        float cx = mix(0.0, uX1, v);
        vU = position.x * 2.0;
        vW = vec2(cx + vU * hw, z);
        gl_Position = projectionMatrix * viewMatrix * vec4(vW.x, uWY, vW.y, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uReveal;
      varying vec2 vW; varying float vU;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float z = abs(vW.y);
        float rh = 0.8 + 0.02 * z;                         // row height grows with distance
        float row = floor(z / rh);
        float tw = floor(uT * 12.0);                       // twos shimmer: dashes re-seed per step
        float s1 = h21(vec2(row, tw * 0.37)), s2 = h21(vec2(row + 41.0, tw * 0.37));
        float hw = 1.4 + 0.045 * z;
        float cu = (s1 - 0.5) * 0.55, hl = 0.07 + 0.24 * s2;
        float rowv = fract(z / rh);
        float inRow = step(0.22, rowv) * step(rowv, 0.62 + 0.2 * s2);
        float aa = fwidth(vU) + 1e-4;
        float dash = (1.0 - smoothstep(hl - aa, hl + aa, abs(vU - cu))) * inRow;
        float taper = 1.0 - smoothstep(0.55, 1.0, abs(vU));
        float farF = 1.0 - smoothstep(110.0, 158.0, z) * 0.55;
        float rev = smoothstep(0.0, 1.0, uReveal - (z - 14.0) / 160.0 * 0.6);  // the line runs out toward Vinland
        float a = dash * taper * farF * rev * 0.9;
        gl_FragColor = vec4(1.0, 0.827, 0.478, a);          // #ffd37a, luma ~0.86: never blooms
      }`,
  });
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), gMat);
  glint.frustumCulled = false; glint.renderOrder = 4; glint.visible = false;
  group.add(glint);

  // ================= orca tilt smear (2 frames) =================
  const smearMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOn: { value: 0 }, uC: { value: new THREE.Vector3(3.7, 0.15, 0.45) }, uSz: { value: 2.6 } },
    vertexShader: /* glsl */ `
      uniform vec3 uC; uniform float uSz; varying vec2 vP;
      ${S.GLSL_BILL}
      void main() {
        vP = position.xy * 2.0;
        vec3 w = uC + (camRight() * position.x + camUp() * position.y) * uSz;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOn; varying vec2 vP;
      void main() {
        float r = length(vP), a = atan(vP.y, vP.x);          // arc swept from -2.1 to -0.25 rad (the nose throwing upward)
        float u = clamp((a + 2.1) / 1.85, 0.0, 1.0);
        float inArc = step(-2.1, a) * step(a, -0.25);
        float th = 0.16 * sin(3.14159 * u);                  // crescent: thick mid, pointed ends
        float aa = fwidth(r) + 1e-4;
        float band = 1.0 - smoothstep(th - aa, th + aa, abs(r - 0.78));
        gl_FragColor = vec4(0.969, 0.953, 0.918, band * inArc * 0.85 * uOn);
      }`,
  });
  const smear = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), smearMat);
  smear.frustumCulled = false; smear.renderOrder = 8; smear.visible = false;
  group.add(smear);

  return {
    group,
    update(t) {
      ringMat.uniforms.uT.value = t;
      // wake follows the nose (home.jsx:324)
      S.orcaAt(t, orca);
      wake.visible = orca.surf > 0.15 && t < S.TRK.sink[0] + 0.2;
      if (wake.visible) {
        wake.position.set(orca.x + Math.sin(orca.yaw) * 1.3, S.WATER_Y + 0.05, orca.z + Math.cos(orca.yaw) * 1.3);
        wake.rotation.y = orca.yaw;
        wakeMat.uniforms.uT.value = t; wakeMat.uniforms.uA.value = orca.surf;
      }
      // glint
      const rev = S.sm(C.vinland, C.vinland + 1.2, t);
      glint.visible = rev > 0.001;
      if (glint.visible) {
        gMat.uniforms.uT.value = t; gMat.uniforms.uReveal.value = rev * 1.6;
        glint.scale.set(1, 1, 1);
      }
      // smear: the two frames at f257
      const sm = t >= C.smear && t < C.smear + 2 / 24;
      smear.visible = sm; smearMat.uniforms.uOn.value = sm ? 1 : 0;
      if (sm) smearMat.uniforms.uC.value.set(orca.x, Math.max(orca.y + 0.7, S.WATER_Y + 0.4), orca.z);
    },
    dispose() { rg.dispose(); ringMat.dispose(); wgeo.dispose(); wakeMat.dispose(); glint.geometry.dispose(); gMat.dispose(); smear.geometry.dispose(); smearMat.dispose(); },
  };
}
