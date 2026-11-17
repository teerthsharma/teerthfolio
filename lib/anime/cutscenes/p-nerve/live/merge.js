// Merges the static opaque meshes of a group that share one material into one mesh per material (fewer draw calls).
// The per-triangle aCenter attribute moves with the geometry, so the break's shatter keeps each triangle's own centre.
import { Mesh, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const P = new Vector3();

export function mergeByMaterial(group) {
  const byMat = new Map();
  for (const c of group.children) {
    if (!c.isMesh || c.isInstancedMesh || c.userData.merge !== true) continue;
    if (!byMat.has(c.material)) byMat.set(c.material, []);
    byMat.get(c.material).push(c);
  }
  let merged = 0;
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const geos = list.map((c) => {
      c.updateMatrix();
      const g = c.geometry.clone().applyMatrix4(c.matrix);
      const cen = g.attributes.aCenter;
      for (let i = 0; i < cen.count; i++) cen.setXYZ(i, ...P.fromBufferAttribute(cen, i).applyMatrix4(c.matrix).toArray());
      return g;
    });
    const m = new Mesh(mergeGeometries(geos, false), mat);
    m.renderOrder = list[0].renderOrder;
    m.layers.mask = list[0].layers.mask;
    m.frustumCulled = true;
    m.userData.cull = true;
    m.geometry.computeBoundingSphere();
    for (const c of list) {
      group.remove(c);
      c.geometry.dispose();
    }
    group.add(m);
    merged += list.length;
  }
  return merged;
}
