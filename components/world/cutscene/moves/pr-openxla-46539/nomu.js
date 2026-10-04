// THE NOMU: a huge hulking brute in ink, shape only. A barrel chest hunched
// forward over a pelvis, shoulder masses wider than the head is tall, arms
// that hang past the knees, and the head the series gives it: a bare brain
// dome over a skull, and a beak-like jaw, two prongs, no eyes or teeth.
// Three meshes: the body, and the two arms (their origin the shoulder, so the
// move can swing them to throw). Feet at y 0, facing +z, 7.4 m to the crown.

import { ConeGeometry, CylinderGeometry, IcosahedronGeometry, SphereGeometry } from "three";
import { PAL } from "./print";
import { box, build, limb, tag } from "./mesh";

export const NOMU_H = 7.4;
export const SHOULDER = [2.3, 5.5, -0.1]; // from the feet

function lumpy(g, amp) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + amp * (Math.sin(x * 7.1 + z * 3.3) * Math.cos(y * 6.3 - x * 2.1) + 0.5 * Math.sin(z * 9.7 + y * 4.1));
    p.setXYZ(i, x * k, y * k, z * k);
  }
  return g;
}

export function nomu() {
  const N = PAL.nomu;
  const body = [];
  for (const s of [-1, 1]) {
    body.push(tag(limb([s * 1.0, 3.2, 0], [s * 1.15, 0.35, 0.1], 0.85, 0.6, 7), N)); // legs
    body.push(tag(box(1.4, 0.55, 2.0, s * 1.15, 0.28, 0.55), N)); // feet
    body.push(tag(new SphereGeometry(1.25, 8, 6).translate(s * 2.3, 5.6, -0.1), N)); // shoulder masses
  }
  body.push(tag(new SphereGeometry(1.6, 8, 6).scale(1.2, 0.8, 0.95).translate(0, 3.3, 0), N)); // pelvis
  body.push(tag(new CylinderGeometry(2.05, 1.3, 3.1, 9).scale(1, 1, 0.82).rotateX(0.2).translate(0, 4.6, 0.1), N)); // the chest, hunched
  body.push(tag(new CylinderGeometry(0.8, 1.0, 0.9, 7).translate(0, 6.15, 0.4), N)); // neck
  body.push(tag(new IcosahedronGeometry(1.0, 1).scale(1.05, 0.88, 1.15).translate(0, 6.55, 0.65), N)); // the skull
  // the brain: a lumpy dome standing proud of the crown
  const dome = lumpy(new SphereGeometry(1.02, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1.05, 0.95, 1.12).translate(0, 6.78, 0.6), 0.07);
  body.push(tag(dome, PAL.brain));
  // the beak: two prongs, the upper hooked, the lower dropped open
  body.push(tag(new ConeGeometry(0.66, 1.9, 6).rotateX(Math.PI / 2 - 0.22).translate(0, 6.3, 1.75), N));
  body.push(tag(new ConeGeometry(0.5, 1.5, 6).rotateX(Math.PI / 2 + 0.55).translate(0, 5.82, 1.5), N));
  // spine ridges down the back
  for (let i = 0; i < 5; i++) body.push(tag(new ConeGeometry(0.28, 0.9, 4).rotateX(-0.5).translate(0, 5.5 - i * 0.55, -1.2 - 0.05 * i), N));

  const arm = (s) => {
    const parts = [
      tag(limb([0, 0, 0], [s * 0.55, -1.9, 0.5], 0.9, 0.72, 7), N),
      tag(limb([s * 0.55, -1.9, 0.5], [s * 0.7, -3.7, 1.4], 0.72, 0.9, 7), N),
      tag(new SphereGeometry(1.0, 8, 6).translate(s * 0.75, -4.1, 1.5), N), // the fist
    ];
    for (let i = 0; i < 3; i++) parts.push(tag(new ConeGeometry(0.18, 0.5, 4).translate(s * (0.4 + 0.35 * i), -4.7, 1.9), N));
    return build(parts, 0.015);
  };
  return { body: build(body, 0.015), armL: arm(1), armR: arm(-1) };
}
