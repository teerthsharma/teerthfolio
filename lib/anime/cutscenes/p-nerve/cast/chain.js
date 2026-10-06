// HANDCUFF CHAIN (ep 25 stairs frame, 01-ep25-foot-scene.jpg): 56 links of 0.09 m from L's left cuff to the hero's left cuff, span about 3.5 m,
// a catenary sag y = -0.4 * 4u(1-u) (u 0..1) clamped to the deck (y >= 0.03), links alternate 90 deg about the tangent, #c9cdd1 / #565c64 (two instance colours),
// and the amber witness ring #e8a23a (r 0.3 m) at the one crossing (u = 0.5) that pulses on each toll (+30 percent, e^-5 s).
// Instanced MeshBasic with the ink-dark #14171b shown by a slightly larger black back-hull instance set (cheap contour).
import { Color, InstancedMesh, MeshBasicMaterial, Object3D, TorusGeometry, Vector3, Quaternion, Group } from "three";
import { L1, mesh, decay, sinceToll } from "./util.js";

const N = 56;
export function buildChain(ctx, lseal, heroCuff) {
  const g = new Group();
  const geo = new TorusGeometry(0.035, 0.009, 5, 10).scale(1.25, 1, 1);
  const links = new InstancedMesh(geo, new MeshBasicMaterial({ color: "#ffffff" }), N);
  const hull = new InstancedMesh(new TorusGeometry(0.035, 0.0135, 5, 10).scale(1.28, 1.1, 1), new MeshBasicMaterial({ color: "#14171b" }), N);
  const lit = new Color("#c9cdd1"), dark = new Color("#565c64");
  for (let i = 0; i < N; i++) links.setColorAt(i, i % 2 ? dark : lit);
  g.add(hull, links);
  const ring = mesh(new TorusGeometry(0.3, 0.014, 6, 28), "#e8a23a"); g.add(ring);
  const a = new Vector3(), b = new Vector3(), p = new Vector3(), q = new Vector3(), tan = new Vector3(), o = new Object3D(), X = new Vector3(1, 0, 0), qq = new Quaternion();
  L1(g);
  return {
    root: g,
    update(t, cue) {
      g.visible = t >= 1.6;
      if (!g.visible) return;
      lseal.group.updateMatrixWorld(true); ctx.seal.group.updateMatrixWorld(true);
      lseal.body.localToWorld(a.set(...heroCuff.l)); ctx.seal.body.localToWorld(b.set(...heroCuff.h));
      const pt = (u, out) => { out.lerpVectors(a, b, u); out.y = Math.max(0.03, out.y - 0.4 * 4 * u * (1 - u)); return out; };
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N;
        pt(u, p); pt(Math.min(1, u + 0.01), q); tan.copy(q).sub(p).normalize();
        o.position.copy(p); qq.setFromUnitVectors(X, tan); o.quaternion.copy(qq); if (i % 2) o.rotateX(Math.PI / 2);
        o.updateMatrix(); links.setMatrixAt(i, o.matrix); hull.setMatrixAt(i, o.matrix);
      }
      links.instanceMatrix.needsUpdate = hull.instanceMatrix.needsUpdate = true; if (links.instanceColor) links.instanceColor.needsUpdate = true;
      // the amber ring at the crossing, facing along the chain, pulsing on each toll
      pt(0.5, ring.position); pt(0.52, q); tan.copy(q).sub(ring.position).normalize();
      ring.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), tan);
      ring.scale.setScalar(1 + 0.3 * decay(sinceToll(cue, t), 5));
    },
    dispose() { geo.dispose(); links.material.dispose(); hull.material.dispose(); },
  };
}
