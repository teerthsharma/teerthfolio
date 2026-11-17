import { BoxGeometry, ConeGeometry, CylinderGeometry, Quaternion, SphereGeometry, Vector3 } from "three";
import { merge, part, R } from "./ink.js";
const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();
const A = new Vector3();
const B = new Vector3();
export function limb(a, b, r1, r2, role, seg = 8) {
  A.fromArray(a);
  B.fromArray(b);
  const len = A.distanceTo(B);
  const g = new CylinderGeometry(r2, r1, len, seg);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  return part(g, role, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2 });
}
const ball = (r, w = 12, h = 9) => new SphereGeometry(r, w, h);
export function standGeometry() {
  const p = [];
  for (const s of [-1, 1]) {
    p.push(limb([s * 0.85, 0.3, 0], [s * 0.95, 3.5, 0], 0.75, 0.62, R.standA));
    p.push(part(ball(0.7), R.standB, { x: s * 0.9, y: 2.0, z: 0.28, sy: 0.9 }));
    for (const y of [0.9, 1.3]) p.push(part(new CylinderGeometry(0.78, 0.8, 0.18, 10), R.standB, { x: s * 0.86, y }));
    p.push(part(new BoxGeometry(1.15, 0.5, 2.0), R.standB, { x: s * 0.86, y: 0.25, z: 0.35 }));
  }
  p.push(part(ball(1.0), R.standA, { y: 3.55, sx: 1.55, sy: 0.7, sz: 0.95 }));
  p.push(part(new CylinderGeometry(1.35, 1.3, 0.42, 14), R.standB, { y: 4.0, sz: 0.74 }));
  p.push(part(ball(0.42), R.cream, { y: 4.0, z: 0.98, sz: 0.4 }));
  for (const s of [-1, 1]) p.push(part(ball(0.07, 6, 5), R.ink, { x: s * 0.14, y: 4.05, z: 1.16 }));
  p.push(part(ball(0.09, 6, 5), R.ink, { y: 3.93, z: 1.17 }));
  p.push(part(new CylinderGeometry(1.15, 1.0, 1.3, 14), R.standA, { y: 4.85, sz: 0.78 }));
  for (const y of [4.45, 4.85, 5.25]) for (const s of [-1, 1]) p.push(part(new BoxGeometry(0.85, 0.12, 0.22), R.ink, { x: s * 0.46, y, z: 0.8, rx: 0.05 }));
  p.push(part(ball(1.0), R.standA, { y: 6.05, sx: 1.8, sy: 1.3, sz: 1.0 }));
  for (const s of [-1, 1]) p.push(part(ball(0.9), R.standB, { x: s * 0.95, y: 6.2, z: 0.62, sx: 1, sy: 0.72, sz: 0.52 }));
  p.push(part(new BoxGeometry(0.12, 1.1, 0.2), R.ink, { y: 5.95, z: 1.03 }));
  for (const s of [-1, 1]) {
    p.push(part(ball(1.0), R.standB, { x: s * 2.1, y: 6.75, sx: 1.05, sy: 0.85 }));
    p.push(limb([s * 2.15, 6.6, 0], [s * 2.7, 5.35, 0.25], 0.62, 0.52, R.standA));
    p.push(part(ball(0.62), R.standA, { x: s * 2.45, y: 6.0, z: 0.28, sy: 1.2 }));
    p.push(limb([s * 2.7, 5.35, 0.25], [s * 2.15, 4.55, 1.15], 0.5, 0.42, R.standA));
    p.push(part(new CylinderGeometry(0.52, 0.5, 0.45, 10), R.standB, { x: s * 2.32, y: 4.78, z: 0.95, rx: 0.9, rz: s * 0.5 }));
    p.push(part(ball(0.55), R.standB, { x: s * 2.05, y: 4.4, z: 1.3 }));
  }
  p.push(part(new CylinderGeometry(0.5, 0.62, 0.7, 10), R.standA, { y: 7.4 }));
  p.push(part(ball(1.0, 16, 12), R.standB, { y: 8.1, z: 0.1, sx: 0.92, sy: 0.88, sz: 1.12 }));
  p.push(part(ball(0.62), R.standB, { y: 7.8, z: 1.02, sx: 0.85, sy: 0.6, sz: 0.85 }));
  p.push(part(ball(0.17, 8, 6), R.ink, { y: 8.0, z: 1.56 }));
  p.push(part(new BoxGeometry(0.14, 0.3, 1.5), R.standA, { y: 9.0, z: 0.1, rx: 0.12 }));
  p.push(part(new BoxGeometry(1.7, 0.3, 0.55), R.ink, { y: 8.25, z: 0.88, rx: -0.12 }));
  p.push(part(new BoxGeometry(1.75, 0.16, 0.5), R.standA, { y: 8.52, z: 0.92, rx: 0.3 }));
  for (const s of [-1, 1]) {
    p.push(part(new BoxGeometry(0.46, 0.1, 0.1), R.cream, { x: s * 0.47, y: 8.25, z: 1.12, rz: s * -0.28 }));
    for (let k = 0; k < 3; k++) {
      const g = new ConeGeometry(0.07, 1.25 - k * 0.2, 4).rotateZ(-s * (Math.PI / 2 - 0.18 * (k - 1))).rotateY(s * (0.5 + 0.15 * k));
      p.push(part(g, R.cream, { x: s * (0.72 + 0.45 * Math.sin(k)), y: 7.82 - k * 0.12, z: 1.0 - k * 0.12 }));
    }
  }
  return merge(p);
}
export function fistGeometry() {
  const p = [];
  p.push(part(new SphereGeometry(0.62, 10, 8), R.standB, { sx: 1.1 }));
  for (let k = 0; k < 4; k++) p.push(part(new BoxGeometry(0.2, 0.2, 0.24), R.standA, { x: 0.55, y: 0.27 - k * 0.18, z: 0 }));
  p.push(part(new CylinderGeometry(0.42, 0.5, 1.9, 8).rotateZ(Math.PI / 2), R.standA, { x: -1.4 }));
  p.push(part(new CylinderGeometry(0.54, 0.54, 0.4, 8).rotateZ(Math.PI / 2), R.cream, { x: -0.75 }));
  return merge(p);
}
