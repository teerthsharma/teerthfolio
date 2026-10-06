// MUDA barrage (bible FX "MUDA fan"): fist afterimages, spark per landing, MUDA lettering, fissures in the coral edge.
//
// Fist fan (pure function of the stepped clock):
//   S = ceil(dur * fps) steps; step s holds n_s = floor(124 (s+1)/S) - floor(124 s/S) fists, so the volley is EXACTLY
//   124 fists (easter egg: the PR number 124410). Each step draws its own n_s fists plus the previous step's (ghosts,
//   tinted toward the panel violet): 12-20 visible, re-randomised every step (twos).
//   fist id f = s*64 + k:   landing P_f = T + right*lat_f*0.8 + up*vert_f*0.8 ;  lat = (h-.5)*3.4, vert = (h-.5)*2.6
//                           position  = O + (P_f - O) * u_f,  u_f = .30 + .70 h   (the afterimage stands along the flight)
//   orientation: +z of the fist looks along (P_f - O); forearm cylinder trails behind (Stand arm, grey-green).
//   Seal exclusion (L: seal never covered): in the first draw hook each fist nearer the lens than the seal whose NDC
//   position lies inside the seal's screen ellipse (rx = ry/aspect, ry = projected half-height * 0.62) is slid along the
//   camera's right vector until it leaves the ellipse by 25 %.
// Spark per landing: a 4-point star + ink ring, additive, 2 drawings (step parity), at P_f of the current step.
// Fissures: 6 jagged rays  d_i=(cos a_i, sin a_i), jag(t)=(vnoise(9t, i)-.5)*.22*(.3+t); distance |n - jag|, grows with
//   reach = k*.95 and tapers; coral #ff6a5a core, ink outline, hot centre. Trembles on twos.
import { clamp01, sstep, hash, beatOf, celPair, billboard, letter, GLSL_UTIL } from "./common.js";

const FISTS = 124;

const SPARK_FRAG = /* glsl */ `
  varying vec2 vUv; uniform vec3 uCol, uInk; uniform float uA, uVar;
  // star: four spikes  s = |x||y| scaled; ring at r = .62; drawing B rotates 45 deg and swaps spike count.
  void main(){ vec2 p = (vUv - .5) * 2.; float c = cos(.785 * uVar), s = sin(.785 * uVar); p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
    float r = length(p);
    float star = (abs(p.x) * abs(p.y)) / (0.018 + 0.05 * (1. - r)) ;
    float spike = smoothstep(1.0, 0.0, star) * smoothstep(1.0, 0.1, r);
    float ring = smoothstep(.07, .0, abs(r - .62)) * (1. - uVar * .4);
    float core = smoothstep(.22, .12, r);
    float a = max(max(spike, ring), core) * uA;
    vec3 col = mix(uCol, vec3(1.0, .98, .85), core);
    gl_FragColor = vec4(col, a); }`;

const CRACK_FRAG = /* glsl */ `
  varying vec2 vUv; uniform float uK, uA, uSeed; uniform vec3 uCore, uInk;
  ${GLSL_UTIL}
  void main(){ vec2 p = (vUv - .5) * 2.; float best = 1., tt = 0.;
    for (int i = 0; i < 6; i++){ float fi = float(i); float a = fi * 1.047 + (h21(vec2(fi, uSeed)) - .5) * .6; vec2 d = vec2(cos(a), sin(a)), nn = vec2(-d.y, d.x);
      float t = dot(p, d), n = dot(p, nn); float reach = uK * .95;
      float jag = (vnoise(vec2(t * 9., fi + uSeed)) - .5) * .22 * (.3 + t) + (vnoise(vec2(t * 23., fi)) - .5) * .05;
      float w = .035 * (1. - clamp(t / max(reach, .01), 0., 1.) * .7);
      float dist = (abs(n - jag) - w) + step(reach, t) * 1.0 + step(t, 0.) * (0. - t);
      if (dist < best) { best = dist; tt = t; } }
    float core = smoothstep(.006, -.004, best), inkM = smoothstep(.026, .014, best);
    vec3 col = mix(uInk, uCore, core); col = mix(col, vec3(1., .94, .75), smoothstep(.0, -.03, best) * .6 * (1. - tt));
    gl_FragColor = vec4(col, inkM * uA); }`;

export default function muda(ctx, sh) {
  const { THREE } = ctx;
  const { frame, stage, atlas, fps } = sh;
  const group = new THREE.Group();
  const V = THREE.Vector3;

  // ---- fists + arms (two instanced cel pairs; fists cream plates, arms grey-green) ----
  const NMAX = 40;
  const fistGeo = new THREE.SphereGeometry(0.5, 14, 10);
  const armGeo = new THREE.CylinderGeometry(0.3, 0.42, 1, 10); armGeo.rotateX(Math.PI / 2); armGeo.translate(0, 0, -0.62);
  const fist = celPair(ctx, fistGeo, { lit: "#f6e8b0", mid: "#e8d49a", shade: "#b8742a", ink: "#05020a", instances: NMAX, order: 131, px: 0.0042 });
  const arm = celPair(ctx, armGeo, { lit: "#8fa28f", mid: "#7a8a7a", shade: "#4a5a5a", ink: "#05020a", instances: NMAX, order: 129, px: 0.0036 });
  group.add(fist.hull, fist.body, arm.hull, arm.body);
  // knuckle bar: a second small instanced box row is skipped (the hull + plates read as the cel fist at this size)

  // ---- sparks (pool of 12) ----
  const sparks = [];
  for (let i = 0; i < 12; i++) {
    const b = billboard(ctx, { frag: SPARK_FRAG, blending: THREE.AdditiveBlending, order: 150, uniforms: { uCol: { value: new THREE.Color("#ffe14a") }, uInk: { value: new THREE.Color("#05020a") }, uA: { value: 1 }, uVar: { value: 0 } } });
    group.add(b.mesh); sparks.push(b);
  }
  // ---- fissures at the edge ----
  const crack = billboard(ctx, { frag: CRACK_FRAG, order: 145, uniforms: { uK: { value: 0 }, uA: { value: 1 }, uSeed: { value: 3 }, uCore: { value: new THREE.Color("#ff6a5a") }, uInk: { value: new THREE.Color("#05020a") } } });
  group.add(crack.mesh);
  // ---- MUDA lettering pool ----
  const words = [];
  for (let i = 0; i < 4; i++) { const l = letter(ctx, atlas, 165); group.add(l.mesh); words.push(l); }
  const SLOTS = [[-0.66, 0.42, 0.26], [0.66, 0.36, -0.3], [-0.72, -0.2, -0.22], [0.7, -0.26, 0.3], [-0.52, 0.0, 0.1], [0.52, 0.06, -0.12]];

  // scratch
  const O = new V(), T = new V(), P = new V(), D = new V(), Q = new THREE.Quaternion(), M = new THREE.Matrix4(), S = new V(), up = new V(0, 1, 0);
  const cam = { chest: new V(), p: new V() };
  let cur = null; // the fist list computed in update(), consumed by the draw hook
  const slots = []; for (let i = 0; i < NMAX; i++) slots.push({ pos: new V(), dir: new V(), s: 1, ghost: 0, ok: false });

  // draw hook on the first-drawn mesh (arm hull, order 128): project, exclude the seal, write both matrices
  arm.hull.onBeforeRender = (r, sc, camera) => {
    if (!cur) return;
    ctx.seal.chest(cam.chest);
    const sealView = cam.chest.clone().applyMatrix4(camera.matrixWorldInverse);
    const depthSeal = -sealView.z;
    const top = cam.chest.clone().add(new V(0, 0.5 * (ctx.seal.height || 0.8) * (ctx.seal.scale || 1), 0));
    const n0 = cam.chest.clone().project(camera), n1 = top.project(camera);
    const ry = Math.abs(n1.y - n0.y) * 1.25 + 0.04, rx = ry / ctx.aspect() * 1.3;
    const camR = new V(camera.matrixWorld.elements[0], camera.matrixWorld.elements[1], camera.matrixWorld.elements[2]);
    const p00 = camera.projectionMatrix.elements[0];
    for (let i = 0; i < cur.n; i++) {
      const sl = slots[i]; P.copy(sl.pos);
      const v = P.clone().applyMatrix4(camera.matrixWorldInverse), dep = -v.z;
      if (dep > 0.2 && dep < depthSeal + 0.6) {
        const nd = P.clone().project(camera), dx = nd.x - n0.x, dy = nd.y - n0.y;
        if ((dx / rx) * (dx / rx) + (dy / ry) * (dy / ry) < 1.56) {
          const sgn = dx >= 0 ? 1 : -1, need = (rx * 1.25 - Math.abs(dx)) * dep / p00;
          P.addScaledVector(camR, sgn * Math.max(0, need));
        }
      }
      Q.setFromUnitVectors(new V(0, 0, 1), sl.dir);
      S.setScalar(sl.s); M.compose(P, Q, S);
      fist.body.setMatrixAt(i, M); arm.body.setMatrixAt(i, M);
      fist.geo.attributes.aGhost.array[i] = sl.ghost; arm.geo.attributes.aGhost.array[i] = sl.ghost;
    }
    for (const m of [fist.body, arm.body]) { m.instanceMatrix.needsUpdate = true; m.geometry.attributes.aGhost.needsUpdate = true; }
    fist.hull.instanceMatrix.needsUpdate = true; arm.hull.instanceMatrix.needsUpdate = true;
  };

  function update(t) {
    frame.update();
    const b = beatOf(ctx, "muda"), drown = beatOf(ctx, "drown");
    const k = (t - b.t) / b.dur;
    const sc = ctx.seal.scale || 1;
    // stage points (seal-local; beat args override): O the Stand's shoulders, T the coral edge
    const ta = b.args.target || stage.edge, oa = b.args.origin || stage.standShoulder;
    frame.L(oa[0], oa[1], oa[2], O); frame.L(ta[0], ta[1], ta[2], T);
    const hide = () => { fist.body.visible = fist.hull.visible = arm.body.visible = arm.hull.visible = false; for (const s of sparks) s.mesh.visible = false; for (const w of words) w.hide(); };
    // fissures live from the first landings until the edge falls
    const cStart = b.t + 0.15, cEnd = drown.t + 0.1;
    if (t >= cStart && t < cEnd) {
      const kk = clamp01((t - cStart) / (b.dur * 1.1));
      const tremble = ((Math.floor(t * fps) & 1) ? 1 : -1) * 0.02 * (1 - kk);
      crack.mesh.visible = true; crack.u.uOrigin.value.copy(T).addScaledVector(frame.right, tremble * 10);
      const fz = (stage.fissureSize || 7) * sc; crack.u.uSize.value.set(fz, fz); crack.u.uK.value = kk; crack.u.uA.value = 1 - sstep(cEnd - 0.4, cEnd, t);
    } else crack.mesh.visible = false;

    if (k < 0 || k >= 1) { hide(); cur = null; fist.body.visible = fist.hull.visible = arm.body.visible = arm.hull.visible = false; return; }
    fist.body.visible = fist.hull.visible = arm.body.visible = arm.hull.visible = true;
    const S_ = Math.max(1, Math.ceil(b.dur * fps)), s = Math.min(S_ - 1, Math.floor(k * S_));
    const count = (st) => Math.floor(FISTS * (st + 1) / S_) - Math.floor(FISTS * st / S_);
    let n = 0, landed = 0;
    for (const [st, ghost] of [[s, 0], [s - 1, 1]]) {
      if (st < 0) continue;
      const c = count(st);
      for (let j = 0; j < c && n < NMAX; j++, n++) {
        const id = st * 64 + j, sl = slots[n];
        const lat = (hash(id * 1.3 + 0.5) - 0.5) * 3.4, vert = (hash(id * 2.1 + 1.7) - 0.5) * 2.6, u = 0.3 + 0.7 * hash(id * 3.7 + 2.2);
        P.copy(T).addScaledVector(frame.right, lat * 0.8 * sc).addScaledVector(up, vert * 0.8 * sc);
        D.copy(P).sub(O); const len = D.length(); D.divideScalar(len || 1);
        sl.dir.copy(D); sl.pos.copy(O).addScaledVector(D, len * u); sl.s = 0.6 * sc * (0.85 + 0.3 * hash(id * 5.1)); sl.ghost = ghost;
        if (!ghost && landed < sparks.length && u > 0.55) {
          const sp = sparks[landed++], sz = (1.0 + 0.9 * hash(id * 7.3)) * sc * ((s & 1) ? 0.8 : 1.15);
          sp.mesh.visible = true; sp.u.uOrigin.value.copy(P); sp.u.uSize.value.set(sz, sz); sp.u.uRot.value = hash(id) * 6.28; sp.u.uVar.value = s & 1; sp.u.uA.value = 1;
        }
      }
    }
    for (let i = landed; i < sparks.length; i++) sparks[i].mesh.visible = false;
    cur = { n }; fist.body.count = fist.hull.count = arm.body.count = arm.hull.count = n;
    // MUDA lettering: 3 slots per step, re-picked each step (twos), at the screen margins, off the seal
    for (let i = 0; i < words.length; i++) {
      if (i >= 3) { words[i].hide(); continue; }
      const sl = SLOTS[Math.floor(hash(s * 3.3 + i * 11.1) * SLOTS.length)];
      const h = 0.5 + 0.28 * hash(s + i * 4.4), pop = 0.82 + 0.18 * sstep(0, 0.25, (k * S_) % 1 + 0.2);
      words[i].show("MUDA", sl[0], sl[1] + (hash(s * 1.9 + i) - 0.5) * 0.1, h * pop, sl[2] + (hash(s * 2.7 + i) - 0.5) * 0.2, 1, 2.0);
    }
  }
  function dispose() {
    fistGeo.dispose(); armGeo.dispose(); fist.geo.dispose(); arm.geo.dispose();
    for (const o of [fist.body, fist.hull, arm.body, arm.hull]) o.material.dispose();
    for (const s of sparks) { s.mat.dispose(); s.mesh.geometry.dispose(); }
    crack.mat.dispose(); crack.mesh.geometry.dispose();
    for (const w of words) { w.mesh.material.dispose(); w.mesh.geometry.dispose(); }
  }
  return { group, update, dispose };
}
