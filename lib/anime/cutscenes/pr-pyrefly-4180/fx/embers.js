// EMBERS AND LEAVES (bible FX 4): instanced cut-paper leaves and ember curls, on twos, normal blend.
// 180 instances in a 56 x 26 x 56 m box about the fox. Instance j has a base b_j, phase f_j, speed v_j.
//   life  l = fract(f_j + v_j t);   embers rise  y = y0 + 22 l;  leaves fall y = y0 + 22 (1 - l)
//   x,z drift = b + A_j sin(1.3 t + j) (the burning-village updraught), tumble = (2.4 + j%5) t about two axes.
//   fade = smooth(l/0.12) smooth((1-l)/0.2) via scale (cut paper has no alpha). Dust fibres: 90 tiny additive specks, gold #ffb04a.
// Embers #ff8a3a/#ffb04a/#b3221c curls (S shape), leaves #4a3466/#2a3a3a/#ff6b57.
import { sm, ph, addMat, disposeTree } from "./util.js";

export default function build(ctx, S) {
  const { THREE } = ctx, g = new THREE.Group(), rng = ctx.rng("pyrefly-embers");
  const leaf = new THREE.Shape(); // pointed leaf
  leaf.moveTo(0, 0.5); leaf.quadraticCurveTo(0.34, 0.12, 0, -0.5); leaf.quadraticCurveTo(-0.34, 0.12, 0, 0.5);
  const lg = new THREE.ShapeGeometry(leaf, 4); lg.scale(0.55, 0.55, 1);
  const curl = new THREE.Shape(); // ember curl: a comma
  curl.moveTo(0, 0.3); curl.bezierCurveTo(0.28, 0.3, 0.3, -0.1, 0.05, -0.28); curl.bezierCurveTo(0.2, -0.05, 0.12, 0.12, -0.02, 0.12); curl.lineTo(0, 0.3);
  const cg = new THREE.ShapeGeometry(curl, 4); cg.scale(0.7, 0.7, 1);
  const NE = 120, NL = 60;
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
  const emb = new THREE.InstancedMesh(cg, mat, NE), lea = new THREE.InstancedMesh(lg, mat.clone(), NL);
  emb.frustumCulled = lea.frustumCulled = false; g.add(emb, lea);
  const ec = ["#ff8a3a", "#ffb04a", "#b3221c", "#ffb04a"].map((c) => new THREE.Color(c)), lc = ["#4a3466", "#2a3a3a", "#ff6b57", "#4a3466"].map((c) => new THREE.Color(c));
  const mk = (n) => Array.from({ length: n }, () => ({ x: (rng() - 0.5) * 56, z: (rng() - 0.5) * 56, f: rng(), v: 0.05 + rng() * 0.08, a: 0.8 + rng() * 2.4, s: 0.6 + rng() * 0.9, c: (rng() * 4) | 0 }));
  const E = mk(NE), L = mk(NL);
  E.forEach((d, j) => emb.setColorAt(j, ec[d.c])); L.forEach((d, j) => lea.setColorAt(j, lc[d.c]));
  const NF = 90, fm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.1), addMat(THREE, { color: 0xffb04a, side: THREE.DoubleSide }), NF);
  fm.frustumCulled = false; g.add(fm); const F = mk(NF);
  const dm = new THREE.Object3D(), o = S.F;
  const place = (mesh, arr, t, rise, base, size) => {
    for (let j = 0; j < arr.length; j++) {
      const d = arr[j], l = (d.f + d.v * t) % 1, y = rise ? 22 * l : 22 * (1 - l);
      dm.position.set(o.x + d.x + d.a * Math.sin(1.3 * t + j), o.y + base + y, o.z + d.z + d.a * Math.cos(1.1 * t + j * 0.7));
      dm.rotation.set((2.4 + (j % 5)) * t * 0.5, (1.7 + (j % 3)) * t * 0.5, j);
      dm.scale.setScalar(size * d.s * sm(ph(l, 0, 0.12)) * sm(ph(1 - l, 0, 0.2)));
      dm.updateMatrix(); mesh.setMatrixAt(j, dm.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return {
    group: g,
    update(t) {
      const gain = 1 - ph(t, ctx.scene.duration - 2.2, ctx.scene.duration - 0.8); // fade as the stage folds
      g.visible = gain > 0.01;
      place(emb, E, t, true, -1, 0.7 * gain); place(lea, L, t, false, 4, 1.0 * gain); place(fm, F, t, true, -1, 1.0 * gain);
      if (emb.instanceColor) emb.instanceColor.needsUpdate = true; if (lea.instanceColor) lea.instanceColor.needsUpdate = true;
    },
    dispose() { lg.dispose(); cg.dispose(); disposeTree(g); },
  };
}
