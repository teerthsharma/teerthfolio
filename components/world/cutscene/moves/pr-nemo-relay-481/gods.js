// THE TWO WATCHERS, as ink cutouts on the ledge (shape only: no faces). Each is one merged low-poly mesh
// in flat ink, a bold pale outline hull round it (so it reads as a cut-out against the painted sky), and a
// few small colour accents.
//   BEERUS: a cat-eared god. Two tall pointed ears (his, never the pup's), a long tail curling up behind,
//           a broad Egyptian collar and a sash, both hands behind his back.
//   WHIS:   tall and slender, a high flared collar, a long staff topped by a bead, and a ringed halo
//           (two thin rings and six beads) behind his head.
// Each figure stands on the origin facing +z, about 1.8 m (Beerus) and 2.5 m (Whis) before its scale.

import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { flat, hullOf, limb } from "./util";

const ico = (r, x, y, z, sx = 1, sy = 1, sz = 1) => new IcosahedronGeometry(r, 1).scale(sx, sy, sz).translate(x, y, z);

export function beerus() {
  const p = [];
  // legs under a long skirt
  for (const s of [-1, 1]) p.push(limb([s * 0.1, 0, 0.02], [s * 0.11, 0.8, 0], 0.08, 0.09));
  p.push(new CylinderGeometry(0.17, 0.3, 0.9, 8).translate(0, 0.5, 0));
  // torso, a little forward, the chest out
  p.push(limb([0, 0.82, 0], [0, 1.38, 0.03], 0.19, 0.23, 7));
  // the broad collar and the sash
  p.push(new CylinderGeometry(0.2, 0.36, 0.12, 10).translate(0, 1.42, 0.03));
  p.push(new CylinderGeometry(0.22, 0.22, 0.07, 8).translate(0, 0.86, 0));
  // neck, head, and the two ears
  p.push(limb([0, 1.4, 0.03], [0, 1.52, 0.04], 0.07, 0.07));
  p.push(ico(0.17, 0, 1.68, 0.05, 1, 1.12, 0.95));
  for (const s of [-1, 1]) p.push(new ConeGeometry(0.075, 0.36, 3).rotateZ(-s * 0.14).translate(s * 0.115, 1.98, 0.03));
  // the tail: out behind and up in a curl
  const tail = [[0, 0.78, -0.2], [0.04, 0.62, -0.46], [0.18, 0.56, -0.74], [0.3, 0.7, -0.9], [0.32, 0.96, -0.9], [0.24, 1.2, -0.76]];
  for (let i = 0; i < tail.length - 1; i++) p.push(limb(tail[i], tail[i + 1], 0.055 - i * 0.004, 0.05 - i * 0.004, 5));
  // both hands behind the back
  for (const s of [-1, 1]) {
    p.push(limb([s * 0.24, 1.3, 0], [s * 0.27, 1.02, -0.07], 0.07, 0.06));
    p.push(limb([s * 0.27, 1.02, -0.07], [s * 0.07, 0.9, -0.2], 0.06, 0.05));
  }
  p.push(ico(0.07, 0, 0.88, -0.22));
  const ink = mergeGeometries(p.map(flat));
  // accents: the gold collar rim and the sash (flat colour on the ink)
  const band = (r, y, h = 0.035) => flat(new CylinderGeometry(r, r, h, 10).translate(0, y, 0));
  const gold = mergeGeometries([flat(new CylinderGeometry(0.37, 0.37, 0.025, 10).translate(0, 1.37, 0.03)), flat(new CylinderGeometry(0.225, 0.225, 0.03, 8).translate(0, 0.84, 0)), flat(new CylinderGeometry(0.2, 0.37, 0.06, 10).translate(0, 1.48, 0.03)), band(0.25, 0.6), band(0.2, 1.1, 0.05), band(0.215, 1.28, 0.03)]);
  return { ink, hull: hullOf(ink), accent: gold, accentColor: "#ffd23a", height: 2.15 };
}

export function whis() {
  const p = [];
  // a long robe to the ground, a slender body, a high flared collar
  p.push(new CylinderGeometry(0.15, 0.36, 1.6, 8).translate(0, 0.8, 0));
  p.push(limb([0, 1.5, 0], [0, 2.05, 0.02], 0.13, 0.18, 7));
  p.push(new CylinderGeometry(0.34, 0.15, 0.5, 8, 1, true).translate(0, 2.16, 0));
  // neck, a long head, a pointed chin
  p.push(limb([0, 2.1, 0.02], [0, 2.25, 0.03], 0.06, 0.06));
  p.push(ico(0.14, 0, 2.42, 0.04, 1, 1.3, 1));
  p.push(new ConeGeometry(0.06, 0.12, 5).rotateX(Math.PI).translate(0, 2.2, 0.08));
  // the staff arm out and forward, the other down
  p.push(limb([-0.17, 2.0, 0], [-0.34, 1.7, 0.2], 0.06, 0.05));
  p.push(limb([-0.34, 1.7, 0.2], [-0.4, 1.42, 0.38], 0.05, 0.045));
  p.push(limb([0.17, 2.0, 0], [0.24, 1.55, 0.04], 0.06, 0.05));
  p.push(limb([0.24, 1.55, 0.04], [0.26, 1.2, 0.1], 0.05, 0.04));
  // the staff: taller than he is, a bead on top
  p.push(limb([-0.4, 0, 0.38], [-0.4, 3.0, 0.38], 0.03, 0.026, 5));
  p.push(ico(0.1, -0.4, 3.08, 0.38));
  const ink = mergeGeometries(p.map(flat));
  // the ringed halo, behind the head, and the staff's bead
  const rings = [new TorusGeometry(0.62, 0.028, 5, 40), new TorusGeometry(0.8, 0.02, 5, 44)];
  const beads = Array.from({ length: 6 }, (_, i) => ico(0.045, Math.cos((i / 6) * 6.283) * 0.8, Math.sin((i / 6) * 6.283) * 0.8, 0));
  const halo = mergeGeometries([...rings, ...beads].map((g) => g.translate(0, 0, 0)).map(flat)).translate(0, 2.45, -0.34);
  const bead = flat(ico(0.075, -0.4, 3.08, 0.38));
  const sash = flat(new BoxGeometry(0.34, 0.07, 0.26).translate(0, 1.48, 0.02));
  return { ink, hull: hullOf(ink), halo, accent: mergeGeometries([bead, sash]), accentColor: "#7fe3ff", height: 3.2 };
}
