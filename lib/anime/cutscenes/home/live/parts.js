// Copied from components/world/cutscene/moves/p-caustic/parts.js: the parts the home move uses; its notes live with the original.
import { InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from "three";

const D = new Object3D();
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, ...o });
export function put(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export const hide = (m, i) => put(m, i, 0, -50, 0, 0.0001);
export function inst(g, m, n) {
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  return mesh;
}
export function flashQuad(color = "#ffffff") {
  const m = new Mesh(new PlaneGeometry(1, 1), mat({ color, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  m.renderOrder = 40;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}
export function holdFlash(m, camera, k) {
  m.visible = k > 0.002;
  if (!m.visible) return;
  m.material.opacity = Math.min(1, k);
  camera.getWorldDirection(m.position);
  m.position.multiplyScalar(1).add(camera.position);
  m.quaternion.copy(camera.quaternion);
  const h = 2 * Math.tan((camera.fov * Math.PI) / 360) * 1.2;
  m.scale.set(h * camera.aspect, h, 1);
}
