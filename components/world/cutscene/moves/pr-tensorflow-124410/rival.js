// THE RIVAL: a silhouette against the dusk, standing on the valve tower out in the reservoir. Shape only: a tall
// swept-up pompadour, broad padded shoulders, a long flared coat and a streaming cape, one arm out with the palm
// turned up (come closer), the other bent to the brow. Ink black with a cream rim, two glints for eyes.

import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { merge, part, R } from "./ink";
import { limb } from "./stand";

export function rivalGeometry() {
  const p = [];
  // legs apart, planted
  for (const s of [-1, 1]) {
    p.push(limb([s * 0.35, 2.1, 0], [s * 0.85, 0.15, 0.1], 0.3, 0.26, R.ink, 6));
    p.push(part(new BoxGeometry(0.5, 0.2, 0.9), R.ink, { x: s * 0.9, y: 0.1, z: 0.25 }));
  }
  // the long coat, flared, and the cape streaming behind and to the side
  p.push(part(new CylinderGeometry(0.62, 1.15, 2.2, 8), R.ink, { y: 2.1 }));
  p.push(part(new BoxGeometry(2.2, 1.0, 0.07), R.standB, { x: 0, y: 1.6, z: 0.62, rx: -0.12 }));
  p.push(part(new BoxGeometry(3.4, 3.2, 0.1), R.ink, { x: 1.6, y: 3.3, z: -0.75, ry: 0.55, rz: -0.28 }));
  p.push(part(new BoxGeometry(2.6, 2.6, 0.1), R.standA, { x: 2.5, y: 3.2, z: -1.2, ry: 0.8, rz: -0.4 }));
  // torso, broad padded shoulders, high collar
  p.push(part(new CylinderGeometry(0.85, 0.62, 1.3, 8), R.ink, { y: 3.55 }));
  for (const s of [-1, 1]) p.push(part(new SphereGeometry(0.52, 8, 6), R.ink, { x: s * 0.95, y: 4.1, sy: 0.8 }));
  p.push(part(new BoxGeometry(1.7, 0.7, 0.2), R.ink, { y: 4.3, z: -0.05 }));
  // the arm out, palm up, fingers spread; the other hand to the brow
  p.push(limb([-0.95, 4.05, 0], [-2.0, 3.55, 0.7], 0.26, 0.2, R.ink, 6));
  p.push(limb([-2.0, 3.55, 0.7], [-3.05, 3.55, 1.5], 0.2, 0.15, R.ink, 6));
  p.push(part(new BoxGeometry(0.5, 0.1, 0.55), R.ink, { x: -3.25, y: 3.5, z: 1.6 }));
  for (let k = 0; k < 4; k++) p.push(part(new ConeGeometry(0.05, 0.5, 4).rotateZ(Math.PI / 2).rotateY(0.45 - k * 0.3), R.ink, { x: -3.65, y: 3.52, z: 1.7 + (k - 1.5) * 0.17 }));
  p.push(limb([0.95, 4.05, 0], [1.55, 4.7, 0.5], 0.26, 0.2, R.ink, 6));
  p.push(limb([1.55, 4.7, 0.5], [0.6, 5.35, 0.7], 0.2, 0.16, R.ink, 6));
  p.push(part(new SphereGeometry(0.2, 6, 5), R.ink, { x: 0.4, y: 5.45, z: 0.75 }));
  // the head, the swept-up pompadour, the glints
  p.push(part(new SphereGeometry(0.44, 10, 8), R.ink, { y: 5.0, z: 0.05, sy: 1.1 }));
  p.push(part(new BoxGeometry(0.2, 0.9, 1.0).rotateX(-0.55), R.ink, { y: 5.7, z: 0.12 }));
  for (let k = 0; k < 3; k++) p.push(part(new ConeGeometry(0.13, 0.9, 4), R.ink, { x: (k - 1) * 0.22, y: 6.1, z: 0.2 - k * 0.05, rx: -0.4, rz: (k - 1) * -0.3 }));
  for (const s of [-1, 1]) p.push(part(new BoxGeometry(0.2, 0.06, 0.08), R.cream, { x: s * 0.17, y: 5.05, z: 0.45, rz: s * -0.3 }));
  return merge(p);
}
