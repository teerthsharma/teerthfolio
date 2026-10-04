// Geometry helpers for the Las Noches scene: a tapered limb, and a merged part
// list turned into a shard mesh plus the smooth-normal hull its ink line is cut from.

import { BufferGeometry, CylinderGeometry, Quaternion, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { flat, shardify } from "../p-caustic/parts";

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();

// a tapered limb from a to b (r1 at a, r2 at b)
export function limb(a, b, r1, r2, seg = 6, sx = 1, sz = 1) {
  A.fromArray(a);
  B.fromArray(b);
  const len = A.distanceTo(B);
  const g = new CylinderGeometry(r2, r1, len, seg, 1).scale(sx, 1, sz);
  g.applyQuaternion(Q.setFromUnitVectors(UP, B.clone().sub(A).normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

// a merged part list: the shard mesh, and the smooth-normal hull the ink line is cut from
export function solid(parts, jitter = 0) {
  const merged = mergeGeometries(parts.map(flat));
  const bare = new BufferGeometry();
  bare.setAttribute("position", merged.attributes.position.clone());
  const hull = mergeVertices(bare, 1e-3);
  hull.computeVertexNormals();
  return { g: shardify(merged, jitter), hull };
}
