// FX layer for pr-mujoco-warp-1541 (Dragon Ball Z, Frieza: "this isn't even my final form"). Layer 1.
// Bible section 6, built whole:
//   power-up aura (14 outlined flame tongues, 4-drawing cycle on twos, violet -> gold) + halo glow
//   lightning-fork (5 outlined forked bolts, f110-f168)             -> bolts.js
//   flash + 4-point star + ring + shock dome rim + ground fissure star (5 arms) + ink ring
//   shard-burst (28 shell shards, 2-tone, outlined, 4 streaks) and debris-lift (16 rocks, lift then fly)
//   sky violet shift (multiply, zenith weighted), horizon / canopy / seal 4-point sparkles
// Impact frames, speed lines, warp shock and trauma are RESERVED beats owned by scene.js (not drawn here).
// The seal is never touched: no emission, every card is pushed BEHIND it and depth-tested, bolts are flattened behind its plane.
// Every effect is a pure function of the stepped clock t, so scrubbing == playing. Cues read (all optional, see timeline.js):
//   crouch aura lightning rocks crack slide inkring skyshift skyout forest sealglow
import { BB_VERT, FLAME_FRAG, FLARE_FRAG, RING_FRAG, DOME_VERT, DOME_FRAG, GROUND_FRAG, CHUNK_VERT, CHUNK_FRAG, SPARK_VERT, SPARK_FRAG, SKY_VERT, SKY_FRAG } from "./shaders.js";
import { resolve, power, blow, sstep, kin } from "./timeline.js";
import { makeBolts } from "./bolts.js";

export default function build(ctx) {
  const { THREE, seal, scene } = ctx;
  const { Vector3: V3, Vector2: V2, Color } = THREE;
  const group = new THREE.Group();
  const disposables = [];
  const hex = (h) => new Color(h);
  const own = (o) => { disposables.push(o); return o; };
  const easeOut = (u) => 1 - (1 - u) * (1 - u);

  // ---------- billboard factory -----------------------------------------------------------------------
  const planeGeo = own(new THREE.PlaneGeometry(1, 1));
  function bb(frag, extra, blending, order, sph) {
    const u = { uOrigin: { value: new V3() }, uSize: { value: new V2(1, 1) }, uOff: { value: new V2() }, uBack: { value: 0 }, uSph: { value: sph ? 1 : 0 }, uRot: { value: 0 }, ...extra };
    const mat = own(new THREE.ShaderMaterial({ vertexShader: BB_VERT, fragmentShader: frag, uniforms: u, transparent: true, depthWrite: false, blending, side: THREE.DoubleSide, toneMapped: false }));
    const mesh = new THREE.Mesh(planeGeo, mat); mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
    group.add(mesh); return { mesh, u };
  }

  // ---------- 1. aura flames: 7 per side ----------------------------------------------------------------
  const VIOLET = { c0: hex("#fffbe0"), c1: hex("#c590f0"), c2: hex("#a469e0"), out: hex("#4a2878") };
  const GOLD = { c0: hex("#fffbe0"), c1: hex("#ffd84a"), c2: hex("#f2b01e"), out: hex("#b8741a") };
  const flames = [];
  for (let i = 0; i < 14; i++) {
    flames.push(bb(FLAME_FRAG, { uPhase: { value: 0 }, uSeed: { value: i * 0.37 + ((i & 1) ? 3.3 : 0.3) }, uAlpha: { value: 1 }, uC0: { value: new Color() }, uC1: { value: new Color() }, uC2: { value: new Color() }, uOut: { value: new Color() } }, THREE.NormalBlending, 2 + (6 - (i >> 1)) * 0.01, false));
  }
  const halo = bb(FLARE_FRAG, { uCol: { value: new Color() }, uCore: { value: hex("#fffbe0") }, uGlow: { value: 0 }, uStar: { value: 0 }, uA: { value: 1 } }, THREE.AdditiveBlending, 1, true);
  const star = bb(FLARE_FRAG, { uCol: { value: hex("#ffd84a") }, uCore: { value: hex("#fffbe0") }, uGlow: { value: 0.5 }, uStar: { value: 1 }, uA: { value: 1 } }, THREE.AdditiveBlending, 3, true);
  const ring = bb(RING_FRAG, { uCol: { value: hex("#ffd9c8") }, uOutline: { value: hex("#4a2878") }, uR: { value: 0.1 }, uW: { value: 0.03 }, uA: { value: 1 } }, THREE.NormalBlending, 3.5, true);

  // ---------- 2. lightning ------------------------------------------------------------------------------
  const bolts = makeBolts(ctx); group.add(bolts.group);

  // ---------- 3. dome rim + ground decals ---------------------------------------------------------------
  const domeGeo = own(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2));
  const domeMat = own(new THREE.ShaderMaterial({ vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, uniforms: { uCol: { value: hex("#fff3c2") }, uA: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
  const dome = new THREE.Mesh(domeGeo, domeMat); dome.frustumCulled = false; dome.renderOrder = 4; dome.visible = false; group.add(dome);

  function groundDecal(sizeM, mode) {
    const u = { uMode: { value: mode }, uReach: { value: 0 }, uA: { value: 1 }, uR: { value: 0.1 }, uW: { value: 0.04 } };
    const mat = own(new THREE.ShaderMaterial({ vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }", fragmentShader: GROUND_FRAG, uniforms: u, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false, side: THREE.DoubleSide }));
    const m = new THREE.Mesh(planeGeo, mat); m.rotation.x = -Math.PI / 2; m.scale.set(sizeM, sizeM, 1);
    m.frustumCulled = false; m.renderOrder = 1; m.visible = false; group.add(m); return { mesh: m, u };
  }
  const crack = groundDecal(8.2, 0);   // reach 4 m
  const ink = groundDecal(6.0, 1);     // r 0.3 -> 2.7 m

  // ---------- 4. chunks: shell shards + ground rocks -----------------------------------------------------
  function chunkSet(geo0, n, colors, shadow, hullCol, hullW) {
    const geo = own(geo0.clone());
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const c = colors[i % colors.length]; col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute("aCol", new THREE.InstancedBufferAttribute(col, 3));
    const sun = new V3(0.7, 0.6, 0.3).normalize();
    const mk = (hull, side) => own(new THREE.ShaderMaterial({ vertexShader: CHUNK_VERT, fragmentShader: CHUNK_FRAG, side, toneMapped: false, uniforms: { uHull: { value: hull }, uHullW: { value: hullW }, uSun: { value: sun }, uShadow: { value: shadow }, uHullCol: { value: hex(hullCol) } } }));
    const mesh = new THREE.InstancedMesh(geo, mk(0, THREE.FrontSide), n);
    const hull = new THREE.InstancedMesh(geo, mk(1, THREE.BackSide), n);
    hull.instanceMatrix = mesh.instanceMatrix;
    for (const m of [mesh, hull]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.renderOrder = 5; group.add(m); }
    return { mesh, hull };
  }
  const NS = 28, NR = 16;
  const shardSet = chunkSet(new THREE.OctahedronGeometry(1, 0), NS, [hex("#ff7a6b"), hex("#fbfaf7"), hex("#ffa285")], new V3(0.62, 0.45, 0.66), "#5a1620", 0.012);
  const rockSet = chunkSet(new THREE.IcosahedronGeometry(1, 0), NR, [hex("#3fb8c0")], new V3(0.44, 0.55, 0.61), "#103a4a", 0.014);
  const streakMat = own(new THREE.MeshBasicMaterial({ color: new Color(1.3, 1.28, 1.2), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
  const streakGeo = own(new THREE.BoxGeometry(1, 1, 1));
  const streaks = new THREE.InstancedMesh(streakGeo, streakMat, 4); streaks.frustumCulled = false; streaks.renderOrder = 6; group.add(streaks);

  // deterministic per-chunk parameters
  const rs = ctx.rng(5), rr = ctx.rng(15);
  const shards = Array.from({ length: NS }, (_, i) => ({
    size: i < 4 ? 0.26 + rs() * 0.04 : 0.12 + rs() * 0.1, az: rs() * 6.2832, up: 2.6 * (0.7 + rs() * 0.5), sp: 4.4 * (0.6 + rs() * 0.5),
    ax: new V3(rs() - 0.5, rs() - 0.5, rs() - 0.5).normalize(), spin: 4 + rs() * 8, r0: 0.9 + rs() * 0.2,
  }));
  const rocks = Array.from({ length: NR }, (_, i) => {
    const az = rr() * 6.2832, rad = 1.3 + rr() * 1.5;
    return { size: i < 10 ? 0.1 + rr() * 0.12 : 0.3 + rr() * 0.2, az, rad, t0: i * 0.1 + rr() * 0.15, vo: 3.5 + rr() * 1.5, vu: 2.2 + rr() * 1.2,
      ax: new V3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize(), spin: 2 + rr() * 5, late: i >= 8 };
  });

  // seal ground position at time tt, from the scene data (pure function of the clock)
  const sd = scene.seal || { at: [0, 0, 0], moves: [] };
  function sealAt(tt, out) {
    out.set(sd.at[0], sd.at[1], sd.at[2]);
    for (const m of sd.moves || []) {
      if (tt >= m.t[1]) out.set(m.to[0], m.to[1], m.to[2]);
      else if (tt > m.t[0]) { const k = (tt - m.t[0]) / (m.t[1] - m.t[0]), k2 = k * k * (3 - 2 * k); out.set(out.x + (m.to[0] - out.x) * k2, out.y + (m.to[1] - out.y) * k2, out.z + (m.to[2] - out.z) * k2); break; }
    }
    return out;
  }

  // ---------- 5. sparkles -------------------------------------------------------------------------------
  function sparkSet(n, place, colHex, coreHex) {
    const g = own(new THREE.BufferGeometry());
    const pos = new Float32Array(n * 3), seed = new Float32Array(n), size = new Float32Array(n);
    place(pos, seed, size);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    const u = { uH: { value: 800 }, uTw: { value: 0 }, uShow: { value: 0 }, uCol: { value: hex(colHex) }, uCore: { value: hex(coreHex) } };
    const m = own(new THREE.ShaderMaterial({ vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, uniforms: u, transparent: true, depthWrite: false, toneMapped: false }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 8; pts.visible = false; group.add(pts);
    return { pts, u, pos, g };
  }
  const rsp = ctx.rng(77);
  const horizon = sparkSet(48, (p, s, z) => { for (let i = 0; i < 48; i++) { const a = rsp() * 6.2832; p.set([Math.cos(a) * 70, 3 + rsp() * 12, Math.sin(a) * 70], i * 3); s[i] = rsp(); z[i] = 0.5 + rsp() * 0.6; } }, "#fff3c2", "#ffffff");
  const canopy = sparkSet(26, (p, s, z) => { for (let i = 0; i < 26; i++) { p.set([-1.9 + rsp() * 5.6, 0.5 + rsp() * 0.75, -4.3 + rsp() * 5.2], i * 3); s[i] = rsp(); z[i] = 0.08 + rsp() * 0.08; } }, "#ffd84a", "#fffbe0");
  const sealSp = sparkSet(14, (p, s, z) => { for (let i = 0; i < 14; i++) { s[i] = rsp(); z[i] = 0.06 + rsp() * 0.04; } }, "#ffd84a", "#fffbe0");
  const sealSpA = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * 6.2832 + rsp(), r: 0.8 + rsp() * 0.5, h: (rsp() - 0.3) * 0.9, sp: 0.15 + rsp() * 0.2 }));

  // ---------- 6. sky violet shift -------------------------------------------------------------------------
  const skyGeo = own(new THREE.SphereGeometry(1, 24, 16));
  const skyMat = own(new THREE.ShaderMaterial({
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: { uAmt: { value: 0 }, uTint: { value: hex("#7a3fb8") } },
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, blendEquation: THREE.AddEquation,
  }));
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.scale.setScalar(300); sky.frustumCulled = false; sky.renderOrder = -10; sky.visible = false; group.add(sky);

  // ---------- scratch -----------------------------------------------------------------------------------
  const chest = new V3(), O = new V3(), P = new V3(), Vv = new V3(), fw = new V3();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sc = new V3();
  const G = 6, ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const setInst = (set, i, pos, quat, scl) => { M.compose(pos, quat, scl); set.mesh.setMatrixAt(i, M); };
  const hide = (set, i) => set.mesh.setMatrixAt(i, ZERO);

  function update(t, dt, cue) {
    const T = resolve(cue);
    const S = seal.scale, at = seal.at;
    seal.chest(chest);
    const p = power(t, T), bl = blow(t, T);
    const gold = t >= T.crack;
    const pal = gold ? GOLD : VIOLET;
    const rate = (t >= T.speed && t < T.crack) ? 8 : 12;           // threes hold at the peak (f144-f168)
    const tw = Math.floor(t * rate);

    // --- aura flames
    const pw = Math.pow(p, 0.8) * bl;
    const endFade = 1 - 0.35 * sstep(T.end - 1, T.end + 1, t);
    for (let i = 0; i < 14; i++) {
      const f = flames[i], k = i >> 1, side = (i & 1) ? 1 : -1;
      f.mesh.visible = p > 0.001;
      if (!f.mesh.visible) continue;
      const H = (2.3 - 0.9 * k / 6) * S * Math.max(0.05, pw) * endFade, W = (0.34 + 0.06 * (6 - k) / 6) * S;
      f.u.uOrigin.value.set(at[0], at[1], at[2]);
      f.u.uSize.value.set(W, H);
      f.u.uOff.value.set(side * (0.06 + 0.075 * k) * S, H * 0.5);
      f.u.uBack.value = (0.55 + 0.04 * k) * S;
      f.u.uPhase.value = (tw + i) % 4;
      f.u.uC0.value.copy(pal.c0); f.u.uC1.value.copy(pal.c1); f.u.uC2.value.copy(pal.c2); f.u.uOut.value.copy(pal.out);
    }

    // --- halo glow (flash glow 0.4*power before the crack; burst 1.2 -> 0 over f168-f180; gold afterwards)
    const kc = kin(t, T.crack, T.crack + 0.5);
    {
      const burst = t >= T.crack ? 1.2 * (1 - kc) : 0;
      const g = 0.4 * p * (t < T.crack ? 1 : 0.8) + burst + (gold ? 0.25 : 0);
      halo.mesh.visible = g > 0.01;
      halo.u.uOrigin.value.copy(chest);
      const sz = (2.2 + 3 * (t >= T.crack ? easeOut(kc) : 0) + 1.4 * p) * S;
      halo.u.uSize.value.set(sz, sz); halo.u.uBack.value = 0.9 * S;
      halo.u.uGlow.value = g; halo.u.uCol.value.copy(gold ? GOLD.c1 : VIOLET.c1);
    }
    // --- 4-point star flare on the crack (f168-f192), gold bloom
    {
      const ks = kin(t, T.crack, T.crack + 1.0);
      star.mesh.visible = t >= T.crack && ks < 1;
      star.u.uOrigin.value.copy(chest);
      const sz = 6.5 * (0.35 + 0.65 * easeOut(Math.min(1, ks * 3))) * S * (1 - 0.4 * ks);
      star.u.uSize.value.set(sz, sz); star.u.uBack.value = 0.9 * S;
      star.u.uStar.value = 1 - sstep(0.15, 1, ks); star.u.uGlow.value = 0.6 * (1 - ks);
    }
    // --- ring (#ffd9c8): r 0.6 -> 4.2 m over f168-f180
    {
      ring.mesh.visible = t >= T.crack && kc < 1.2;
      const Q8 = 9.6, r = 0.6 + 3.6 * easeOut(Math.min(1, kc));
      ring.u.uOrigin.value.copy(chest); ring.u.uSize.value.set(Q8, Q8); ring.u.uBack.value = 0.9 * S;
      ring.u.uR.value = r / (Q8 / 2); ring.u.uW.value = 0.07 / (Q8 / 2) + 0.012 * (1 - kc); ring.u.uA.value = 0.9 * (1 - sstep(0.7, 1.2, kc));
    }
    // --- shock dome rim, 12 f out then fades to f192
    {
      const kd = kin(t, T.crack, T.crack + 1.0);
      dome.visible = t >= T.crack && kd < 1;
      const r = 0.3 + 4.2 * easeOut(kin(t, T.crack, T.crack + 0.5));
      dome.position.set(at[0], at[1], at[2]); dome.scale.setScalar(r);
      domeMat.uniforms.uA.value = (1 - sstep(0.4, 1, kd)) * 0.9;
    }

    // --- lightning: visible while power > .35 until the crack; 3 bolts, 5 from f144
    bolts.update(chest, S, (p > 0.35 && t >= T.lightning && t < T.crack) ? (t >= T.speed ? 5 : 3) : 0, tw);

    // --- ground fissure star (5 arms), f170-f180 spread, fades f216-f240
    {
      sealAt(T.crack, O);
      crack.mesh.position.set(O.x, O.y + 0.02, O.z);
      crack.u.uReach.value = easeOut(kin(t, T.crack + 0.04, T.crack + 0.5));
      crack.u.uA.value = 1 - sstep(T.skyout, T.skyout + 1.0, t);
      crack.mesh.visible = t >= T.crack + 0.04 && crack.u.uA.value > 0.001;
    }
    // --- ground ink ring, f204-f220 (r 0.3 -> 2.7 m), cream with ink outline
    {
      const ki = kin(t, T.inkring, T.inkring + 16 / 24);
      ink.mesh.visible = t >= T.inkring && t < T.inkring + 1.3;
      ink.mesh.position.set(at[0], at[1] + 0.03, at[2]);
      ink.u.uR.value = (0.3 + 2.4 * easeOut(ki)) / 3.0; ink.u.uW.value = 0.1 / 3.0;
      ink.u.uA.value = 1 - sstep(0.7, 1.3, (t - T.inkring) / 1.0);
    }

    // --- shell shards: burst at the crack, 4.4 m/s out, 2.6 up, g 6, 1.3 s
    {
      const d = t - T.crack, live = d >= 0 && d <= 1.35;
      sealAt(T.crack, O); O.y += 0.4 * S;
      for (let i = 0; i < NS; i++) {
        const s = shards[i];
        if (!live) { hide(shardSet, i); if (i < 4) streaks.setMatrixAt(i, ZERO); continue; }
        const hx = Math.cos(s.az), hz = Math.sin(s.az);
        P.set(O.x + hx * (s.r0 * S + s.sp * d * 0.6), O.y + s.up * d - 0.5 * G * d * d, O.z + hz * (s.r0 * S + s.sp * d * 0.6));
        const gy = O.y - 0.4 * S + s.size * 0.5;
        if (P.y < gy) P.y = gy;
        Q.setFromAxisAngle(s.ax, s.spin * Math.min(d, 0.95));
        const shrink = 1 - sstep(1.05, 1.35, d);
        Sc.set(s.size * 0.55, s.size, s.size * 0.3).multiplyScalar(shrink * S * 0.9);
        setInst(shardSet, i, P, Q, Sc);
        if (i < 4) {   // speed streak trailing the four largest shards
          Vv.set(hx * s.sp * 0.6, s.up - G * d, hz * s.sp * 0.6);
          const sp = Vv.length() + 1e-4, len = Math.min(1.0, 0.18 * sp) * (1 - kin(d, 0.2, 1.0));
          const dirv = Vv.clone().multiplyScalar(1 / sp);
          const c = P.clone().addScaledVector(dirv, -len * 0.5);
          Q.setFromUnitVectors(new V3(1, 0, 0), dirv);
          M.compose(c, Q, new V3(Math.max(len, 1e-4), 0.018, 0.018)); streaks.setMatrixAt(i, M);
        }
      }
      shardSet.mesh.instanceMatrix.needsUpdate = true; streaks.instanceMatrix.needsUpdate = true;
    }
    // --- debris-lift rocks: rise .3 m/s from f110; eight fly out at the crack, eight at the slide (f180)
    {
      for (let i = 0; i < NR; i++) {
        const r = rocks[i], t0 = T.rocks + r.t0, tl = r.late ? T.slide : T.crack;
        if (t < t0 || t > tl + 1.9) { hide(rockSet, i); continue; }
        sealAt(t0, O);
        const lift = (tt) => Math.min(0.9, 0.3 * (tt - t0)) + 0.04 * Math.sin(tt * 5 + i);
        const hx = Math.cos(r.az), hz = Math.sin(r.az);
        P.set(O.x + hx * r.rad * S, O.y, O.z + hz * r.rad * S);
        let scl = r.size * sstep(t0, t0 + 0.25, t), spinT = t - t0;
        if (t < tl) P.y += lift(t);
        else {
          const d = t - tl;
          P.x += hx * r.vo * d; P.z += hz * r.vo * d; P.y += lift(tl) + r.vu * d - 0.5 * G * d * d;
          scl *= 1 - sstep(1.5, 1.9, d); spinT = (tl - t0) + d * 2;
          if (P.y < O.y + r.size * 0.5) P.y = O.y + r.size * 0.5;
        }
        Q.setFromAxisAngle(r.ax, r.spin * spinT * 0.35);
        Sc.set(scl, scl * 0.8, scl * 0.9);
        setInst(rockSet, i, P, Q, Sc);
      }
      rockSet.mesh.instanceMatrix.needsUpdate = true;
    }

    // --- sky violet shift (multiply): in f96-f168, out f216-f270
    {
      const amt = sstep(T.skyshift, T.skyshift + 3, t) * (1 - sstep(T.skyout, T.skyout + 54 / 24, t));
      sky.visible = amt > 0.003; skyMat.uniforms.uAmt.value = amt;
      sky.position.copy(ctx.player.camera.position);
    }

    // --- sparkles (horizon throughout, canopy from the forest, seal glow at home)
    const H = ctx.engine.renderer ? ctx.engine.renderer.domElement.height : 800;
    const twk = Math.floor(t * 12);
    for (const s of [horizon, canopy, sealSp]) { s.u.uH.value = H; s.u.uTw.value = twk; }
    horizon.u.uShow.value = 0.65; horizon.pts.visible = true;
    {
      const sh = sstep(T.forest, T.forest + 0.8, t);
      canopy.u.uShow.value = sh; canopy.pts.visible = sh > 0.01;
    }
    {
      const sh = sstep(T.sealglow, T.sealglow + 0.6, t) * (1 - sstep(T.end, T.end + 0.5, t));
      sealSp.u.uShow.value = sh; sealSp.pts.visible = sh > 0.01;
      if (sh > 0.01) {
        ctx.player.camera.getWorldDirection(fw);
        for (let i = 0; i < 14; i++) {
          const a = sealSpA[i], ang = a.a + twk * a.sp * 0.08;
          P.set(Math.cos(ang) * a.r * S, a.h * S + ((twk * a.sp * 0.05) % 0.5), Math.sin(ang) * a.r * S);
          const al = P.dot(fw); if (al < 0.12 * S) P.addScaledVector(fw, 0.12 * S - al);   // behind the seal's plane
          P.add(chest);
          sealSp.pos[i * 3] = P.x; sealSp.pos[i * 3 + 1] = P.y; sealSp.pos[i * 3 + 2] = P.z;
        }
        sealSp.g.attributes.position.needsUpdate = true;
      }
    }
  }

  function dispose() {
    bolts.dispose();
    for (const o of disposables) o.dispose && o.dispose();
    for (const m of [shardSet.mesh, shardSet.hull, rockSet.mesh, rockSet.hull, streaks]) m.dispose && m.dispose();
  }
  return { group, update, dispose };
}
