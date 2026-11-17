// EA for pr-polychrom-79: the live's Ea (black drill-sword, flat gold guard, three red-runed segments turning) placed in camera space, with a gold fist and forearm holding it.
// The blade group scales with the draw; the arm group stays at world size so the forearm keeps its 3 m and runs off the lower-right frame edge.
// The cast layer sits at the dock, so the camera pose is mapped into the parent's space before placing anything.
import { BoxGeometry, CylinderGeometry, Group, Matrix4, Mesh, PlaneGeometry, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { runeMaterial } from "../live/vault.js";
import { goldMaterial, paint, portalMaterial } from "../live/set.js";
import { inst, mat, put } from "../live/parts.js";
import { smooth } from "../clock.js";
import { PAL } from "../pal.js";
import { eaFrame } from "./eaframe.js";

const UP = new Vector3(0, 1, 0), P = new Vector3(), A = new Vector3(), PARENT = new Matrix4(), POSE = new Matrix4();
const stepped = (t) => Math.floor(t * 12 + 1e-6) / 12;
const clean = (g) => { const n = g.toNonIndexed(); n.deleteAttribute("uv"); return n; };

export function buildEa(ctx) {
  const root = new Group(), blade = new Group(), arm = new Group();
  const core = mergeGeometries([
    new CylinderGeometry(0.06, 0.06, 1.4, 10).translate(0, 0.7, 0),
    new CylinderGeometry(0.06, 0.07, 0.34, 10).translate(0, 0.05, 0),
    new SphereGeometry(0.09, 10, 8).translate(0, -0.14, 0),
    new CylinderGeometry(0.035, 0.13, 0.24, 12).translate(0, 1.5, 0),
  ].map(clean));
  const guard = new BoxGeometry(0.5, 0.045, 0.09).translate(0, 0.25, 0);
  const seg = new CylinderGeometry(0.095, 0.095, 0.3, 16, 1, false).translate(0, 0.15, 0);
  const black = mat({ color: PAL.eaBlack }), guardMat = mat({ color: PAL.goldHi }), gold = goldMaterial(), rune = runeMaterial(), red = mat({ color: PAL.vest });
  blade.add(new Mesh(core, black), new Mesh(guard, guardMat));
  const segs = [0.34, 0.68, 1.02].map((y) => {
    const m = new Mesh(seg, rune);
    m.position.y = y;
    blade.add(m);
    return m;
  });

  const fist = new Mesh(paint(new SphereGeometry(0.1, 14, 10), PAL.goldLo, PAL.goldHi, 0.2), gold);
  const vambrace = new Mesh(paint(new CylinderGeometry(0.11, 0.11, 0.6, 14), PAL.goldLo, PAL.goldHi, 0.6).translate(0, -0.3, 0), gold);
  const sleeve = new Mesh(new CylinderGeometry(0.1, 0.1, 2.4, 12).translate(0, -1.8, 0), red);
  arm.add(fist, vambrace, sleeve);

  const portal = inst(new PlaneGeometry(1, 1), portalMaterial(), 1);
  put(portal, 0, 0, 0, 0, 1.0);
  portal.instanceMatrix.needsUpdate = true;
  portal.visible = false;
  root.add(blade, arm, portal);

  return {
    group: root,
    update(t, cam) {
      const f = eaFrame(t, cam.fov, cam.aspect);
      root.visible = f.on;
      cam.updateWorldMatrix(true, false);
      if (root.parent) root.parent.updateWorldMatrix(true, false);
      PARENT.copy(root.parent ? root.parent.matrixWorld : new Matrix4()).invert();
      POSE.multiplyMatrices(PARENT, cam.matrixWorld);
      P.set(f.hilt[0], f.hilt[1], -f.hilt[2]).applyMatrix4(POSE);
      A.set(f.axis[0], f.axis[1], -f.axis[2]).transformDirection(POSE);
      blade.position.copy(P);
      arm.position.copy(P);
      blade.quaternion.setFromUnitVectors(UP, A);
      arm.quaternion.copy(blade.quaternion);
      blade.scale.setScalar(Math.max(f.s * f.draw, 0.01));
      segs.forEach((m, i) => { m.rotation.y = stepped(t) * (6 + 3 * i) * (i % 2 ? -1 : 1); });
      rune.uniforms.uTime.value = t;
      const k = 0.9 * smooth(14.4, 14.9, t) * (1 - smooth(16.4, 16.6, t));
      portal.visible = k > 0.001;
      portal.position.copy(P);
      portal.quaternion.setFromRotationMatrix(POSE);
      portal.scale.setScalar(Math.max(k, 0.001));
      portal.material.uniforms.uTime.value = t;
    },
    dispose() {
      root.traverse((o) => o.geometry?.dispose?.());
      for (const m of [black, guardMat, gold, rune, red, portal.material]) m.dispose();
      root.removeFromParent();
    },
  };
}
