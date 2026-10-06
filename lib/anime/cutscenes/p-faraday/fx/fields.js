// FIELDS: cyan electric arcs, lilac magnetic rings, ghost trails, right-angle ticks, the orbit around the pup.
//
// The maths the film stages (faraday: E and B settle on one fixed point, every arc crossing every ring at 90 deg):
//   state s      s = floor((ts - T0) / DT), DT = 0.28 s (twos-friendly). Wrongness amp(s) = 0.62^s, locked (0) from s = 10.
//   arc i, u     P(u) = lerp(A, B, u) + (0, 0, bow_i sin(pi u)) + amp(s) (0, dy, dz)(u)
//                dy,dz = a1 sin(pi u + p1) + a2 sin(2 pi u + p2), a_k from hash3(i, s, k): a different wrong shape per state.
//   kinks        lightning grammar: every third interior vertex is displaced +-0.045 m on twos (jitter seeded by ts).
//   ghosts       the three earlier states s-1, s-2, s-3 at alpha 0.40 / 0.25 / 0.12.
//   ring j       centre c_j + 0.35 amp(s) e_j (off-centre), plane tilted 25 deg amp(s) about x (sign alternates), radius rho.
//   tick n       an L mark (legs 0.22 m) with scale 0 -> 1.3 over 4 frames, 1.3 -> 1 over 2, hold to f10, fade over 8.
//                18 pops: six in 4.0-5.0 s (f96-120), twelve 5.0-6.4 s; the last lands on the coin.
//   orbit        shots 7-8: three lilac rings and three cyan arcs circle the pup on twos, dashed so the spin reads.
import { RibbonBatch, billboard, mat, NZ, hash3, sstep, clamp01, lerp, coinTip } from "./lib.js";

const NARC = 9, NRING = 6, GH = [0, 0.4, 0.25, 0.12];
const DT = 0.28, LOCK = 10, SEG = 12, RSEG = 40;
const amp = (s) => (s >= LOCK ? 0 : 0.62 ** Math.max(0, s));

export default function makeFields(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "fields";
  const arcB = new RibbonBatch(THREE, sh, NARC * 4, SEG + 1);
  const ringB = new RibbonBatch(THREE, sh, NRING * 4, RSEG + 1);
  const orbB = new RibbonBatch(THREE, sh, 6, 49);
  // cyan: outer glow 35 percent (soft, additive), body 3.5 px flat, white-hot core 1.5 px additive
  const arcOuter = arcB.pass({ col: "#28d7ff", px: 11, a: 0.35, soft: 1, add: true, taper: 0.6, order: 4 });
  const arcBody = arcB.pass({ col: "#5fd8ff", px: 3.5, hdr: 1.15, taper: 0.8, order: 5 });
  const arcCore = arcB.pass({ col: "#e8fbff", px: 1.5, a: 0.4 / 0.4, hdr: 1.5, add: true, taper: 0.8, order: 6 });
  // lilac: body 3 px, inner 1 px
  const ringBody = ringB.pass({ col: "#b58cff", px: 3, taper: 0, dashN: 0, order: 5 });
  const ringCore = ringB.pass({ col: "#efe4ff", px: 1, taper: 0, hdr: 1.2, order: 6 });
  const orbBody = orbB.pass({ col: "#b58cff", px: 3, taper: 0, dashN: 7, duty: 0.7, order: 5 });
  const orbCore = orbB.pass({ col: "#efe4ff", px: 1, taper: 0, hdr: 1.2, dashN: 7, duty: 0.7, order: 6 });
  const orbCy = orbB.pass({ col: "#5fd8ff", px: 3.5, taper: 0.8, hdr: 1.1, dashN: 3, duty: 0.6, order: 5 });
  for (const m of [arcOuter, arcBody, arcCore, ringBody, ringCore, orbBody, orbCore, orbCy]) group.add(m);

  const A = L.A, B = L.B;
  const levelY = (li) => L.base + L.levels[li];
  const arcPts = (i, s, ts, out) => {
    const li = (i / 3) | 0, bi = i % 3, a = amp(s);
    const y0 = levelY(li), bow = L.bows[bi];
    const r1 = hash3(i, s, 1) * 2 - 1, r2 = hash3(i, s, 2) * 2 - 1, r3 = hash3(i, s, 3) * 2 - 1, r4 = hash3(i, s, 4) * 2 - 1;
    const p1 = hash3(i, s, 5) * 6.283, p2 = hash3(i, s, 6) * 6.283;
    for (let k = 0; k <= SEG; k++) {
      const u = k / SEG;
      const wy = a * (r1 * Math.sin(Math.PI * u + p1 * 0.2) + 0.6 * r2 * Math.sin(2 * Math.PI * u + p2)) * 1.0;
      const wz = a * (r3 * Math.sin(Math.PI * u) + 0.6 * r4 * Math.sin(2 * Math.PI * u + p1)) * 1.0;
      let x = lerp(A[0], B[0], u), y = y0 + wy, z = lerp(A[2], B[2], u) + bow * Math.sin(Math.PI * u) + wz;
      // kinks: sharp turns every third interior vertex, redrawn each twos step
      if (k > 0 && k < SEG && k % 3 === 0) {
        const f = Math.floor(ts * 12);
        y += (hash3(i, k, f) * 2 - 1) * (0.045 + 0.08 * a); z += (hash3(i, k + 40, f) * 2 - 1) * (0.045 + 0.08 * a);
      }
      out[k * 3] = x; out[k * 3 + 1] = y; out[k * 3 + 2] = z;
    }
  };
  const ringPts = (j, s, out) => {
    const end = j < 3 ? A : B, li = j % 3, a = amp(s);
    const sx = j % 2 ? -1 : 1;
    const ox = (hash3(j, s, 11) * 2 - 1) * 0.35 * a, oz = (hash3(j, s, 12) * 2 - 1) * 0.35 * a;
    const tilt = THREE.MathUtils.degToRad(25) * a * sx, ct = Math.cos(tilt), st = Math.sin(tilt);
    const cy = levelY(li);
    for (let k = 0; k <= RSEG; k++) {
      const th = (k / RSEG) * Math.PI * 2, lx = L.rho * Math.cos(th), lz = L.rho * Math.sin(th);
      out[k * 3] = end[0] + ox + lx; out[k * 3 + 1] = cy - st * lz; out[k * 3 + 2] = end[2] + oz + ct * lz;
    }
  };

  // ---- ticks (18 + one extra flash in shot 8) ----------------------------------------------------------------
  const NT = 19;
  const tickT = [];
  for (let n = 0; n < 18; n++) tickT.push(n < 6 ? T.tickLock + n * 0.2 : 5.0 + ((n - 5) * 1.4) / 12);
  tickT[17] = T.coinToss; // the last tick lands at the coin
  tickT.push(T.proof);    // the one tick flash of the proof shot
  const tickPos = [];
  {
    const tmp = new Float32Array((SEG + 1) * 3), uC = L.rho / Math.max(0.5, Math.abs(B[0] - A[0]));
    for (let n = 0; n < 18; n++) {
      const arc = n >> 1, end = n & 1;
      arcPts(arc, LOCK, 0, tmp);
      const kk = Math.round((end ? 1 - uC : uC) * SEG);
      // use the un-kinked analytic point so a tick sits on the true crossing
      const u = end ? 1 - uC : uC, li = (arc / 3) | 0, bi = arc % 3;
      tickPos.push([lerp(A[0], B[0], u), levelY(li), lerp(A[2], B[2], u) + L.bows[bi] * Math.sin(Math.PI * u)]);
      void kk;
    }
    tickPos.push([0, 0, 0]);
  }
  const tickGeo = new THREE.BufferGeometry();
  {
    // two rects per L: legs along +x (0.22 x 0.03) and +y (0.03 x 0.22), pivot at the corner
    const loc = [], idx = [], w = 0.03, l = 0.22;
    const rect = (x0, y0, x1, y1, b) => { loc.push(x0, y0, x1, y0, x1, y1, x0, y1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    const ctr = new Float32Array(NT * 8 * 3), inf = new Float32Array(NT * 8 * 3), L2 = new Float32Array(NT * 8 * 2);
    const all = [];
    for (let n = 0; n < NT; n++) {
      const b = n * 8;
      const r0 = loc.length / 2; rect(-w * 0.5, -w * 0.5, l, w * 0.5, b); rect(-w * 0.5, -w * 0.5, w * 0.5, l, b + 4);
      void r0; void all;
    }
    for (let i = 0; i < loc.length / 2; i++) { L2[i * 2] = loc[i * 2]; L2[i * 2 + 1] = loc[i * 2 + 1]; }
    // idx was built with absolute offsets per tick
    tickGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NT * 8 * 3), 3));
    tickGeo.setAttribute("ctr", new THREE.BufferAttribute(ctr, 3).setUsage(THREE.DynamicDrawUsage));
    tickGeo.setAttribute("loc", new THREE.BufferAttribute(L2, 2));
    tickGeo.setAttribute("inf", new THREE.BufferAttribute(inf, 3).setUsage(THREE.DynamicDrawUsage));
    tickGeo.setIndex(idx);
    tickGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  }
  const TICK_VS = /* glsl */ `
    attribute vec3 ctr; attribute vec2 loc; attribute vec3 inf; // inf = (scale, alpha, white->gold mix)
    varying vec3 vI;
    void main() { vec4 mv = viewMatrix * vec4(ctr, 1.0); mv.xy += loc * inf.x; vI = inf; gl_Position = projectionMatrix * mv; }`;
  const tickMat = mat(THREE, {
    vs: TICK_VS, u: {}, depthTest: true,
    fs: `varying vec3 vI; void main() { if (vI.y < .004) discard; vec3 c = mix(vec3(1.), vec3(1., .82, .227), vI.z); gl_FragColor = vec4(c * 1.4, vI.y); }`,
  });
  const ticks = new THREE.Mesh(tickGeo, tickMat); ticks.frustumCulled = false; ticks.renderOrder = 8; group.add(ticks);

  // flash discs (0.3 m, #ffd23a additive 0.6) as billboards
  const discs = [];
  const discFs = `
    uniform float uK; uniform float uHdr; varying vec2 vUv;
    void main() { float r = length(vUv); float a = (1. - smoothstep(.55, 1., r)) * uK; if (a < .004) discard;
      gl_FragColor = vec4(vec3(1., .82, .227) * uHdr, a * .6); }`;
  for (let n = 0; n < NT; n++) {
    const d = billboard(THREE, sh, discFs, { uK: { value: 0 }, uHdr: { value: 1.3 } }, { add: true, order: 7 });
    d.userData.u.uSize.value.set(0.3, 0.3); discs.push(d); group.add(d);
  }

  // orbit around the pup: three lilac rings + three cyan sweeping arcs
  const orbPts = new Float32Array(49 * 3);
  const chest = new THREE.Vector3();
  const tmpA = new Float32Array((SEG + 1) * 3), tmpR = new Float32Array((RSEG + 1) * 3);
  let lastStep = -1, lastSt = -99;

  function update(_t, dt, cue) {
    sh.sync();
    const ts = cue.ts;
    // global visibility: in at fieldsStart, held, thinned for the credit
    const vis = sstep(T.fieldsStart, T.fieldsStart + 0.25, ts) * (1 - 0.65 * sstep(T.credit, T.credit + 1.2, ts));
    const s = Math.floor((ts - T.fieldsStart) / DT);
    const redraw = s !== lastSt || Math.floor(ts * 12) !== lastStep;
    if (redraw && vis > 0) {
      lastSt = s; lastStep = Math.floor(ts * 12);
      for (let i = 0; i < NARC; i++) for (let g = 0; g < 4; g++) {
        const gs = s - g, r = i * 4 + g;
        if (s < 0 || gs < 0) { arcB.hide(r); continue; }
        arcPts(i, gs, ts, tmpA); arcB.set(r, tmpA, GH[g] === 0 ? 1 : GH[g]);
      }
      for (let j = 0; j < NRING; j++) for (let g = 0; g < 4; g++) {
        const gs = s - g, r = j * 4 + g;
        if (s < 0 || gs < 0) { ringB.hide(r); continue; }
        ringPts(j, gs, tmpR); ringB.set(r, tmpR, GH[g] === 0 ? 1 : GH[g]);
      }
      arcB.commit(); ringB.commit();
    }
    // ghosts must not carry the white core: the core pass is dimmed by the live alpha only, ghosts read as faint cyan
    for (const m of [arcOuter, arcBody, arcCore, ringBody, ringCore]) m.userData.u.uA.value = (m === arcOuter ? 0.35 : m === arcCore ? 1 : 1) * vis;
    // locked arcs breathe: the core pulse on twos
    arcCore.userData.u.uHdr.value = 1.3 + 0.3 * Math.sin(ts * 12 * 0.9);
    // rings dash only once spinning (shot 7 on): duty 1 -> 0.72
    const spin = sstep(T.afterglow, T.afterglow + 0.6, ts);
    for (const m of [ringBody, ringCore]) { const u = m.userData.u; u.uDashN.value = spin > 0 ? 6 : 0; u.uDuty.value = 1 - 0.28 * spin; u.uPhase.value = -ts * 1.5; }

    // ticks
    const ti = tickGeo.attributes.ctr.array, tf = tickGeo.attributes.inf.array;
    ctx.seal && coinTip(ctx.seal, chest);
    const coin = chest.clone();
    const orbitK = sstep(T.afterglow, T.afterglow + 0.6, ts) * (1 - sstep(T.face - 0.5, T.face, ts));
    for (let n = 0; n < NT; n++) {
      const age = ts - tickT[n];
      let sc = 0, al = 0, mix = 0;
      if (age >= 0 && age < 18 / 24) {
        sc = age < 4 / 24 ? 1.3 * (age / (4 / 24)) : age < 6 / 24 ? 1.3 - 0.3 * ((age - 4 / 24) / (2 / 24)) : 1;
        al = age < 10 / 24 ? 1 : 1 - (age - 10 / 24) / (8 / 24);
        mix = clamp01(age / (6 / 24));
      }
      let p = tickPos[n];
      if (n === 17) p = [coin.x, coin.y, coin.z];
      if (n === 18) { ctx.seal.chest(chest); p = [chest.x + 1.25, chest.y + 0.2, chest.z - 0.2]; }
      for (let v = 0; v < 8; v++) {
        const o = (n * 8 + v) * 3;
        ti[o] = p[0]; ti[o + 1] = p[1]; ti[o + 2] = p[2]; tf[o] = sc; tf[o + 1] = al; tf[o + 2] = mix;
      }
      const d = discs[n], du = d.userData.u;
      const dk = age >= 0 && age < 8 / 24 ? 1 - age / (8 / 24) : 0;
      d.visible = dk > 0; du.uCenter.value.set(p[0], p[1], p[2]); du.uK.value = dk; du.uSize.value.setScalar(0.3 * (0.6 + 0.8 * (1 - dk)));
    }
    tickGeo.attributes.ctr.needsUpdate = true; tickGeo.attributes.inf.needsUpdate = true;

    // orbit
    if (orbitK > 0.001) {
      ctx.seal.chest(chest);
      const R = 1.3 * (ctx.seal.scale ?? 1), ang = Math.floor(ts * 12) / 12 * 1.6;
      for (let r = 0; r < 6; r++) {
        const ring = r < 3, tilt = [0.9, -0.55, 0.25][r % 3], spinA = ang * (r % 2 ? -1 : 1) + r * 2.1;
        const sweep = ring ? Math.PI * 2 : Math.PI * 1.25;
        for (let k = 0; k < 49; k++) {
          const th = spinA + (k / 48) * sweep, rr = ring ? R * (1 + 0.1 * (r % 3)) : R * 1.18;
          const lx = rr * Math.cos(th), lz = rr * Math.sin(th);
          // tilt about x then about y by the ring's own heading
          const y1 = -Math.sin(tilt) * lz, z1 = Math.cos(tilt) * lz, h = r * 1.05;
          orbPts[k * 3] = chest.x + lx * Math.cos(h) + z1 * Math.sin(h);
          orbPts[k * 3 + 1] = chest.y + y1 * 0.9;
          orbPts[k * 3 + 2] = chest.z - lx * Math.sin(h) + z1 * Math.cos(h);
        }
        orbB.set(r, orbPts, orbitK);
      }
      orbB.commit();
      for (const m of [orbBody, orbCore, orbCy]) { m.visible = true; m.userData.u.uPhase.value = -ts * 0.8; }
      orbCy.userData.u.uA.value = 1;
    } else for (const m of [orbBody, orbCore, orbCy]) m.visible = false;
    void cue; void dt;
  }
  function dispose() { arcB.dispose(); ringB.dispose(); orbB.dispose(); tickGeo.dispose(); tickMat.dispose(); for (const d of discs) { d.geometry.dispose(); d.material.dispose(); } }
  return { group, update, dispose };
}
