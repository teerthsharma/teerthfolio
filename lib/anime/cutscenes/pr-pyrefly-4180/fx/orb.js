// KURAMA FX: roar rings, the dark orb gathering, the Eight Trigrams belly seal (easter egg 3, 7.9 s).
// Roar (tRoar = 2.3 s, 2.3 s long): paper-cut shock rings leave the mouth every 0.42 s,
//   radius r = 2 + 30 e1(k), alpha = 0.5 (1-k)^1.5, coloured Kurama red #b3221c over ember #ff8a3a. One trauma(0.7) kick at tRoar.
// Orb (3.6 s -> 7.2 s): dark core #140a10 radius r = 0.4 + 2.6 smooth(k); a BackSide red hull #e02020 (radius 1.18) gives the rim;
//   24 inward motes: p = mouth + dir_j * (9 (1 - fract(k*3 + j/24))), pulled to the core; the orb dies in a coral flash at 7.2 s (the throw).
// Trigram seal: additive cream sprite on the belly, alpha = 0.55 smooth(7.9..8.3) (1 - smooth(10.7..11.4)), slow spin 0.35 rad/s.
import { ph, sm, startOf, addMat, glowTex, spriteMat, trigramTex, disposeTree } from "./util.js";

export default function build(ctx, S) {
  const { THREE } = ctx, g = new THREE.Group(), rng = ctx.rng("pyrefly-orb");
  const gl = glowTex(THREE, 1.8), tri = trigramTex(THREE);
  const ringC = document.createElement("canvas"); ringC.width = ringC.height = 128;
  const x = ringC.getContext("2d"); x.strokeStyle = "#fff"; x.lineWidth = 10; x.beginPath(); x.arc(64, 64, 54, 0, 6.2832); x.stroke();
  const ringT = new THREE.CanvasTexture(ringC);
  const rings = Array.from({ length: 6 }, (_, i) => { const s = new THREE.Sprite(spriteMat(THREE, ringT, { color: i & 1 ? 0xff8a3a : 0xb3221c, opacity: 0 })); g.add(s); return s; });
  const sph = new THREE.SphereGeometry(1, 16, 12);
  const core = new THREE.Mesh(sph, new THREE.MeshBasicMaterial({ color: 0x140a10, toneMapped: false })); core.visible = false;
  const rim = new THREE.Mesh(sph, new THREE.MeshBasicMaterial({ color: 0xe02020, side: THREE.BackSide, toneMapped: false })); rim.visible = false;
  const halo = new THREE.Sprite(spriteMat(THREE, gl, { color: 0xb3221c, opacity: 0 })); g.add(core, rim, halo);
  const MOTES = 24, mg = new THREE.PlaneGeometry(0.4, 0.4);
  const motes = new THREE.InstancedMesh(mg, addMat(THREE, { color: 0xff8a3a, side: THREE.DoubleSide }), MOTES); motes.frustumCulled = false; g.add(motes);
  const dirs = Array.from({ length: MOTES }, () => new THREE.Vector3(rng() - 0.5, rng() - 0.3, rng() - 0.5).normalize());
  const belly = new THREE.Sprite(spriteMat(THREE, tri, { color: 0xfdf8e0, opacity: 0 })); belly.scale.setScalar(5.2); belly.position.copy(S.belly); g.add(belly);
  const flash = new THREE.Sprite(spriteMat(THREE, gl, { color: 0xff6b57, opacity: 0 })); g.add(flash);
  const dm = new THREE.Object3D();
  let prevT = -1;

  return {
    group: g,
    update(t, dt, cue) {
      const tr = startOf(cue, "roar", 2.3), to = startOf(cue, "orb", 3.6);
      const tEnd = Math.max(to + 3, 7.2);
      if (prevT < tr && cue.t >= tr && cue.t - tr < 0.25 && ctx.sakuga && ctx.sakuga.trauma) ctx.sakuga.trauma(0.7); // roar shake
      prevT = cue.t;
      for (let i = 0; i < rings.length; i++) { // roar rings every 0.42 s over 2.3 s
        const k = (t - (tr + 0.42 * i)) / 1.1, r = rings[i];
        if (k <= 0 || k >= 1 || t > tr + 2.3 + 0.2) { r.material.opacity = 0; continue; }
        const e = 1 - Math.pow(1 - k, 3);
        r.position.copy(S.mouth).addScaledVector(S.toSeal, 1 + 8 * e); r.scale.setScalar(2 + 30 * e); r.material.opacity = 0.5 * Math.pow(1 - k, 1.5);
      }
      const ok = ph(t, to, tEnd), alive = t >= to && t < tEnd;
      core.visible = rim.visible = alive; motes.visible = alive;
      if (alive) {
        const r = 0.4 + 2.6 * sm(ok), c = S.mouth.clone().addScaledVector(S.toSeal, 1.5); c.y += 0.4 * Math.sin(t * 5);
        core.position.copy(c); rim.position.copy(c); core.scale.setScalar(r); rim.scale.setScalar(r * 1.18);
        halo.position.copy(c); halo.scale.setScalar(r * 6); halo.material.opacity = 0.35 * ok + 0.1;
        for (let j = 0; j < MOTES; j++) {
          const f = (ok * 3 + j / MOTES) % 1, d = 9 * (1 - f) + r;
          dm.position.copy(c).addScaledVector(dirs[j], d); dm.scale.setScalar(sm(f) * (1 - f * 0.4) + 0.05); dm.rotation.set(0, 0, j + t * 4); dm.updateMatrix(); motes.setMatrixAt(j, dm.matrix);
        }
        motes.instanceMatrix.needsUpdate = true;
        flash.material.opacity = 0;
      } else {
        halo.material.opacity = 0;
        const fk = ph(t, tEnd, tEnd + 0.3); // coral flash as the orb is spent
        flash.position.copy(S.mouth).addScaledVector(S.toSeal, 1.5); flash.scale.setScalar(10 + 20 * fk); flash.material.opacity = t >= tEnd && fk < 1 ? 0.6 * (1 - fk) : 0;
      }
      const b0 = startOf(cue, "trigram", 7.9), b1 = startOf(cue, "burst", 10.7);
      belly.material.opacity = 0.55 * sm(ph(t, b0, b0 + 0.4)) * (1 - sm(ph(t, b1, b1 + 0.7))); belly.material.rotation = 0.35 * t;
    },
    dispose() { gl.dispose(); tri.dispose(); ringT.dispose(); sph.dispose(); mg.dispose(); disposeTree(g); },
  };
}
