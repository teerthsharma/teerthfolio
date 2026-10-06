// THE REST OF THE FX BIBLE for pr-topograph-432, every piece on FX timing (twos) and flat cartoon colour with a black outline.
//   gems      7 four-point stars at the canonical gem colours on the staff head, 2 frames on / 4 off (period 6 frames @24), phase staggered; 24 more roam the circle.
//   slam      stars (28) burst on ballistic arcs, floor crack (9 jagged ribbons, 3-frame reveal), white-gold floor shock ring (0.5 s), dust ring.
//   walls     two 3 m x 6 m purple force slabs rising in 12 frames; flat 2 band (lit #b46bff above 35 percent, shadow #34205f below), gold rim, ink hull.
//   lashes    three crimson tube whips (6 px ~ r .08 m): snap out in 3 frames, 1 held, retract in 3; black hull + #ff8a8a core; a crescent smear at each hit.
//   break     the span breaks: 36 stone shards on ballistic arcs (x0.4 slow motion at gravity 9.8) with ink hulls, and 30 ink-rimmed dust puffs.
//   motes     140 hall dust motes drifting (pale gold, on twos).
// MATHS  ballistic: p(tau) = p0 + v tau + (0,-g/2,0) tau^2 with tau = 0.4 * (t - t_break) (slow motion).  Star burst: v = 5 (cos a, 1.2 + h, sin a), a = 2 pi i / 28 + h.
//   crack ribbon i: polyline of 6 jittered points along angle a_i = 2 pi i / 9 + .25 h, length 2.2 + 2.8 h m, ribbon half-width .045 (black) / .02 (gold).
import { BoxGeometry, BufferAttribute, BufferGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, InstancedMesh, Object3D,
  QuadraticBezierCurve3, RingGeometry, ShaderMaterial, TubeGeometry, Vector3, BackSide } from "three";
import { PAL, clamp, easeOut3, easeInOut, since, col, makePoints, localTo } from "./lib.js";

export function buildBits(ctx) {
  const { THREE, seal } = ctx;
  const rng = ctx.rng("topo-bits");
  const group = new Group();           // seal-local pivot (yaw, scale, full position): staff gems follow the seal's fly
  const floor = new Group();           // floor pivot: xz follows the seal, y stays on the floor
  group.add(floor);
  const floorY = seal.at[1];
  const tmp = [0, 0, 0];

  // ---- gems + roaming sparkles (additive) ------------------------------------------------------------------------------------------------
  const spark = makePoints(7 + 24, { shape: 0, additive: true, alpha: 1 });
  const sparkRoam = [...Array(24)].map(() => ({ a: rng() * 6.28, r: 2 + rng() * 5.5, y: 0.3 + rng() * 5, ph: Math.floor(rng() * 6), c: rng() < 0.5 ? PAL.white : PAL.hi, s: 0.18 + rng() * 0.16 }));

  // ---- slam stars (ink-rimmed) ------------------------------------------------------------------------------------------------------------
  const NS = 28;
  const stars = makePoints(NS, { shape: 0, additive: false, ink: true });
  const starV = [...Array(NS)].map((_, i) => { const a = (i / NS) * 6.283 + rng() * 0.3; return { vx: Math.cos(a) * (3 + 3 * rng()), vy: 3 + 4 * rng(), vz: Math.sin(a) * (3 + 3 * rng()), c: [PAL.goldLit, PAL.white, PAL.crimson, PAL.purple, PAL.hi][i % 5], s: 0.3 + 0.35 * rng() }; });

  // ---- floor crack (ribbons) --------------------------------------------------------------------------------------------------------------
  const NC = 9, SEG = 6;
  const crackMk = (hw, y, color, order) => {
    const rng = ctx.rng("topo-crack"); // same seed for both ribbons: ink and gold share the polylines
    const pos = new Float32Array(NC * SEG * 4 * 3), idx = [];
    for (let i = 0; i < NC; i++) {
      const a = (i / NC) * Math.PI * 2 + 0.25 * rng(), len = 2.2 + 2.8 * rng();
      let px = 0, pz = 0;
      for (let s = 0; s < SEG; s++) {
        const a2 = a + (rng() - 0.5) * 0.9, step = len / SEG;
        const nx = px + Math.cos(a2) * step, nz = pz + Math.sin(a2) * step;
        const dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1, ox = (-dz / l) * hw, oz = (dx / l) * hw;
        const b = (i * SEG + s) * 4 * 3;
        pos.set([px + ox, y, pz + oz, px - ox, y, pz - oz, nx + ox, y, nz + oz, nx - ox, y, nz - oz], b);
        const v = (i * SEG + s) * 4; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
        px = nx; pz = nz;
      }
    }
    const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new Mesh(g, new MeshBasicMaterial({ color, side: DoubleSide, depthWrite: false })); m.renderOrder = order; m.frustumCulled = false;
    return m;
  };
  const crackInk = crackMk(0.06, 0.04, PAL.deep, 4);
  const crackGoldSafe = crackMk(0.022, 0.05, PAL.goldLit, 5);
  const crackPivot = new Group(); crackPivot.position.set(0.35, 0, 0.5); crackPivot.add(crackInk, crackGoldSafe); floor.add(crackPivot);

  // ---- shock ring on the floor --------------------------------------------------------------------------------------------------------------
  const ringMat = new ShaderMaterial({
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vP; uniform float uR, uA; uniform vec3 uInk, uHi, uGold;
      void main(){ float d = abs(length(vP) * 14.0 - uR); float px = fwidth(d) + 1e-4;
        if (d > 0.42) discard; vec3 c = d < 0.2 ? uHi : uGold; if (d > 0.42 - 3.0 * px) c = uInk; gl_FragColor = vec4(c, uA); }`,
    transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uR: { value: 0 }, uA: { value: 0 }, uInk: { value: col(PAL.deep) }, uHi: { value: col(PAL.hi) }, uGold: { value: col(PAL.goldLit) } },
  });
  const ring = new Mesh(new THREE.PlaneGeometry(2, 2), ringMat); ring.rotation.x = -Math.PI / 2; ring.scale.setScalar(14); ring.position.set(0.35, 0.05, 0.5); ring.renderOrder = 4; ring.frustumCulled = false;
  floor.add(ring);

  // ---- purple force walls ----------------------------------------------------------------------------------------------------------------------
  const wallMat = new ShaderMaterial({
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vL; uniform vec3 uLit, uShade, uRim; uniform float uA;
      void main(){ vec3 c = vL.y > -1.05 ? uLit : uShade;                        // hard 2 band (3 m x 6 m slab, local y -3..3)
        float rim = step(1.35, abs(vL.x)) + step(2.88, abs(vL.y)); if (rim > 0.5) c = uRim;   // gold rim light
        gl_FragColor = vec4(c, uA); }`,
    transparent: true, side: DoubleSide, uniforms: { uLit: { value: col(PAL.purple) }, uShade: { value: col(PAL.violet) }, uRim: { value: col(PAL.goldLit) }, uA: { value: 0.92 } },
  });
  const hullMat = new MeshBasicMaterial({ color: PAL.deep, side: BackSide });
  const walls = [-1, 1].map((sg) => {
    const g = new Group();
    const slab = new Mesh(new BoxGeometry(3, 6, 0.3), wallMat), hull = new Mesh(new BoxGeometry(3, 6, 0.3), hullMat);
    hull.scale.set(1.04, 1.02, 1.5); g.add(slab, hull);
    g.userData.sg = sg; g.position.set(sg * 4.2, -3, -1.0); g.rotation.y = -sg * 0.35; floor.add(g); return g;
  });

  // ---- lashes (tube whips) --------------------------------------------------------------------------------------------------------------------
  const O = new Vector3(0.3, 0.5, 0.2);
  const targets = [new Vector3(-3.9, 2.2, -0.8), new Vector3(3.9, 2.2, -0.8), new Vector3(0, 3.2, -4.6)];
  const ctrls = [new Vector3(-1.8, 3.6, 1.0), new Vector3(1.8, 3.6, 1.0), new Vector3(0.2, 4.6, -1.4)];
  const lashes = targets.map((tg, i) => {
    const curve = new QuadraticBezierCurve3(O.clone(), ctrls[i], tg);
    const mk = (r, color, order) => { const m = new Mesh(new TubeGeometry(curve, 24, r, 6, false), new MeshBasicMaterial({ color, side: DoubleSide })); m.renderOrder = order; m.frustumCulled = false; floor.add(m); return m; };
    const hull = mk(0.13, PAL.deep, 7), body = mk(0.08, PAL.crimson, 8), core = mk(0.035, PAL.pink, 9);
    const smear = new Mesh(new RingGeometry(0.5, 1.3, 20, 1, 0, 1.3), new MeshBasicMaterial({ color: PAL.crimson, transparent: true, opacity: 0.6, side: DoubleSide, depthWrite: false }));
    smear.position.copy(tg); smear.lookAt(new Vector3(0, tg.y, 1)); smear.visible = false; floor.add(smear);
    return { hull, body, core, smear, i, tg };
  });

  // ---- shards + dust puffs (the span breaks) ------------------------------------------------------------------------------------------------------
  const NSH = 36;
  const shardGeo = new OctahedronGeometry(0.28, 0);
  const shardA = new InstancedMesh(shardGeo, new MeshBasicMaterial({ color: PAL.stone }), NSH);
  const shardB = new InstancedMesh(shardGeo, new MeshBasicMaterial({ color: PAL.deepV }), NSH);
  const shardH = new InstancedMesh(shardGeo, new MeshBasicMaterial({ color: PAL.deep, side: BackSide }), NSH);
  [shardA, shardB, shardH].forEach((m) => { m.frustumCulled = false; floor.add(m); });
  const shd = [...Array(NSH)].map(() => { const a = rng() * 6.28, r = 2 + rng() * 4.5; return { x: Math.cos(a) * r, z: Math.sin(a) * r + 1, vx: Math.cos(a) * (1 + 2 * rng()), vy: 3 + 5 * rng(), vz: Math.sin(a) * (1 + 2 * rng()), s: 0.5 + 1.4 * rng(), w: (rng() - 0.5) * 6, ax: rng(), az: rng() }; });
  const puffs = makePoints(30, { shape: 1, additive: false, ink: true, alpha: 0.95 });
  const pf = [...Array(30)].map(() => { const a = rng() * 6.28, r = 1.5 + rng() * 5; return { x: Math.cos(a) * r, z: Math.sin(a) * r + 1, vy: 1 + 1.5 * rng(), s: 0.5 + 0.7 * rng(), c: rng() < 0.5 ? "#b8a8d8" : "#8a78b8" }; });
  const motes = makePoints(140, { shape: 1, additive: false, ink: false, alpha: 0.55 });
  const mo = [...Array(140)].map(() => ({ x: (rng() - 0.5) * 30, y: rng() * 12, z: (rng() - 0.5) * 36 - 6, ph: rng() * 6.28, s: 0.04 + 0.05 * rng() }));

  const dummy = new Object3D();
  group.add(spark.pts, stars.pts, puffs.pts, motes.pts);

  return {
    group,
    update(t, dt, cue) {
      // pivots: floor group tracks the seal on the floor, full pivot is only used for staff-local points (CPU placed)
      floor.position.set(seal.at[0], floorY, seal.at[2]); floor.rotation.y = seal.yaw; floor.scale.setScalar(seal.scale);
      const f24 = Math.floor(t * 24 + 1e-6);

      // gems: 2 on / 4 off, staggered
      const sg = since(cue, "gems", 4.58, t);
      for (let i = 0; i < 7; i++) {
        const on = sg >= 0 && ((f24 + i * 2) % 6) < 2;
        if (!on) { spark.off(i); continue; }
        localTo(seal, 0.42 + (i - 3) * 0.045, 1.02 + 0.07 * Math.abs(i - 3) * -1 + 0.2, 0.18, tmp);
        spark.set(i, tmp[0], tmp[1], tmp[2], PAL.gems[i], 0.11 + 0.05 * ((f24 + i) % 3 === 0));
      }
      const c0 = since(cue, "circle", 2.0, t);
      sparkRoam.forEach((p, k) => {
        const on = c0 > 0.8 && ((f24 + p.ph) % 6) < 2;
        if (!on) { spark.off(7 + k); return; }
        const a = p.a + t * 0.2;
        spark.set(7 + k, seal.at[0] + Math.cos(a) * p.r, floorY + p.y, seal.at[2] + Math.sin(a) * p.r, p.c, p.s);
      });
      spark.flush();

      // slam
      const sl = since(cue, "slam", 7.92, t);
      for (let i = 0; i < NS; i++) {
        const v = starV[i], u = sl;
        if (u < 0 || u > 1.1) { stars.off(i); continue; }
        const tt = Math.floor(u * 12) / 12;      // twos
        stars.set(i, seal.at[0] + v.vx * tt * 0.8, floorY + 0.4 + v.vy * tt - 4.9 * tt * tt, seal.at[2] + v.vz * tt * 0.8, v.c, v.s * (1 - clamp(tt - 0.7) * 2.2));
      }
      stars.flush();
      // crack reveal: 3 frames, holds, fades at the break
      const ck = clamp(sl / 0.125);
      const showCrack = sl >= 0 && since(cue, "break", 8.5, t) < 6.75;
      crackInk.visible = crackGoldSafe.visible = showCrack;
      for (const m of [crackInk, crackGoldSafe]) m.geometry.setDrawRange(0, Math.floor(ck * NC * SEG) * 6);
      // shock ring
      const rk = clamp(sl / 0.5);
      ringMat.uniforms.uR.value = easeOut3(rk) * 6.5; ringMat.uniforms.uA.value = sl >= 0 && sl < 0.5 ? 1 - rk * rk : 0; ring.visible = sl >= 0 && sl < 0.5;

      // walls rise in 12 frames, sink after the circle closes
      const sw = since(cue, "walls", 8.0, t), sc = since(cue, "circleclose", 15.3, t);
      for (const w of walls) {
        const up = easeOut3(sw / 0.5), down = easeInOut((sc - 0.2) / 0.5);
        w.position.y = -3 + 6 * up * (1 - down) + (sw < 0 ? -9 : 0);
        w.visible = sw >= 0 && down < 1;
      }

      // lashes: out over 3 frames, hold 1, back over 3, staggered 2 frames
      const sa = since(cue, "lash", 7.95, t);
      for (const L of lashes) {
        const u = sa - L.i * 0.08;
        const head = clamp(u / 0.125), tail = clamp((u - 0.17) / 0.125);
        const vis = u >= 0 && tail < 1;
        for (const m of [L.hull, L.body, L.core]) { m.visible = vis; m.geometry.setDrawRange(Math.floor(tail * 24) * 36, Math.max(0, Math.floor(head * 24) - Math.floor(tail * 24)) * 36); }
        const sm = u > 0.1 && u < 0.3;
        L.smear.visible = sm; if (sm) L.smear.scale.setScalar(1 + 1.2 * clamp((u - 0.1) / 0.2)); // squash-pop
      }

      // the span breaks (slow motion x0.4)
      const sb = since(cue, "break", 8.5, t), tau = sb < 0 ? 0 : 0.4 * Math.floor(sb * 12) / 12;
      for (let i = 0; i < NSH; i++) {
        const s = shd[i];
        dummy.position.set(s.x + s.vx * tau, 0.2 + s.vy * tau - 4.9 * tau * tau, s.z + s.vz * tau);
        dummy.rotation.set(s.ax * 6 * tau * 2, s.w * tau, s.az * 6 * tau);
        dummy.scale.setScalar(sb < 0 || dummy.position.y < -0.5 ? 0.0001 : s.s);
        dummy.updateMatrix(); shardA.setMatrixAt(i, dummy.matrix); shardB.setMatrixAt(i, dummy.matrix);
        dummy.scale.multiplyScalar(1.12); dummy.updateMatrix(); shardH.setMatrixAt(i, dummy.matrix);
      }
      shardA.instanceMatrix.needsUpdate = shardB.instanceMatrix.needsUpdate = shardH.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 30; i++) {
        const p = pf[i];
        if (sb < 0 || sb > 4) { puffs.off(i); continue; }
        const u = sb / 4;
        puffs.set(i, seal.at[0] + p.x * (1 + 0.5 * u), floorY + 0.3 + p.vy * u, seal.at[2] + p.z * (1 + 0.5 * u), p.c, p.s * (0.4 + 1.6 * easeOut3(u)) * (1 - u * u));
      }
      puffs.flush();

      // hall motes on twos
      for (let i = 0; i < 140; i++) {
        const m = mo[i];
        motes.set(i, seal.at[0] + m.x + Math.sin(t * 0.3 + m.ph) * 0.6, floorY + ((m.y + t * 0.18) % 12), seal.at[2] + m.z + Math.cos(t * 0.25 + m.ph) * 0.6, i % 3 ? "#e8d8a8" : "#c8b8f0", m.s * (0.6 + 0.4 * Math.sin(t * 2 + m.ph)));
      }
      motes.flush();
    },
    dispose() {
      [spark, stars, puffs, motes].forEach((p) => p.dispose());
      [crackInk.geometry, crackGoldSafe.geometry, ringMat, wallMat, hullMat, shardGeo, ring.geometry].forEach((o) => o.dispose?.());
      lashes.forEach((L) => { [L.hull, L.body, L.core, L.smear].forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); });
      [shardA, shardB, shardH].forEach((m) => { m.material.dispose(); m.dispose?.(); });
      walls.forEach((w) => w.children.forEach((c) => c.geometry.dispose()));
    },
  };
}
