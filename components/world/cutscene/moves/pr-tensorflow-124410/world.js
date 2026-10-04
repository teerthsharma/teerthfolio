// THE DAM SET PIECE, as meshes. Frame: the move's rig (the pup at the origin on the crest at y 0, the lens out
// along +z, the reservoir ahead down -z). Crest: a long concrete slab with expansion joints, a parapet of
// balusters with a coping, lamp posts with glowing globes, a stub control house. The gantry: two fluted pylons
// that carry the control edges (the beams are instanced in the move). Out in the water: the valve tower the rival
// stands on. Beyond: a faceted valley of rock and a far ring of mountains. Every part carries a palette role.

import { BoxGeometry, BufferAttribute, ConeGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry } from "three";
import { hash, merge, part, R } from "./ink";

export const WY = -0.4; // the reservoir's surface, under the crest
export const TOWER = { x: 7.6, z: -11.2, top: 2.8 }; // x is for a wide screen; the move narrows it with the screen
const box = (w, h, d) => new BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 8) => new CylinderGeometry(rt, rb, h, s);

// the crest, the parapet, the lamps, the control house, the valve tower
export function crestGeometry() {
  const p = [];
  p.push(part(box(94, 1.8, 20.6), R.concrete, { y: -0.9, z: 6.7 }));
  // the upstream face dropping to the water: a battered wall in shade, with a ledge
  p.push(part(box(94, 3.2, 0.9), R.concreteDk, { y: -1.6, z: -3.75 }));
  p.push(part(box(94, 0.28, 1.5), R.concrete, { y: -0.14, z: -3.2 }));
  // expansion joints and a faded centre line: dark strips set into the deck
  for (let x = -42; x <= 42; x += 6) p.push(part(box(0.22, 0.04, 20.6), R.concreteDk, { x, y: 0.01, z: 6.7 }));
  for (let x = -44; x < 44; x += 3.2) p.push(part(box(1.7, 0.04, 0.18), R.cream, { x, y: 0.015, z: 5.2 }));
  p.push(part(box(94, 0.9, 0.7), R.concreteDk, { y: -0.45, z: 17.3 }));
  // the railing on the water side: slender posts and two thin rails (see-through from the low lens)
  for (let x = -45; x <= 45; x += 3) p.push(part(box(0.14, 1.05, 0.14), R.concreteDk, { x, y: 0.52, z: -3.3 }));
  for (const y of [0.55, 1.0]) p.push(part(box(94, 0.07, 0.07), R.concreteDk, { y, z: -3.3 }));
  for (let x = -40; x <= 40; x += 10) {
    p.push(part(box(1.0, 1.2, 1.0), R.concrete, { x, y: 0.6, z: -3.3 }));
    p.push(part(box(1.35, 0.22, 1.35), R.concreteDk, { x, y: 1.3, z: -3.3 }));
  }
  // the lamp posts: a fluted pole, a curved arm, a heavy collar (the globes are a separate glowing mesh)
  for (const x of [-40, -26, -12, 12, 26, 40]) {
    p.push(part(cyl(0.16, 0.3, 7.4, 8), R.concreteDk, { x, y: 3.7, z: -3.0 }));
    p.push(part(cyl(0.36, 0.36, 0.5, 8), R.concrete, { x, y: 0.5, z: -3.0 }));
    p.push(part(box(0.18, 0.18, 1.4), R.concreteDk, { x, y: 7.3, z: -3.5 }));
  }
  // the control house on the left of the crest: a block, a ribbon window, a flat roof with a hard overhang
  p.push(part(box(6.4, 3.6, 4.2), R.concrete, { x: -10.5, y: 1.8, z: -1.6 }));
  p.push(part(box(6.9, 0.4, 4.8), R.concreteDk, { x: -10.5, y: 3.8, z: -1.6 }));
  p.push(part(box(4.6, 0.55, 0.12), R.ink, { x: -10.5, y: 2.5, z: 0.55 }));
  p.push(part(box(0.9, 2.0, 0.12), R.ink, { x: -8.3, y: 1.0, z: 0.55 }));
  p.push(part(box(0.5, 4.5, 0.5), R.concreteDk, { x: -12.7, y: 5.4, z: -2.6 })); // its chimney stack
  return merge(p);
}

// the valve tower standing out of the water, with a stepped top, a gallery and rails: the rival's stand. Centred on
// x 0, z 0 (the move places it, so a narrow screen can bring it in from the edge)
export function towerGeometry() {
  const p = [];
  const T = { x: 0, z: 0, top: TOWER.top };
  p.push(part(cyl(1.9, 2.5, T.top - WY + 3, 8), R.concrete, { x: T.x, z: T.z, y: (T.top + WY - 3) / 2 }));
  for (let k = 0; k < 3; k++) p.push(part(cyl(2.0, 2.0, 0.22, 8), R.concreteDk, { x: T.x, z: T.z, y: WY + 0.6 + k * 1.9 }));
  p.push(part(cyl(2.9, 2.9, 0.5, 8), R.concreteDk, { x: T.x, z: T.z, y: T.top + 0.25 }));
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    p.push(part(box(0.14, 0.8, 0.14), R.concreteDk, { x: T.x + Math.cos(a) * 2.7, z: T.z + Math.sin(a) * 2.7, y: T.top + 0.9 }));
  }
  return merge(p);
}

// the lamp globes (drawn lit)
export function lampGeometry() {
  const p = [];
  for (const x of [-40, -26, -12, 12, 26, 40]) p.push(part(new SphereGeometry(0.55, 10, 8), R.cream, { x, y: 7.2, z: -4.1 }));
  return merge(p);
}

// one pylon, centred on x 0, z 0 (the move places two). Fluted, with collars where each edge seats, a heavy cap.
export function pylonGeometry(heights) {
  const p = [];
  p.push(part(box(2.8, 4.2, 2.8), R.concreteDk, { y: -1.9 }));
  p.push(part(box(2.0, 0.6, 2.0), R.concreteDk, { y: 0.3 }));
  p.push(part(box(1.5, 9.4, 1.5), R.concrete, { y: 4.7 }));
  for (const s of [-1, 1]) {
    p.push(part(box(0.22, 9.2, 0.22), R.concreteDk, { x: s * 0.62, y: 4.6, z: 0.62 }));
    p.push(part(box(0.22, 9.2, 0.22), R.concreteDk, { x: s * 0.62, y: 4.6, z: -0.62 }));
  }
  for (const y of heights) p.push(part(box(1.9, 0.34, 1.9), R.concreteDk, { y }));
  p.push(part(box(2.2, 0.5, 2.2), R.concreteDk, { y: 9.6 }));
  p.push(part(new ConeGeometry(1.4, 1.5, 4).rotateY(Math.PI / 4), R.concrete, { y: 10.6 }));
  p.push(part(cyl(0.06, 0.06, 1.2, 5), R.ink, { y: 11.8 }));
  return merge(p);
}

// ---- the valley: faceted rock, a far ring of mountains ----
export function terrainHeight(x, z) {
  const ax = Math.abs(x);
  if (z > -4.6 && ax < 45) return -40; // downstream of the dam, out of sight
  let h = -9;
  h += 46 * Math.pow(Math.max(0, Math.min(1, (ax - 42) / 80)), 1.15); // the valley walls
  h += 120 * Math.pow(Math.max(0, Math.min(1, (-z - 118) / 80)), 1.3); // the far ring
  h += Math.max(0, 14 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.031)) * Math.min(1, (-z - 30) / 60);
  const rough = Math.sin(x * 0.21 + z * 0.17) * Math.cos(z * 0.13 - x * 0.09) * 4 + Math.sin(x * 0.7 + z * 0.55) * 1.2;
  h += rough * Math.max(0, Math.min(1, (h + 6) / 12));
  // near the dam the cliffs: the abutments
  if (z > -22 && z < 10 && ax > 44 && ax < 62) h = Math.max(h, 6 + 8 * Math.min(1, (ax - 44) / 6));
  return h;
}
export function terrain() {
  const g = new PlaneGeometry(400, 230, 80, 46).rotateX(-Math.PI / 2).translate(0, 0, -88);
  const n = g.toNonIndexed();
  n.deleteAttribute("uv");
  const p = n.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x0 = p.getX(i);
    const z0 = p.getZ(i);
    const k = Math.round(x0 * 3) * 7.13 + Math.round(z0 * 3) * 3.71;
    const x = x0 + (hash(k, 1) - 0.5) * 3.2;
    const z = z0 + (hash(k, 2) - 0.5) * 3.2;
    p.setXYZ(i, x, terrainHeight(x, z), z);
  }
  n.computeVertexNormals(); // non-indexed: one normal a facet
  const role = new Float32Array(p.count);
  for (let t = 0; t < p.count; t += 3) {
    const y = (p.getY(t) + p.getY(t + 1) + p.getY(t + 2)) / 3;
    const r = y > 52 ? R.cream : hash(t * 0.37, 4) > 0.55 ? R.concreteDk : R.rock;
    role[t] = role[t + 1] = role[t + 2] = r;
  }
  const out = new Float32Array(p.count * 3);
  n.setAttribute("aRole", new BufferAttribute(role, 1));
  n.setAttribute("aOut", new BufferAttribute(out, 3));
  return n;
}
