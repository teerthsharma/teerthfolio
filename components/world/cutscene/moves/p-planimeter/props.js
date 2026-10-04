// THE GATEHOUSE, the chess table, the checking gantry: the dock's surveyor booth promoted into the campus. The island has
// one way out, the bridge, and this is its gate: a glass-and-concrete kiosk at the bridge head, its counter ledge the
// guard window, the stamp arm hung from its eave, the boom barrier the bridge gate. Campus frame, origin at the gate.

import { BoxGeometry, CylinderGeometry, Matrix4, SphereGeometry } from "three";
import { Mesher, SW } from "./swiss";

const S = SW;
const M = new Matrix4();

// the kiosk, static: base, concrete frame, roof with an eave over the road, the counter ledge, the barrier's post
export function gateKiosk() {
  const m = new Mesher();
  m.slab(-8, 0, -2.2, -4.4, 0.3, 2.2, S.CONCRETE); // the base
  for (const [x, z] of [[-7.9, -2.0], [-4.5, -2.0], [-7.9, 2.0], [-4.5, 2.0]]) m.slab(x - 0.12, 0.3, z - 0.12, x + 0.12, 3.0, z + 0.12, S.SLATE); // the frame
  m.slab(-8.6, 3.0, -2.8, -2.4, 3.3, 2.8, S.CONCRETE); // the roof, with its eave over the road
  m.slab(-8.6, 3.3, -2.8, -2.4, 3.45, -2.6, S.SLATE);
  m.slab(-4.4, 0.3, -1.4, -3.7, 1.1, 1.4, S.WARM); // the counter below the window
  m.slab(-4.5, 1.1, -1.5, -3.6, 1.16, 1.5, S.CONCRETE); // the counter ledge: the guard window's sill
  m.slab(-4.5, 0, 2.8, -4.0, 1.5, 3.4, S.DEEP); // the barrier's post, at the road's edge
  m.slab(-4.7, 1.5, 2.7, -3.8, 1.7, 3.5, S.SLATE);
  return m.build();
}
export function gateGlass() {
  const m = new Mesher();
  m.slab(-7.9, 0.4, -2.0, -4.5, 3.0, -1.96, S.GLACIER);
  m.slab(-7.9, 0.4, 1.96, -4.5, 3.0, 2.0, S.GLACIER);
  m.slab(-7.92, 0.4, -2.0, -7.88, 3.0, 2.0, S.GLACIER);
  m.slab(-4.52, 1.16, -2.0, -4.48, 3.0, 2.0, S.GLACIER);
  return m.build();
}
// the stamp arm: pivot at the top, hangs down, a crimson stamp head at the foot
export function stampArm() {
  const m = new Mesher();
  m.slab(-0.07, -1.35, -0.07, 0.07, 0, 0.07, S.DEEP);
  m.slab(-0.34, -1.55, -0.28, 0.34, -1.33, 0.28, S.CRIMSON);
  m.slab(-0.12, -0.1, -0.12, 0.12, 0.1, 0.12, S.SLATE);
  return m.build();
}
// the boom barrier: 8 m of alternating crimson and pale concrete, pivot at its post end
export function boom() {
  const m = new Mesher();
  for (let i = 0; i < 8; i++) m.slab(i, -0.09, -0.09, i + 1, 0.09, 0.09, i % 2 ? S.CONCRETE : S.CRIMSON);
  return m.build();
}
export function lampBulb() {
  return new Mesher().add(new SphereGeometry(0.22, 8, 6), S.AMBER, M.makeTranslation(0, 0, 0)).build();
}
export function lampBulbCoral() {
  return new Mesher().add(new SphereGeometry(0.22, 8, 6), S.CORAL, M.makeTranslation(0, 0, 0)).build();
}

// the small round chess table with two chairs (Sakayanagi's), at the plaza's edge
export function chessTable() {
  const m = new Mesher();
  m.add(new CylinderGeometry(0.62, 0.62, 0.06, 16), S.WARM, M.makeTranslation(0, 0.78, 0));
  m.cyl(0, 0, 0, 0.06, 0.1, 0.78, 6, S.SLATE);
  m.cyl(0, 0, 0, 0.32, 0.32, 0.04, 12, S.SLATE);
  // the little board on top: a 4 x 4 of squares
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) m.slab(-0.4 + i * 0.2, 0.81, -0.4 + j * 0.2, -0.2 + i * 0.2, 0.825, -0.2 + j * 0.2, (i + j) % 2 ? S.SLATE : S.CONCRETE);
  for (const sx of [-1, 1]) {
    m.slab(sx * 1.05 - 0.26, 0.42, -0.26, sx * 1.05 + 0.26, 0.47, 0.26, S.SLATE);
    m.slab(sx * 1.05 - 0.26 + (sx > 0 ? 0.46 : 0), 0.47, -0.26, sx * 1.05 - 0.2 + (sx > 0 ? 0.46 : 0), 0.95, 0.26, S.SLATE);
    for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) m.slab(sx * 1.05 + a - 0.025, 0, b - 0.025, sx * 1.05 + a + 0.025, 0.42, b + 0.025, S.DEEP);
  }
  return m.build();
}

// THE CHECKING GANTRY: a crimson line on the ground, two posts and a beam at 3 m, spanning the island west to east.
// Drawn at x 0..1 (scaled to the span), z 0 (moved north to south).
export function gantry() {
  const m = new Mesher();
  m.slab(0, 0.14, -0.35, 1, 0.2, 0.35, S.CRIMSON); // the line on the ground
  m.slab(0, 3.0, -0.1, 1, 3.18, 0.1, S.CRIMSON); // the beam
  return m.build();
}
export function gantryPost() {
  return new Mesher().add(new BoxGeometry(0.34, 3.2, 0.34), S.CRIMSON, M.makeTranslation(0, 1.6, 0)).build();
}
