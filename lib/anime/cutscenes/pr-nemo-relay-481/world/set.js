// SET PIECES under and around the arena (static art, layer 0): the central pillar, the orbit ring, the gods' ledge with the pudding
// cup, far floating rock and the island far below (shot 7: "island below").
//
// MATHS
//   pillar    a lathe profile r(y): flare 1.6 -> 1.1 over y in [-8, -12], straight to -34, terracotta bands every 3 m
//   orbit ring torus R = 9.5, tube 0.3, arc 5.2 rad, tilted 0.32 rad about x, centred on the pillar at y = -15; 14 gold beads along the arc
//   ledge     hex dais, top at LEDGE.y = 3.2 (a raised terrace behind and to the right of the seal), tapering to a stem
//   island    a green cap disc (r 14), brown ellipsoid rock under it (y-scale 0.9 of r), trees = cone + sphere; pale, a different place
import { ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, LatheGeometry, SphereGeometry, TorusGeometry, Vector2 } from "three";
import { paint, painted } from "../../../sdf.js";
import { merge } from "../../../kit3d.js";
import { COL } from "./mosaic.js";

// where the gods stand: exported through ctx.nemoSet so the cast layer can read it at runtime (layers never import each other)
export const LEDGE = { x: 5, y: 3.2, z: -13, halfW: 4.2, halfD: 2.0 };
export const ISLAND = { x: 6, y: -26, z: 46, r: 14 };

export function buildSet(ctx) {
  const { engine } = ctx, group = new Group();
  const part = (geo, c, s, id, stone) => {
    const m = engine.prop(painted(geo, paint(c, s, { id })), id);
    if (stone) m.material.uniforms.uStone.value.set(...stone);
    group.add(m);
    return m;
  };
  // THE PILLAR
  const prof = [[0.01, -8], [1.6, -8.6], [1.2, -11], [1.1, -14], [1.1, -34], [1.9, -35], [0.01, -35.2]].map(([r, y]) => new Vector2(r, y));
  part(new LatheGeometry(prof, 24), COL.blue, "#2a2a3e", 0.56, [3, 1.2, 0.3, 0.1]);
  const bands = [];
  for (let y = -12; y > -34; y -= 3) bands.push(new CylinderGeometry(1.18, 1.18, 0.5, 24, 1, true).translate(0, y, 0));
  part(merge(bands, "bands"), COL.terra, "#5a2a1e", 0.565);
  // THE ORBIT RING (an arc, gold beads on a cream ring)
  const ring = new TorusGeometry(9.5, 0.3, 8, 64, 5.2).rotateX(Math.PI / 2 + 0.32).translate(0, -15, 0);
  part(ring, COL.cream, "#6a7a8a", 0.57);
  const beads = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 13) * 5.2, g = new SphereGeometry(0.42, 10, 8).translate(Math.cos(a) * 9.5, 0, Math.sin(a) * 9.5);
    g.rotateX(0.32).translate(0, -15 + 0, 0);
    beads.push(g);
  }
  part(merge(beads, "beads"), "#f0c030", "#a07818", 0.572);
  // far floating rocks (static, around the rim of the void)
  const rock = ctx.rng(11), rocks = [];
  for (let i = 0; i < 26; i++) {
    const a = rock() * Math.PI * 2, d = 38 + rock() * 70, s = 1.2 + rock() * 3.6, y = -10 + rock() * 40;
    const g = new IcosahedronGeometry(s, 1); g.scale(1, 0.6 + rock() * 0.5, 0.8 + rock() * 0.5).rotateY(rock() * 6).translate(Math.cos(a) * d, y, Math.sin(a) * d);
    const p = g.attributes.position; for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (0.85 + 0.3 * Math.sin(v * 12.9)), p.getY(v), p.getZ(v));
    g.computeVertexNormals(); rocks.push(g);
  }
  part(merge(rocks, "rocks"), "#5a4a52", "#1e1624", 0.58, [3, 1.4, 0.6, 0.2]);

  // THE LEDGE: a hex dais on a stem, mosaic-coloured; the gods stand on it (top at LEDGE.y)
  const L = LEDGE, dais = new CylinderGeometry(1, 0.35, 1, 6, 1).scale(L.halfW * 1.15, 3.6, L.halfD * 1.15).translate(L.x, L.y - 1.8, L.z);
  part(dais, COL.cream, "#6a7a8a", 0.59, [3, 1.0, 0.25, 0.1]);
  const top = new CylinderGeometry(1, 1, 0.08, 6, 1).scale(L.halfW * 1.05, 1, L.halfD * 1.05).translate(L.x, L.y + 0.02, L.z);
  part(top, COL.terra, "#5a2a1e", 0.591);
  const studs = [];
  for (let i = 0; i < 9; i++) studs.push(new ConeGeometry(0.28, 0.5, 3).rotateX(Math.PI).translate(L.x - L.halfW * 0.8 + (i * L.halfW * 1.6) / 8, L.y - 0.35, L.z + L.halfD * 1.1));
  part(merge(studs, "studs"), COL.blue, "#2a2a3e", 0.592);
  // the pudding cup (easter egg 1): cream cup, caramel top, cherry. Beside Beerus-seal on the right of the ledge.
  const px = L.x + L.halfW * 0.62, pz = L.z + 0.6, py = L.y + 0.05;
  part(new CylinderGeometry(0.26, 0.19, 0.34, 14).translate(px, py + 0.17, pz), "#f4e6a8", "#c8b070", 0.6);
  part(new CylinderGeometry(0.27, 0.26, 0.07, 14).translate(px, py + 0.37, pz), "#a8561a", "#5a2a0a", 0.601);
  part(new SphereGeometry(0.07, 8, 6).translate(px, py + 0.46, pz), "#d02a3a", "#7a0a1a", 0.602);
  ctx.nemoSet = { ledge: { ...L }, pudding: [px, py, pz], island: { ...ISLAND } }; // read-only hints for the cast/fx layers

  // THE ISLAND far below (shot 7): green cap, brown rock, a few trees and pale houses
  const I = ISLAND, isl = new Group();
  group.add(isl);
  const ip = (geo, c, s, id) => { const m = engine.prop(painted(geo, paint(c, s, { id })), id); isl.add(m); return m; };
  ip(new CylinderGeometry(I.r, I.r * 0.96, 1.2, 40).translate(I.x, I.y, I.z), "#8ab060", "#3f6a48", 0.61);
  const rockG = new SphereGeometry(I.r * 0.96, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.9, 1).translate(I.x, I.y - 0.6, I.z);
  ip(rockG, "#9a8672", "#4a3a3a", 0.611);
  const tr = ctx.rng(23), trunks = [], crowns = [], houses = [];
  for (let i = 0; i < 11; i++) {
    const a = tr() * 6.28, d = 3 + tr() * (I.r - 5), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    trunks.push(new CylinderGeometry(0.15, 0.2, 1.2, 6).translate(x, I.y + 1.2, z));
    crowns.push(new SphereGeometry(0.9 + tr() * 0.5, 10, 8).translate(x, I.y + 2.3, z));
  }
  for (let i = 0; i < 4; i++) houses.push(new CylinderGeometry(0.9, 0.9, 1.0, 4).rotateY(0.4 * i).translate(I.x - 2 + i * 1.7, I.y + 1.1, I.z + 1.5 - (i % 2) * 2));
  ip(merge(trunks, "trunks"), "#6a4a2a", "#3a2412", 0.612);
  ip(merge(crowns, "crowns"), "#5a9a48", "#2a5a3a", 0.613);
  ip(merge(houses, "houses"), "#f4f4f0", "#c8d8e8", 0.614);
  return group;
}
