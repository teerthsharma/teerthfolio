// Small helpers the Tournament of Power scene builds from: instancing, hashes, flat geometry,
// a limb, and sRGB picks (every colour here is picked as the hex reads and written raw).

import { CylinderGeometry, InstancedMesh, Object3D, Quaternion, Vector3 } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const D = new Object3D();
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const srgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const ease = (x) => x * x * (3 - 2 * x);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export function put(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export const hide = (m, i) => put(m, i, 0, -90, 0, 0.0001);
export function inst(g, m, n) {
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  return mesh;
}
// non-indexed, no uv or normal: faceted, ready to merge
export const flat = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};
// a smooth-normalled twin of a merged mesh, for its ink outline
export function hullOf(g) {
  const h = g.clone();
  h.deleteAttribute("uv");
  h.deleteAttribute("normal");
  const m = mergeVertices(h, 1e-3);
  m.computeVertexNormals();
  return m;
}
const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
export function limb(a, b, r1, r2, seg = 6) {
  A.fromArray(a);
  B.fromArray(b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), seg, 1);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
