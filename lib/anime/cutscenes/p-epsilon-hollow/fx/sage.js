// The Great Sage panel placement (spawn-seal.jsx `sage`): parked top-left of the frame, facing the lens, flickering on its own clock.
import { Vector3 } from "three";
import { smooth } from "../clock.js";

const V = new Vector3();

export function placeSage(p, cam, k, t) {
  p.mesh.visible = k > 0.01;
  if (!p.mesh.visible) return;
  const d = 6, hh = d * Math.tan((cam.fov * Math.PI) / 360), hw = hh * cam.aspect, w = Math.min(hw * 0.62, hh * 2 * 1.2);
  V.set(-hw * 0.94 + w / 2, hh * 0.72 - (w * 0.2545) / 2 + 0.03 * Math.sin(2 * t), -d).applyMatrix4(cam.matrixWorld);
  p.mesh.position.copy(V);
  p.mesh.quaternion.copy(cam.quaternion);
  p.mesh.scale.setScalar(w * (0.9 + 0.1 * k));
  p.mat.opacity = k * (0.9 + 0.1 * Math.sin(40 * t));
}

export function sageK(t) {
  return [smooth(1.3, 1.8, t) * (1 - smooth(5.6, 6.0, t)), smooth(14.4, 14.9, t) * (1 - smooth(18.0, 18.5, t))];
}
