// Sculpting primitives for the miniature set: every one returns a finished clay piece
// (position, normal, color, aSway), ready to merge. Units are metres in the rig frame.

import { BoxGeometry, CylinderGeometry, Quaternion, SphereGeometry, Vector3 } from "three";
import { lump, piece } from "./clay";

const Y = new Vector3(0, 1, 0);
const Q = new Quaternion();
const A = new Vector3();
const B = new Vector3();

export const boxP = (x0, x1, y0, y1, z0, z1, color, sway = 0) => piece(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), color, sway);

// a tapered limb from a to b (radius ra at a, rb at b); seg radial segments
export function taperG(a, b, ra, rb, seg = 8, rows = 3) {
  A.fromArray(a);
  B.fromArray(b);
  const len = A.distanceTo(B);
  const g = new CylinderGeometry(rb, ra, len, seg, rows, false);
  g.applyQuaternion(Q.setFromUnitVectors(Y, B.clone().sub(A).normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
export const taper = (a, b, ra, rb, color, o = {}) => {
  const g = taperG(a, b, ra, rb, o.seg ?? 8, o.rows ?? 3);
  if (o.lump) lump(g, o.lump, o.freq ?? 2.4, o.seed ?? 0);
  return piece(g, color, o.sway ?? 0);
};

// a lumpy ellipsoid: centre c, radii r = [rx, ry, rz]
export const blob = (c, r, color, o = {}) => {
  const g = new SphereGeometry(1, o.w ?? 14, o.h ?? 10).scale(r[0], r[1], r[2]);
  if (o.rot) g.rotateX(o.rot[0]).rotateY(o.rot[1]).rotateZ(o.rot[2]);
  g.translate(c[0], c[1], c[2]);
  lump(g, o.lump ?? Math.min(...r) * 0.12, o.freq ?? 2.0, o.seed ?? 0);
  return piece(g, color, o.sway ?? 0);
};

// a thin slab between two points in the xy plane (a rib, a blade): width w (z), thickness t
export function slab(a, b, w, t, color, sway = 0) {
  A.fromArray(a);
  B.fromArray(b);
  const len = A.distanceTo(B);
  const g = new BoxGeometry(t, len, w);
  g.applyQuaternion(Q.setFromUnitVectors(Y, B.clone().sub(A).normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return piece(g, color, sway);
}
