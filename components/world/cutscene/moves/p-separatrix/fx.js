// Particles and small geometry for the Colosseum scene: pooled instanced shapes (plaster flakes, petals and
// leaves, flowers, bubbles of light, dust) and the matrix helper the move writes them with. Everything is
// built once; the move only rewrites matrices.

import { BufferGeometry, CircleGeometry, ConeGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, RingGeometry, SphereGeometry } from "three";
import { hash } from "./geo";

const D = new Object3D();
export function put(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export function putQ(m, i, x, y, z, sx, sy, sz, q, rz = 0) {
  D.position.set(x, y, z);
  D.quaternion.copy(q);
  D.rotateZ(rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export const hide = (m, i) => put(m, i, 0, -90, 0, 0.0001);
export function instanced(g, mat, n) {
  const m = new InstancedMesh(g, mat, n);
  m.frustumCulled = false;
  for (let i = 0; i < n; i++) hide(m, i);
  return m;
}
export const basic = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, side: DoubleSide, ...o });

// a flake of plaster: an irregular five-sided plate, slightly curled
export function flakeGeometry() {
  const pts = [[0, 0.62], [0.55, 0.2], [0.4, -0.5], [-0.3, -0.6], [-0.6, 0.1]];
  const pos = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    pos.push(0, 0, 0.08, a[0], a[1], 0, b[0], b[1], 0);
  }
  return new BufferGeometry().setAttribute("position", new Float32BufferAttribute(pos, 3));
}
// a petal: a pointed leaf shape in the xy plane
export function petalGeometry() {
  const pos = [0, -0.5, 0, 0.28, 0, 0, 0, 0.5, 0, 0, -0.5, 0, 0, 0.5, 0, -0.28, 0, 0];
  return new BufferGeometry().setAttribute("position", new Float32BufferAttribute(pos, 3));
}
// a small flower: five petals round a centre, on a thin stem (along +y, so it sprouts upward)
export function flowerGeometry() {
  const parts = [];
  const pos = [];
  const col = [];
  const tri = (a, b, c, rgb) => {
    pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) col.push(...rgb);
  };
  for (let k = 0; k < 5; k++) {
    const a0 = (k / 5) * Math.PI * 2;
    const a1 = ((k + 0.5) / 5) * Math.PI * 2;
    const a2 = ((k + 1) / 5) * Math.PI * 2;
    tri([0, 0.34, 0], [Math.cos(a0) * 0.16, 0.34 + Math.sin(a0) * 0.16, 0], [Math.cos(a1) * 0.24, 0.34 + Math.sin(a1) * 0.24, 0], [1, 0.62, 0.7]);
    tri([0, 0.34, 0], [Math.cos(a1) * 0.24, 0.34 + Math.sin(a1) * 0.24, 0], [Math.cos(a2) * 0.16, 0.34 + Math.sin(a2) * 0.16, 0], [1, 0.74, 0.8]);
  }
  tri([-0.05, 0.3, 0.001], [0.05, 0.3, 0.001], [0, 0.4, 0.001], [0.98, 0.78, 0.25]);
  tri([-0.012, 0, 0], [0.012, 0, 0], [0, 0.32, 0], [0.4, 0.5, 0.25]);
  void parts;
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}
export const bubbleGeometry = () => new RingGeometry(0.42, 0.5, 20);
export const dustGeometry = () => new CircleGeometry(0.5, 6);
export const sparkGeometry = () => new OctahedronGeometry(1, 0).scale(1, 0.3, 0.05);
export { ConeGeometry, SphereGeometry, hash };
