// Ported from moves/pr-openxla-46539/nomu.js (the site's live move, read only). Imports point at this folder.
// The page's surfaces write alpha 0.99 (its line id); translucent materials pass through idSafe (support.js).
// The notes live with the original.

import { ConeGeometry, CylinderGeometry, IcosahedronGeometry, SphereGeometry, TorusGeometry } from "three";
import { PAL } from "./print.js";
import { box, build, limb, tag } from "./mesh.js";

export const NOMU_H = 11.5;
export const SHOULDER = [2.3, 5.5, -0.1];

function lumpy(g, amp, cx, cy, cz) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) - cx;
    const y = p.getY(i) - cy;
    const z = p.getZ(i) - cz;
    const k = 1 + amp * (Math.sin(x * 4.1 + z * 2.3) * Math.cos(y * 3.6 - x * 1.7) + 0.5 * Math.sin(z * 5.7 + y * 3.1));
    p.setXYZ(i, cx + x * k, cy + y * k, cz + z * k);
  }
  return g;
}

export function nomu() {
  const N = PAL.nomu;
  const body = [];
  for (const s of [-1, 1]) {
    body.push(tag(limb([s * 1.0, 3.2, 0], [s * 1.15, 0.35, 0.1], 0.85, 0.6, 7), N));
    body.push(tag(box(1.4, 0.55, 2.0, s * 1.15, 0.28, 0.55), N));
    body.push(tag(new SphereGeometry(1.05, 8, 6).translate(s * 2.15, 5.5, -0.1), N));
  }
  body.push(tag(new SphereGeometry(1.6, 8, 6).scale(1.2, 0.8, 0.95).translate(0, 3.3, 0), N));
  body.push(tag(new CylinderGeometry(2.05, 1.3, 3.1, 9).scale(1, 1, 0.82).rotateX(0.2).translate(0, 4.6, 0.1), N));
  body.push(tag(new CylinderGeometry(0.95, 1.15, 0.9, 7).translate(0, 6.15, 0.4), N));
  const hd = (g) => g.translate(0, -6.0, -0.5).scale(1.5, 1.5, 1.5).translate(0, 6.3, 0.5);
  body.push(tag(hd(new IcosahedronGeometry(1.0, 1).scale(1.0, 0.82, 1.12).translate(0, 6.6, 0.7)), N));
  body.push(tag(hd(new TorusGeometry(1.0, 0.24, 6, 12).rotateX(Math.PI / 2).translate(0, 7.05, 0.65)), N));
  body.push(tag(hd(lumpy(new SphereGeometry(1.3, 14, 10).scale(1.1, 0.95, 1.1).translate(0, 7.85, 0.6), 0.12, 0, 7.85, 0.6)), PAL.brain));
  body.push(tag(hd(new ConeGeometry(0.85, 2.9, 6).scale(1, 1, 0.65).rotateX(Math.PI / 2 - 0.12).translate(0, 6.35, 2.3)), PAL.sinter));
  body.push(tag(hd(new ConeGeometry(0.35, 1.0, 5).rotateX(Math.PI / 2 + 1.0).translate(0, 6.0, 3.65)), PAL.sinter));
  body.push(tag(hd(new ConeGeometry(0.62, 2.3, 6).scale(1, 1, 0.6).rotateX(Math.PI / 2 + 0.5).translate(0, 5.5, 2.0)), PAL.sinter));
  for (const s of [-1, 1]) body.push(tag(hd(new SphereGeometry(0.26, 8, 6).translate(s * 0.45, 6.75, 1.62)), PAL.paper));
  for (let i = 0; i < 5; i++) body.push(tag(new ConeGeometry(0.28, 0.9, 4).rotateX(-0.5).translate(0, 5.5 - i * 0.55, -1.2 - 0.05 * i), N));

  const arm = (s) => {
    const parts = [
      tag(limb([0, 0, 0], [s * 0.55, -1.9, 0.5], 0.9, 0.72, 7), N),
      tag(limb([s * 0.55, -1.9, 0.5], [s * 0.7, -3.7, 1.4], 0.72, 0.9, 7), N),
      tag(new SphereGeometry(1.0, 8, 6).translate(s * 0.75, -4.1, 1.5), N),
    ];
    for (let i = 0; i < 3; i++) parts.push(tag(new ConeGeometry(0.18, 0.5, 4).translate(s * (0.4 + 0.35 * i), -4.7, 1.9), N));
    return build(parts, 0.015);
  };
  return { body: build(body, 0.015), armL: arm(1), armR: arm(-1) };
}

