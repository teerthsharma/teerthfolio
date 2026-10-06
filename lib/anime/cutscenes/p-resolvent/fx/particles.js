// PARTICLES (bible 3.16, 3.17, FX table): 260 leaves, 70 stones, 200 motes (70 calm), 36 flat dust puffs, 40 shards + star glints.
// Every particle is a pure function of the stepped clock t (analytic, no integration), so a scrubbed frame equals a played one.
// Flat, hard 2-tone: leaves are lens cards (two halves 1.0 / .62), stones and shards are flat-shaded facets, dust is a 2-tone puff.
//
//   leaf swirl    a = a0 + w t,  rad = rad0 (1 - .25 smooth(1.6, 4, t)),  y = y0 + .6 sin(1.3 t + a0)         (visible from 1.6 s)
//   release lift  tb = t - (rel + .035 d)   (d = distance from the pup, the bible's 0.035 s per metre):  y += 7 tb + 3 tb^2, a += 2 tb
//   stones        rise to h_i over .8 s after the same delay, hold with a bob, fall under g from 9.3 s, rest on the floor
//   shards        p = p0 + v tau + g tau^2 / 2 with tau = .45 * floor(6 a) / 6 inside the 0.8 s slow-motion window (fours), then real time
import { PAL, T, sstep, lerp, clamp01, flatMat, pushFan } from "./common.js";

const D = Math.PI / 180;

function nonIndexedFlat(THREE, geo, tone) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, i + 1), c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
    const n = b.sub(a).cross(c.sub(a)).normalize();
    const k = tone(n);
    for (let j = 0; j < 3; j++) { col[(i + j) * 3] = k; col[(i + j) * 3 + 1] = k; col[(i + j) * 3 + 2] = k; }
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function lensGeo(THREE) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.5, 0, -0.2, 0, 0, 0, -0.5, 0, 0, 0.5, 0, 0, -0.5, 0, 0.2, 0, 0], 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62], 3));
  return g;
}

// flat 2-tone puff: a bumpy blob split by a chord; the lower-right segment is the shade. Two non-overlapping fans, so alpha never doubles.
function puffGeo(THREE) {
  const pos = [], col = [], N = 18, lit = [], shade = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, r = 1 + 0.18 * Math.sin(5 * a) + 0.1 * Math.sin(3 * a + 1);
    const p = [Math.cos(a) * r, Math.sin(a) * r * 0.78, 0];
    (a > 3.6 && a < 5.9 ? shade : lit).push({ a, p });
  }
  const chordA = shade[0].p, chordB = shade[shade.length - 1].p;
  const shadePts = [...shade.map((s) => s.p)];
  const litPts = [chordB, ...lit.map((s) => s.p), chordA].filter(Boolean);
  const cen = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length, 0];
  pushFan(pos, col, litPts, cen(litPts), [1, 1, 1]);
  pushFan(pos, col, shadePts, cen(shadePts), [0.78, 0.74, 0.8]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function starGeo(THREE) {
  const pts = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 0.16 : 1; pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]); }
  const pos = [], col = []; pushFan(pos, col, pts, [0, 0, 0], [1, 1, 1]);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return g;
}

export default function particles(ctx, S, A) {
  const THREE = ctx.THREE, group = new THREE.Group(); group.name = "particles";
  const seal = ctx.seal, cam = ctx.player?.camera;
  const dummy = new THREE.Object3D(), qTmp = new THREE.Quaternion(), eTmp = new THREE.Euler(), col = new THREE.Color();
  const disposables = [];
  function inst(geo, mat, n, order = 8) {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.frustumCulled = false; m.renderOrder = order;
    for (let i = 0; i < n; i++) m.setColorAt(i, col.set("#ffffff"));
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m); disposables.push(geo, mat); return m;
  }
  const put = (m, i, x, y, z, q, sx, sy = sx, sz = sx) => { dummy.position.set(x, y, z); dummy.quaternion.copy(q); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); };
  const hide = (m, i) => put(m, i, 0, -999, 0, qTmp.identity(), 0);
  const R = (name) => ctx.rng(name);
  const sx0 = () => seal.at[0], sz0 = () => seal.at[2], sy0 = () => seal.at[1];

  // ---------- leaves (260) ----------
  const NL = 260, leafM = inst(lensGeo(THREE), flatMat(THREE, S, { color: "#ffffff", alpha: 1, vertexColors: true }), NL);
  const rl = R("leaves"), leaves = [];
  for (let i = 0; i < NL; i++) {
    const c = new THREE.Color(PAL.leaves[Math.floor(rl() * PAL.leaves.length)]);
    leaves.push({ a0: rl() * 6.2832, rad0: 2.6 + rl() * 24, y0: 0.4 + rl() * 7, w: 0.2 + rl() * 0.45, sz: 0.2 + rl() * 0.2, app: 1.6 + rl() * 0.8, sp: [rl() * 4 - 2, rl() * 4 - 2, rl() * 4 - 2], rb: 12.0 + rl() * 1.0, c, gold: new THREE.Color(PAL.crackCore), ph: rl() * 6, rz: 0.4 + rl() * 0.6 });
    leafM.setColorAt(i, c);
  }
  let leafG = -1;
  function updLeaves(t, rel) {
    const g = sstep(13.0, 13.8, t);
    if (g !== leafG) { leafG = g; for (let i = 0; i < NL; i++) { col.copy(leaves[i].c).lerp(leaves[i].gold, g); leafM.setColorAt(i, col); } leafM.instanceColor.needsUpdate = true; }
    for (let i = 0; i < NL; i++) {
      const L = leaves[i];
      const tb = t - (rel + 0.035 * L.rad0);
      let x, y, z, s = L.sz * sstep(L.app, L.app + 0.3, t);
      if (t >= L.rb) {                                  // gold dust: rises from the floor round the scale while the court unmakes
        const k = clamp01((t - L.rb) / 3.4), a = L.a0 + 0.6 * (t - L.rb);
        const rr = 1.5 + L.rad0 * 0.55 * (0.4 + k);
        x = A.scale[0] + Math.cos(a) * rr; z = A.scale[2] + Math.sin(a) * rr; y = sy0() + 0.2 + k * (3 + L.y0 * 0.6);
        s = L.sz * 0.7 * (1 - sstep(0.7, 1, k)) * sstep(0, 0.1, k);
      } else if (tb > 0) {                              // blown skyward
        const a = L.a0 + L.w * t + 2.0 * tb, rr = L.rad0 + 1.5 * tb;
        x = sx0() + Math.cos(a) * rr; z = sz0() + Math.sin(a) * rr; y = sy0() + L.y0 + 7 * tb + 3 * tb * tb;
        if (tb > 2.5) s = 0;
      } else {
        const a = L.a0 + L.w * t, rr = L.rad0 * (1 - 0.25 * sstep(1.6, 4, t));
        x = sx0() + Math.cos(a) * rr; z = sz0() + Math.sin(a) * rr; y = sy0() + L.y0 + 0.6 * Math.sin(1.3 * t + L.ph);
      }
      if (t < L.app || s <= 0.001) { hide(leafM, i); continue; }
      eTmp.set(L.sp[0] * t, L.sp[1] * t, L.sp[2] * t); qTmp.setFromEuler(eTmp);
      put(leafM, i, x, y, z, qTmp, s, s * 1.0, s);
    }
    leafM.instanceMatrix.needsUpdate = true;
  }

  // ---------- stones (70) ----------
  const NS = 70, stoneM = inst(nonIndexedFlat(THREE, new THREE.IcosahedronGeometry(1, 0), (n) => 0.62 + 0.38 * Math.max(0, n.y * 0.8 + n.x * 0.35)), flatMat(THREE, S, { color: "#ffffff", alpha: 1, vertexColors: true }), NS, 7);
  const rs = R("stones"), stones = [];
  for (let i = 0; i < NS; i++) {
    const rad = 2.6 + rs() * 11, a = rs() * 6.2832;
    stones.push({ a, rad, h: 2 + rs() * 4.5, sz: 0.1 + rs() * 0.2, sp: [rs() * 2 - 1, rs() * 2 - 1, rs() * 2 - 1], ph: rs() * 6, fall: 9.3 + rs() * 0.6 });
    stoneM.setColorAt(i, new THREE.Color(PAL.stones[Math.floor(rs() * PAL.stones.length)]));
  }
  function updStones(t, rel) {
    for (let i = 0; i < NS; i++) {
      const o = stones[i], tb = t - (rel + 0.035 * o.rad);
      const x = sx0() + Math.cos(o.a) * o.rad, z = sz0() + Math.sin(o.a) * o.rad;
      let y = sy0() + o.sz * 0.5;
      const up = sstep(0, 0.8, tb);
      let h = o.h * up + 0.12 * Math.sin(t * 2 + o.ph) * up;
      if (t > o.fall) { const f = t - o.fall; h = Math.max(0, o.h - 4.9 * f * f * 1.4); }
      y += h;
      eTmp.set(o.sp[0] * tb * up, o.sp[1] * tb * up + o.a, o.sp[2] * tb * up); qTmp.setFromEuler(eTmp);
      put(stoneM, i, x, y, z, qTmp, o.sz, o.sz * 0.7, o.sz);
    }
    stoneM.instanceMatrix.needsUpdate = true;
  }

  // ---------- motes (200: 70 calm, 130 that spiral to the pup) ----------
  const NM = 200, moteM = inst(new THREE.CircleGeometry(0.5, 8), flatMat(THREE, S, { color: PAL.mote, alpha: 0.9, add: true }), NM, 9);
  const rm = R("motes"), motes = [];
  for (let i = 0; i < NM; i++) motes.push({ calm: i < 70, a: rm() * 6.2832, rad: 3 + rm() * 13, y: 0.4 + rm() * 3.6, sz: 0.05 + rm() * 0.06, ts: 6.4 + rm() * 0.4, tr: 7.7 + rm() * 0.3, ph: rm() * 6, sp: 0.5 + rm() });
  function updMotes(t) {
    const dpos = cam ? cam.quaternion : qTmp.identity();
    for (let i = 0; i < NM; i++) {
      const o = motes[i]; let x, y, z, s;
      if (o.calm) {
        const a = o.a + 0.05 * t;
        x = sx0() + Math.cos(a) * o.rad; z = sz0() + Math.sin(a) * o.rad; y = sy0() + o.y + 0.3 * Math.sin(t * o.sp + o.ph);
        s = o.sz * sstep(T.moteIn[0], T.moteIn[1], t);
      } else if (t < o.ts || t > 10.4) { hide(moteM, i); continue; } else if (t < o.tr) {
        const k = (t - o.ts) / (o.tr - o.ts), e = k * k;                  // spiral in, quickening
        const a = o.a + 4 * Math.PI * e, rr = lerp(o.rad * 0.5 + 1.2, 1.1, e);
        x = sx0() + Math.cos(a) * rr; z = sz0() + Math.sin(a) * rr; y = sy0() + lerp(o.y, 0.55, e); s = o.sz;
      } else {
        const k = t - o.tr, a = o.a + 4 * Math.PI + 3 * k;               // ride the column up
        x = sx0() + Math.cos(a) * 1.1; z = sz0() + Math.sin(a) * 1.1; y = sy0() + 0.55 + 7 * k * o.sp;
        s = o.sz * (1 - sstep(9.3, 10.3, t));
      }
      put(moteM, i, x, y, z, dpos, s);
    }
    moteM.instanceMatrix.needsUpdate = true;
  }

  // ---------- dust (36 flat 2-tone puffs): ambient, then bursts at 6.4 (ring), 7.7 (release), 8.5 (scale), 10.3 (ranks) ----------
  const ND = 36, dustM = inst(puffGeo(THREE), flatMat(THREE, S, { color: "#ffffff", alpha: 0.3, vertexColors: true }), ND, 5);
  const rd = R("dust"), dust = [];
  const bursts = [{ t0: 6.4, at: "seal" }, { t0: 7.7, at: "seal" }, { t0: 8.5, at: "scale" }, { t0: 10.3, at: "ranks" }];
  for (let i = 0; i < ND; i++) {
    const amb = i < 8;
    dust.push({ amb, b: amb ? -1 : (i - 8) % 4, a: rd() * 6.2832, rad: 4 + rd() * 14, sz: 0.35 + rd() * 0.5, ph: rd() * 6 });
    dustM.setColorAt(i, new THREE.Color(PAL.dust[i % 3]));
  }
  function updDust(t, rel, brk) {
    const dq = cam ? cam.quaternion : qTmp.identity();
    for (let i = 0; i < ND; i++) {
      const o = dust[i]; let x, y, z, s, al = 0.3;
      if (o.amb) {
        // ambient 0..0.2 alpha early, gone as the weighing begins
        x = sx0() + Math.cos(o.a) * o.rad; z = sz0() + Math.sin(o.a) * o.rad; y = sy0() + 0.3 + 0.1 * Math.sin(t * 1.5 + o.ph); s = o.sz * 1.2;
        al = 0.2 * (1 - sstep(5, 6, t)) * sstep(0, 0.2, t);
      } else {
        const bu = bursts[o.b], t0 = bu.t0 + (o.b >= 2 ? brk - T.brk : rel - T.release) * (o.b === 0 ? 0 : 1), k = (t - t0) / (53 / 24);
        if (k < 0 || k > 1) { hide(dustM, i); continue; }
        const base = bu.at === "scale" ? [A.scale[0], A.ground, A.scale[2]] : bu.at === "ranks" ? A.ranks : [sx0(), sy0(), sz0()];
        const spread = bu.at === "ranks" ? 5 : 1 + 8 * (1 - (1 - k) * (1 - k));
        const a = o.a, off = bu.at === "ranks" ? (o.rad - 11) : 0;
        x = base[0] + Math.cos(a) * spread * (bu.at === "ranks" ? 0.3 : 1); z = base[2] + Math.sin(a) * spread + off * 0.5; y = (bu.at === "scale" ? A.ground : sy0()) + 0.3 + 0.9 * k;
        s = o.sz * (0.6 + 1.1 * k); al = 0.3 * (1 - k);
      }
      dustM.material.uniforms.uA.value = 0.3; // single material alpha; per-puff fade is carried by the instance scale (flat puffs shrink out)
      if (al < 0.02) { hide(dustM, i); continue; }
      put(dustM, i, x, y, z, dq, s * (al / 0.3) ** 0.5);
    }
    dustM.instanceMatrix.needsUpdate = true;
  }

  // ---------- shards (40) + star glints ----------
  const NH = 40, shardM = inst(nonIndexedFlat(THREE, new THREE.TetrahedronGeometry(1, 0), (n) => 0.72 + 0.28 * Math.max(0, n.y * 0.7 + n.x * 0.4)), flatMat(THREE, S, { color: "#ffffff", alpha: 1, vertexColors: true }), NH, 8);
  const starM = inst(starGeo(THREE), flatMat(THREE, S, { color: PAL.shardStar, alpha: 1, add: true }), NH, 11);
  const rh = R("shards"), shards = [];
  for (let i = 0; i < NH; i++) {
    const a = rh() * 6.2832, sp = 2.5 + rh() * 4.5;
    shards.push({ v: [Math.cos(a) * sp, 3 + rh() * 5, Math.sin(a) * sp], sz: 0.14 + rh() * 0.18, sp: [rh() * 8 - 4, rh() * 8 - 4, rh() * 8 - 4], j: [rh() - 0.5, rh() - 0.5, rh() - 0.5] });
    shardM.setColorAt(i, new THREE.Color(PAL.shard));
  }
  function updShards(t, brk) {
    const a = t - brk, dq = cam ? cam.quaternion : qTmp.identity();
    for (let i = 0; i < NH; i++) {
      const o = shards[i];
      if (a < 0) { hide(shardM, i); hide(starM, i); continue; }
      const aq = a < 0.8 ? Math.floor(a * 6) / 6 : a;                 // slow motion on fours: 6 fps, 0.45 speed
      const tau = a < 0.8 ? 0.45 * aq : 0.36 + (a - 0.8);
      let x = A.scale[0] + o.j[0] * 0.8 + o.v[0] * tau, z = A.scale[2] + o.j[2] * 0.8 + o.v[2] * tau, y = A.scale[1] + o.j[1] * 0.4 + o.v[1] * tau - 4.9 * tau * tau;
      const fl = A.ground + o.sz * 0.5; let rest = 0;
      if (y < fl) { y = fl; rest = 1; }
      const s = o.sz * (1 - sstep(2.4, 3.4, tau)) * (1 - 0.0 * rest);
      eTmp.set(o.sp[0] * tau * (1 - rest), o.sp[1] * tau * (1 - rest), o.sp[2] * tau * (1 - rest)); qTmp.setFromEuler(eTmp);
      put(shardM, i, x, y, z, qTmp, s);
      const blink = ((Math.floor(t * 12) + i) % 4 === 0) && tau < 1.6 ? 1 : 0;
      put(starM, i, x, y + s * 0.4, z, dq, blink * s * 3.2);
    }
    shardM.instanceMatrix.needsUpdate = true; starM.instanceMatrix.needsUpdate = true;
  }

  function update(t, dt, cue) {
    const rel = Number.isFinite(cue.since("release")) ? cue.t - cue.since("release") : T.release;
    const brk = Number.isFinite(cue.since("break")) ? cue.t - cue.since("break") : T.brk;
    updLeaves(t, rel); updStones(t, rel); updMotes(t); updDust(t, rel, brk); updShards(t, brk);
  }
  return { group, update, dispose() { disposables.forEach((d) => d.dispose()); [leafM, stoneM, moteM, dustM, shardM, starM].forEach((m) => m.dispose()); } };
}
