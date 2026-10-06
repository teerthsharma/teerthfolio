// CHAIN OF 208 LINKS (bible FX 2): beads, hoop at link 100, coral surge links 101-208, burst.
// Kushina's Adamantine chains as an instanced helix about the fox. Link i (0..207), u = i/207:
//   a_i = 2pi * 3.2 u,  R_i = 6.4 - 1.8u - squeeze,  P_i = F + R_i (cos a_i * side + sin a_i * toSeal) + (1 + 9u) up
//   tangent T = P(u+e) - P(u), radial Rr = (cos a, 0, sin a); link axis alternates Rr / (T x Rr) so rings interlock.
//   appears at t_i = tChain + 1.0 u (24 frames), pops over 3 frames (scale ease).
// Colour: gold #f0c840 / #ffb04a alternating; hoop (violet #3a2a6a) shuts at link 100; surge front w = 101 + 107 ph(t, tSurge, +1.5)
//   paints links coral #ff6b57; burst at tBurst throws 96 shards + a ring, links pulse out R += 1.6 e^(-6 dt) and settle 45% coral.
// Each link = gold torus (stadium via x scale 1.5) + a BackSide hull in #5a3a08 = the 3 px dark rim that makes it read as chain.
// Steps on twos (the engine passes stepped t). Burst/sink are pure functions of t.
import { ph, sm, startOf, glowTex, spriteMat, disposeTree } from "./util.js";

const N = 208;
export default function build(ctx, S) {
  const { THREE } = ctx, g = new THREE.Group(), rng = ctx.rng("pyrefly-chain");
  const link = new THREE.TorusGeometry(0.34, 0.11, 6, 14), hullG = new THREE.TorusGeometry(0.34, 0.16, 6, 14);
  const goldM = new THREE.MeshBasicMaterial({ toneMapped: false }), hullM = new THREE.MeshBasicMaterial({ color: 0x5a3a08, side: THREE.BackSide, toneMapped: false });
  const gold = new THREE.InstancedMesh(link, goldM, N), hull = new THREE.InstancedMesh(hullG, hullM, N);
  gold.frustumCulled = hull.frustumCulled = false;
  g.add(hull, gold);
  // hoop: 72 beads on a ring; violet with a cream hull
  const HB = 72, bead = new THREE.SphereGeometry(0.3, 8, 6), bhull = new THREE.SphereGeometry(0.42, 8, 6);
  const hoop = new THREE.InstancedMesh(bead, new THREE.MeshBasicMaterial({ color: 0x3a2a6a, toneMapped: false }), HB);
  const hoopH = new THREE.InstancedMesh(bhull, new THREE.MeshBasicMaterial({ color: 0xf6ecd6, side: THREE.BackSide, toneMapped: false }), HB);
  hoop.frustumCulled = hoopH.frustumCulled = false; g.add(hoopH, hoop);
  // burst shards (diamond cut paper) + shock ring + flash
  const SH = 96, shard = new THREE.PlaneGeometry(0.5, 0.5);
  shard.rotateZ(Math.PI / 4); shard.scale(0.55, 1.2, 1);
  const shards = new THREE.InstancedMesh(shard, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), SH);
  shards.frustumCulled = false; g.add(shards);
  const sd = Array.from({ length: SH }, () => ({ a: rng() * 6.2832, e: (rng() - 0.35) * 1.6, v: 8 + rng() * 14, s: 0.6 + rng() * 1.3, c: rng() < 0.6 ? 0 : 1, sp: rng() * 9 }));
  const gl = glowTex(THREE, 1.6);
  const ringC = document.createElement("canvas"); ringC.width = ringC.height = 128; const rx = ringC.getContext("2d");
  rx.strokeStyle = "#fff"; rx.lineWidth = 6; rx.shadowColor = "#fff"; rx.shadowBlur = 8; rx.beginPath(); rx.arc(64, 64, 52, 0, 6.2832); rx.stroke();
  const ringT = new THREE.CanvasTexture(ringC);
  const ring = new THREE.Sprite(spriteMat(THREE, ringT, { color: 0xff6b57, opacity: 0 })); g.add(ring);
  const flash = new THREE.Sprite(spriteMat(THREE, gl, { color: 0xfff6dc, opacity: 0 })); g.add(flash);
  const snap = new THREE.Sprite(spriteMat(THREE, gl, { color: 0x9a86ff, opacity: 0 })); g.add(snap);

  const gC = new THREE.Color(0xf0c840), gC2 = new THREE.Color(0xffb04a), coral = new THREE.Color(0xff6b57), tmp = new THREE.Color();
  const sc = [new THREE.Color(0xff6b57), new THREE.Color(0xf0c840)];
  const dm = new THREE.Object3D(), m4 = new THREE.Matrix4(), X = new THREE.Vector3(), Yv = new THREE.Vector3(), Z = new THREE.Vector3();
  const P = (u, sq, out) => {
    const a = 6.2832 * 3.2 * u, R = 6.4 - 1.8 * u - sq;
    out.copy(S.F).addScaledVector(S.side, Math.cos(a) * R).addScaledVector(S.toSeal, Math.sin(a) * R); out.y += 1 + 9 * u; return a;
  };
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), rad = new THREE.Vector3(), tg = new THREE.Vector3();
  const hoopU = 100 / (N - 1);

  return {
    group: g,
    update(t, dt, cue) {
      const c0 = startOf(cue, "chain", 7.92), s0 = startOf(cue, "surge", 9.2), tb = startOf(cue, "burst", s0 + 1.5);
      const sink = ph(t, ctx.scene.duration - 1.8, ctx.scene.duration - 0.8); // stage lowered through the floor
      g.position.y = -16 * sm(sink);
      g.visible = t >= c0 - 0.05;
      if (!g.visible) return;
      const surgeK = ph(t, s0, s0 + 1.5), w = 101 + 107 * surgeK;
      const bt = Math.max(0, t - tb), kick = t >= tb ? 1.6 * Math.exp(-6 * bt) : 0;
      const sq = 0.5 * sm(surgeK) * (t < tb ? 1 : 0) + kick * -1;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1), ti = c0 + 1.0 * u, k = sm(ph(t, ti, ti + 0.25));
        if (k <= 0) { dm.scale.setScalar(0); dm.updateMatrix(); gold.setMatrixAt(i, dm.matrix); hull.setMatrixAt(i, dm.matrix); continue; }
        const a = P(u, sq, p0); P(Math.min(1, u + 0.004), sq, p1); tg.copy(p1).sub(p0).normalize();
        rad.set(0, 0, 0).addScaledVector(S.side, Math.cos(a)).addScaledVector(S.toSeal, Math.sin(a));
        if (i & 1) { Z.copy(rad); } else { Z.crossVectors(tg, rad).normalize(); }
        X.copy(tg); Yv.crossVectors(Z, X).normalize();
        m4.makeBasis(X, Yv, Z); dm.quaternion.setFromRotationMatrix(m4);
        const tr = 0.07 * Math.sin(t * 40 + i) * Math.max(0, 1 - Math.abs(t - c0) / 4); // chain tremble
        dm.position.copy(p0).addScaledVector(rad, tr);
        dm.scale.set(1.5 * k, k, k); dm.updateMatrix(); gold.setMatrixAt(i, dm.matrix); hull.setMatrixAt(i, dm.matrix);
        tmp.copy(i & 1 ? gC2 : gC);
        if (i >= 100 && i < w) tmp.lerp(coral, t >= tb ? 0.45 : 1); // surge front
        gold.setColorAt(i, tmp);
      }
      gold.instanceMatrix.needsUpdate = hull.instanceMatrix.needsUpdate = true; if (gold.instanceColor) gold.instanceColor.needsUpdate = true;
      // hoop shuts at link 100: beads sweep round the ring over 0.25 s
      const th = c0 + 1.0 * hoopU, hk = ph(t, th, th + 0.25), nb = Math.floor(HB * hk), R100 = 6.4 - 1.8 * hoopU + 1.1 - 0.5 * sm(surgeK) * (t < tb ? 1 : 0);
      for (let b = 0; b < HB; b++) {
        const aa = (b / HB) * 6.2832, on = b < nb ? 1 : 0;
        dm.quaternion.identity(); dm.scale.setScalar(on); dm.position.copy(S.F).addScaledVector(S.side, Math.cos(aa) * R100).addScaledVector(S.toSeal, Math.sin(aa) * R100); dm.position.y += 1 + 9 * hoopU;
        dm.updateMatrix(); hoop.setMatrixAt(b, dm.matrix); hoopH.setMatrixAt(b, dm.matrix);
      }
      hoop.instanceMatrix.needsUpdate = hoopH.instanceMatrix.needsUpdate = true;
      const hc = S.F.clone(); hc.y += 1 + 9 * hoopU;
      snap.position.copy(hc); snap.scale.setScalar(16); snap.material.opacity = 0.7 * (1 - ph(t, th + 0.25, th + 0.6)) * (t >= th + 0.25 ? 1 : 0);
      // burst: shards, ring, flash at the pin
      const ctr = S.F.clone(); ctr.y += 6;
      for (let s = 0; s < SH; s++) {
        const d = sd[s], on = t >= tb && bt < 1.6 ? 1 : 0, r = d.v * (1 - Math.exp(-3 * bt)) / 3, fall = -4 * bt * bt;
        dm.position.set(ctr.x + Math.cos(d.a) * r * S.side.x + Math.sin(d.a) * r * S.toSeal.x, ctr.y + Math.sin(d.e) * r + fall, ctr.z + Math.cos(d.a) * r * S.side.z + Math.sin(d.a) * r * S.toSeal.z);
        dm.rotation.set(d.sp * bt, d.sp * 0.7 * bt, d.a); dm.scale.setScalar(on * d.s * (1 - ph(bt, 1.0, 1.6)));
        dm.updateMatrix(); shards.setMatrixAt(s, dm.matrix); shards.setColorAt(s, sc[d.c]);
      }
      shards.instanceMatrix.needsUpdate = true; if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
      ring.position.copy(ctr); ring.scale.setScalar(2 + 34 * (1 - Math.exp(-4 * bt))); ring.material.opacity = t >= tb ? 0.85 * (1 - ph(bt, 0, 0.7)) : 0;
      flash.position.copy(ctr); flash.scale.setScalar(26 * (1 - ph(bt, 0, 0.35)) + 4); flash.material.opacity = t >= tb ? 0.8 * (1 - ph(bt, 0, 0.3)) : 0;
    },
    dispose() { gl.dispose(); ringT.dispose(); [link, hullG, bead, bhull, shard].forEach((x) => x.dispose()); disposeTree(g); },
  };
}
