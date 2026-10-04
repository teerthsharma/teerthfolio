// THE ULTRA INSTINCT CROWN: eight silver-white spikes on top of the round skull, swept up and back.
// Head frame (as p-caustic's hair): skull centre, +z the nose, +y up, radii ~ (0.52, 0.47, 0.5).
// Bases sit on the crown behind the brow line (z <= 0.1), so the face stays bare and nothing hangs down the back.
import { ConeGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { flat } from "./util";

const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();

export function buildHair() {
  const parts = [];
  const N = 8;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1) - 0.5; // -0.5..0.5 across the crown
    const len = 0.62 - Math.abs(u) * 0.34 + (i % 2) * 0.07;
    const x = u * 0.62;
    const y = Math.sqrt(Math.max(0.05, 1 - (x / 0.52) ** 2)) * 0.45; // on the skull's upper surface
    const z = -0.06 - 0.12 * (i % 3) * 0.5;
    const dir = new Vector3(u * 1.1, 1, -0.75).normalize(); // up, fanned out, swept back
    const g = new ConeGeometry(0.1 - Math.abs(u) * 0.03, len, 5).translate(0, len / 2 - 0.05, 0);
    g.applyQuaternion(Q.setFromUnitVectors(UP, dir));
    g.translate(x, y, z);
    parts.push(flat(g));
  }
  const geometry = mergeGeometries(parts);
  const material = new MeshBasicMaterial({ color: "#eef3ff", toneMapped: false, fog: false });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const group = new Group();
  group.add(mesh);
  group.visible = false;
  return {
    group,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
