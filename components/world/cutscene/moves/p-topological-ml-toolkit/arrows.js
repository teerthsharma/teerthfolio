// THE VECTOR ARROWS: the hero graphic. A pool of electric-white arrows, each a
// round shaft and a cone head with a deep-blue ink hull behind it (an inverted
// hull, so the line stays crisp on a bright sky). Four instanced meshes for
// every arrow in the scene (shot arrows, wind arrows, the feature grid); an
// arrow is set by a base point, a direction, a length and a thickness.
// Nothing allocates after the pool is built.

import { BackSide, ConeGeometry, CylinderGeometry, InstancedMesh, MeshBasicMaterial, Object3D, Quaternion, Vector3 } from "three";
import { INK } from "./shade";

const Z = new Vector3(0, 0, 1);
const Q = new Quaternion();
const D = new Object3D();
const P = new Vector3();

export function arrowPool(n) {
  const shaftG = new CylinderGeometry(1, 1, 1, 8, 1).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const headG = new ConeGeometry(1, 1, 10).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const fill = new MeshBasicMaterial({ color: "#f6fbff", toneMapped: false, fog: false });
  const hull = new MeshBasicMaterial({ color: INK, toneMapped: false, fog: false, side: BackSide });
  const mk = (g, m) => {
    const mesh = new InstancedMesh(g, m, n);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    return mesh;
  };
  const shaft = mk(shaftG, fill);
  const shaftHull = mk(shaftG, hull);
  const head = mk(headG, fill);
  const headHull = mk(headG, hull);
  const meshes = [shaftHull, shaft, headHull, head];
  const put = (m, i, x, y, z, q, sx, sy, sz) => {
    D.position.set(x, y, z);
    D.quaternion.copy(q);
    D.scale.set(sx, sy, sz);
    D.updateMatrix();
    m.setMatrixAt(i, D.matrix);
  };
  const pool = {
    meshes,
    // base (bx, by, bz), unit direction (dx, dy, dz), length, thickness (the shaft's radius)
    set(i, bx, by, bz, dx, dy, dz, len, th) {
      Q.setFromUnitVectors(Z, P.set(dx, dy, dz));
      const hl = Math.max(len * 0.3, th * 3.2);
      const sl = Math.max(len - hl, 0.001);
      const hr = th * 2.5;
      put(shaft, i, bx, by, bz, Q, th, th, sl);
      put(shaftHull, i, bx - dx * th * 0.7, by - dy * th * 0.7, bz - dz * th * 0.7, Q, th * 1.7, th * 1.7, sl + th * 1.4);
      put(head, i, bx + dx * sl, by + dy * sl, bz + dz * sl, Q, hr, hr, hl);
      put(headHull, i, bx + dx * (sl - th * 0.5), by + dy * (sl - th * 0.5), bz + dz * (sl - th * 0.5), Q, hr * 1.38, hr * 1.38, hl + th * 2.2);
    },
    hide(i) {
      Q.identity();
      for (const m of meshes) put(m, i, 0, -90, 0, Q, 0.0001, 0.0001, 0.0001);
    },
    commit() {
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const m of meshes) m.dispose();
      shaftG.dispose();
      headG.dispose();
      fill.dispose();
      hull.dispose();
    },
  };
  for (let i = 0; i < n; i++) pool.hide(i);
  pool.commit();
  return pool;
}
