// Golden-hour light of the Class D room: window glow, god-ray shafts, floor patches, dust motes, petals, bokeh.
// Bible E7, E8, section 6 (Window glow, God-ray shafts, Petals).
//
// Maths
//   shaft sheet   uv.x runs along the beam, uv.y across it. Two crisp bands (no volumetric noise):
//                   core  = 1 - step(w_c, |y - c|)         weight 0.28, colour #fff0b8
//                   halo  = 1 - step(w_h, |y - c|)         weight 0.14, colour #ffc766
//                 where the band centre c slides  c = .5 + .10 sin(0.35 t)  (0.35 rad/s, on twos because t is stepped).
//                 Both fade along the beam with smoothstep so the ends never show an edge.
//   floor patch   a parallelogram: x' = u + 0.35 (v - .5) (shear from the low sun), cut by a mullion cross at
//                 |x' - .5| < .018 and |v - .5| < .025, edge band 0.012 wide in #d9a05e (the darker ink edge).
//   motes         p_i(t) = p_i0 + 0.05 t (cos a_i, 0.5 sin a_i, 0.3 sin(1.7 a_i)) m, wrapped inside the shaft box.
//   petals        p(t) = p0 + wind t, wind = (0.8..1.7, -0.12, 0) m/s, wrapped in a 10 x 3 x 8 m box;
//                 spin w t (1..2 rad/s); the 2-tone split is the diagonal u + v < 1 (colour vs shade #e98ea4).
//   bokeh         a disc d = 0.5..0.9 m placed at depth z_i in front of the lens at an NDC position with |ndc| > .6,
//                 drifting on twos; alpha 0.55, no line, soft rim: a = .55 (1 - smoothstep(.82, 1, r)) (1 - .25 r).
import * as THREE from "three";
import { mat, hash, sstep, lerp, prog, boardK } from "./lib.js";

const AddB = THREE.AdditiveBlending;

export default function light(ctx, U, T, L, frame) {
  const grp = new THREE.Group();
  const rng = ctx.rng("pl-light");
  const own = [];
  const keep = (x) => { own.push(x); return x; };

  // ---------- window glow: glass blow-out cards on the west wall, +-4% breathing ----------
  const glowGeo = keep(new THREE.PlaneGeometry(2.4, 3.0));
  const glowMat = keep(mat(U, /* glsl */ `
    uniform float uK;
    void main(){
      vec2 q = vUv * 2. - 1.;
      // glass: bright core, wall bleed halo (colour-dodge-like additive: #fff4c8 core into #ffd98a halo)
      float r = max(abs(q.x) * .9, abs(q.y) * .8);
      float core = 1. - smoothstep(.55, .78, r);
      float halo = exp(-r * r * 1.7);
      vec3 c = mix(vec3(1., .85, .54), vec3(1., .96, .78), core);
      float a = (core * .55 + halo * .22) * uK * keepClear(vW);
      gl_FragColor = vec4(c, a);
    }`, { uK: { value: 0.8 } }, { blend: AddB }));
  const glows = L.windows.map((z) => {
    const m = new THREE.Mesh(glowGeo, glowMat);
    m.position.set(L.windowX + 0.05, 1.9, z); m.rotation.y = Math.PI / 2; m.renderOrder = 2;
    grp.add(m); return m;
  });

  // ---------- god-ray shafts: 6 sheets (3 windows x 2), 8.4 m along x, -1.55 m drop ----------
  const shaftGeo = keep(new THREE.PlaneGeometry(8.4, 1.1));
  const shaftMat = keep(mat(U, /* glsl */ `
    uniform float uK; uniform float uSlide;
    void main(){
      float c = .5 + .10 * sin(uSlide);                    // the band centre slides (0.35 rad/s, stepped)
      float y = abs(vUv.y - c);
      float core = 1. - step(.075, y), halo = 1. - step(.21, y);
      float along = smoothstep(0., .12, vUv.x) * (1. - smoothstep(.55, 1., vUv.x));
      vec3 col = vec3(1., .94, .72) * core * .28 + vec3(1., .78, .40) * halo * .14;
      float a = along * keepClear(vW);
      gl_FragColor = vec4(col * uK * a, 1.);
    }`, { uK: { value: 1 }, uSlide: { value: 0 } }, { blend: AddB }));
  const slope = Math.atan(1.55 / 8.4);
  const shafts = [];
  L.windows.forEach((z, wi) => {
    for (let s = 0; s < 2; s++) {
      const m = new THREE.Mesh(shaftGeo, shaftMat);
      // starts at the glass (x = windowX), falls 1.55 m toward the room
      m.position.set(L.windowX + 4.2, 2.3 + s * 0.65 - 0.78, z + (s ? 0.35 : -0.25));
      m.rotation.z = -slope; m.renderOrder = 1;
      grp.add(m); shafts.push(m);
    }
  });

  // ---------- floor patches: 3 window shapes 6.3 x 3 m with mullion cutouts ----------
  const patchGeo = keep(new THREE.PlaneGeometry(6.3, 3));
  patchGeo.rotateX(-Math.PI / 2);
  const patchMat = keep(mat(U, /* glsl */ `
    uniform float uK;
    void main(){
      vec2 uv = vUv;
      float x = uv.x + .35 * (uv.y - .5);                  // sheared by the low sun
      float inside = step(.0, x) * step(x, 1.) * step(.0, uv.y) * step(uv.y, 1.);
      float cross = step(abs(x - .5), .018) + step(abs(uv.y - .5), .025);
      float lit = inside * (1. - clamp(cross, 0., 1.));
      float edge = inside * (1. - smoothstep(.0, .012, min(min(x, 1. - x), min(uv.y, 1. - uv.y)))) * (1. - clamp(cross, 0., 1.));
      vec3 col = mix(vec3(1., .90, .63), vec3(.85, .63, .37), edge);   // #ffe6a0 core, #d9a05e edge
      float a = (lit * .20 + edge * .30) * uK * keepClear(vW);
      gl_FragColor = vec4(col, a);
    }`, { uK: { value: 1 } }));
  const patches = [];
  L.windows.forEach((z, i) => {
    const m = new THREE.Mesh(patchGeo, patchMat);
    m.position.set(L.windowX + 4.6, 0.014, z + 0.5); m.renderOrder = 0;
    patches.push(m); grp.add(m);
  });

  // ---------- dust motes: 8 per shaft, 0.012 m, #fff6d6, drift 0.05 m/s on twos ----------
  const NM = 48;
  const mGeo = keep(new THREE.BufferGeometry());
  const mp = new Float32Array(NM * 3), mSize = new Float32Array(NM), mBase = [];
  for (let i = 0; i < NM; i++) {
    const sh = shafts[i % shafts.length];
    mBase.push([sh.position.x + (rng() - 0.5) * 6, sh.position.y + (rng() - 0.5) * 0.9, sh.position.z + (rng() - 0.5) * 0.9, rng() * 6.28]);
    mSize[i] = 0.7 + rng() * 0.8;
  }
  mGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  mGeo.setAttribute("aSize", new THREE.BufferAttribute(mSize, 1));
  const motes = new THREE.Points(mGeo, keep(mat(U, /* glsl */ `
    uniform float uK;
    void main(){
      vec2 q = gl_PointCoord * 2. - 1.;
      float a = (1. - smoothstep(.55, 1., length(q))) * uK * keepClear(vW);
      gl_FragColor = vec4(1., .965, .84, a * .9);
    }`, { uK: { value: 1 }, uSize: { value: 0.03 } }, { points: true, blend: AddB })));
  motes.frustumCulled = false; motes.renderOrder = 3; grp.add(motes);

  // ---------- petals: 96 mid-ground, 2-tone, wind from the windows ----------
  const NP = 96;
  const pGeo = keep(new THREE.PlaneGeometry(0.2, 0.13));
  const tone = new Float32Array(NP);
  for (let i = 0; i < NP; i++) tone[i] = i % 3 === 2 ? 1 : 0; // 1 in 3 are the pale #ffe3ea
  pGeo.setAttribute("aTone", new THREE.InstancedBufferAttribute(tone, 1));
  const petalMat = keep(mat(U, /* glsl */ `
    void main(){
      float split = step(vUv.x + vUv.y, 1.0);                          // diagonal 2-tone cut
      vec3 body = mix(vec3(1., .706, .784), vec3(1., .89, .918), vTone);
      vec3 shade = vec3(.914, .557, .643);
      vec2 q = vUv * 2. - 1.;
      float shape = 1. - smoothstep(.78, 1., length(q * vec2(.95, 1.25)));  // a leaf, not a card
      float a = shape * keepClear(vW);
      gl_FragColor = vec4(mix(shade, body, split), a);
    }`, {}, { tone: true }));
  const petals = new THREE.InstancedMesh(pGeo, petalMat, NP);
  petals.frustumCulled = false; petals.renderOrder = 4; grp.add(petals);
  const P = [];
  for (let i = 0; i < NP; i++) P.push({ p: [(rng() - 0.5) * 10, 0.4 + rng() * 2.8, (rng() - 0.5) * 8], w: 0.8 + rng() * 0.9, sp: 1 + rng() * 1, ph: rng() * 6.28, ax: [rng() - 0.5, rng() - 0.5, rng() - 0.5] });
  const dm = new THREE.Object3D();

  // ---------- bokeh: 14 near-camera discs 0.5-0.9 m, alpha 0.55, no line ----------
  const NB = 14;
  const bGeo = keep(new THREE.PlaneGeometry(1, 1));
  const bokehMat = keep(mat(U, /* glsl */ `
    uniform float uK;
    void main(){
      vec2 q = vUv * 2. - 1.; float r = length(q);
      float a = .55 * (1. - smoothstep(.82, 1., r)) * (1. - .25 * r) * uK;
      gl_FragColor = vec4(mix(vec3(1., .706, .784), vec3(1., .89, .918), step(.0, q.x)) , a * keepClear(vW));
    }`, { uK: { value: 0 } }, {}));
  const bokeh = [];
  for (let i = 0; i < NB; i++) {
    const m = new THREE.Mesh(bGeo, bokehMat); m.renderOrder = 6; m.frustumCulled = false; grp.add(m);
    const ang = rng() * 6.283, rad = 0.62 + rng() * 0.3;           // |ndc| > .6: the periphery, away from the seal
    bokeh.push({ m, ndc: [Math.cos(ang) * rad, Math.sin(ang) * rad * 0.8], z: 1.2 + rng() * 1.2, d: 0.5 + rng() * 0.4, ph: rng() * 6.28 });
  }
  const cq = new THREE.Vector3(), cd = new THREE.Vector3();

  function update(t, dt, cue) {
    const bk = boardK(T, t);                              // the chess overlay veils the room
    const breathe = 1 + 0.04 * Math.sin(t * 1.3);
    const bell = Math.exp(-Math.max(0, t - T.bell.t) * 4) * (t >= T.bell.t ? 1 : 0);
    const k = (1 - 0.85 * bk);
    glowMat.uniforms.uK.value = 0.8 * breathe * k * (1 + 0.5 * bell);
    shaftMat.uniforms.uK.value = k;
    shaftMat.uniforms.uSlide.value = 0.35 * t;   // 0.35 rad/s stripes, held on twos by the stepped t
    patchMat.uniforms.uK.value = k;
    motes.material.uniforms.uK.value = 0.9 * k;
    // motes drift on twos
    for (let i = 0; i < NM; i++) {
      const b = mBase[i];
      mp[i * 3] = b[0] + 0.05 * t * Math.cos(b[3]);
      mp[i * 3 + 1] = b[1] + 0.025 * t * Math.sin(b[3]) + 0.02 * Math.sin(t * 0.9 + b[3] * 3);
      mp[i * 3 + 2] = b[2] + 0.015 * t * Math.sin(b[3] * 1.7);
    }
    mGeo.attributes.position.needsUpdate = true;
    // petals
    for (let i = 0; i < NP; i++) {
      const q = P[i];
      const x = ((q.p[0] + 5 + q.w * t) % 10 + 10) % 10 - 5;
      const y = q.p[1] - 0.12 * ((t * 0.9 + q.ph) % 8) + 0.12 * Math.sin(t * 1.4 + q.ph);
      const yy = ((y % 3.2) + 3.2) % 3.2;
      dm.position.set(x, yy, q.p[2] + 0.35 * Math.sin(t * 0.7 + q.ph));
      dm.rotation.set(q.ax[0] * t * q.sp, q.ax[1] * t * q.sp, q.sp * t + q.ph);
      dm.updateMatrix(); petals.setMatrixAt(i, dm.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    // bokeh: only on the wide / home framing, the periphery of the lens, display-rate camera follow
    const cam = ctx.player?.camera;
    const on = cue.law === "wide" || cue.law === "home" ? 1 : 0;
    bokehMat.uniforms.uK.value = on * (1 - bk);
    if (cam) {
      const tan = Math.tan((cam.fov * Math.PI) / 360), asp = cam.aspect ?? 1.6;
      for (const b of bokeh) {
        const ts = Math.floor(cue.t * 12) / 12;
        const nx = b.ndc[0] + 0.03 * Math.sin(ts * 0.5 + b.ph), ny = b.ndc[1] + 0.02 * Math.cos(ts * 0.45 + b.ph);
        cq.set(nx * tan * asp * b.z, ny * tan * b.z, -b.z).applyQuaternion(cam.quaternion).add(cam.position);
        // bokeh live in WORLD space; the frame group is not their parent
        b.m.parent.worldToLocal(cq);
        b.m.position.copy(cq); b.m.quaternion.copy(cam.quaternion);
        const inv = frame.group.quaternion.clone().invert(); b.m.quaternion.premultiply(inv);
        b.m.scale.setScalar(b.d / (frame.group.scale.x || 1));
      }
    }
  }
  return { group: grp, update, dispose() { own.forEach((x) => x.dispose?.()); petals.dispose(); } };
}
