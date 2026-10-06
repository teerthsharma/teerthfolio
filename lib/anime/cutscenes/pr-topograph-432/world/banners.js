// THE GUILD BANNERS (layer 1: they sway). Bible: 41 banners, one per member of Ainz Ooal Gown, hanging on the long walls in 6
// guild colours #f0b429 #c82040 #3a8a5a #2f6ab0 #8a3a9a #e0e0e0, gold-trimmed, flat cloth, a gold emblem each.
// EASTER EGG 1: there are 42 slots (21 a side) and ONE IS EMPTY, a bare hook and a ghost-rectangle where the 42nd
// member's banner hung (left wall, slot 8). The ghost is static art (layer 0).
//
// SWAY. Each banner is a pendulum hung from its top rod, rotating about the hall's long axis (z) so the cloth swings off the
// wall: theta(t) = side * A sin(2 pi (f t + phi_i)), A = 0.02 rad (a 6 m banner's tail moves 12 cm, about 1 px at the wide),
// phi_i from rng so the hall never moves in unison. `t` is the STEPPED clock (threes), so it holds like a cel.
import { BoxGeometry, CylinderGeometry, Group, PlaneGeometry, Shape, ShapeGeometry } from "three";
import { C, part, joined, darken } from "./helpers.js";
import { HALL } from "./hall.js";

const SLOTS = 21, GAP = { side: -1, i: 8 }, TOPY = 13.2, BW = 1.5, BH = 6;
export const slotZ = (i) => -17.5 + i * 1.75;

function bannerGeo(col) {
  const s = new Shape(); // swallowtail, top edge at y = 0, hangs down -y
  s.moveTo(-BW / 2, 0); s.lineTo(BW / 2, 0); s.lineTo(BW / 2, -BH); s.lineTo(0, -BH + 0.9); s.lineTo(-BW / 2, -BH); s.closePath();
  const shade = darken(col, 0.52), parts = [];
  parts.push(part(new ShapeGeometry(s), col, shade));
  // gold border: a top bar and two side bars, a 4 px highlight cut on the bar
  parts.push(part(new BoxGeometry(BW + 0.12, 0.14, 0.07).translate(0, -0.07, 0.02), C.goldMid, C.goldShade));
  for (const sx of [-1, 1]) parts.push(part(new BoxGeometry(0.1, BH - 0.95, 0.06).translate(sx * (BW / 2 - 0.05), -(BH - 0.95) / 2 - 0.1, 0.02), C.goldMid, C.goldShade));
  parts.push(part(new BoxGeometry(BW - 0.3, 0.04, 0.06).translate(0, -0.13, 0.04), C.goldHi, C.goldHi));
  // emblem: a gold diamond with a dark core (each member's sigil reduced to the cartoon's one flat shape)
  const d = new Shape(); d.moveTo(0, 0.62); d.lineTo(0.42, 0); d.lineTo(0, -0.62); d.lineTo(-0.42, 0); d.closePath();
  parts.push(part(new ShapeGeometry(d).translate(0, -2.5, 0.04), C.goldMid, C.goldShade));
  const d2 = new Shape(); d2.moveTo(0, 0.3); d2.lineTo(0.2, 0); d2.lineTo(0, -0.3); d2.lineTo(-0.2, 0); d2.closePath();
  parts.push(part(new ShapeGeometry(d2).translate(0, -2.5, 0.06), darken(col, 0.4), darken(col, 0.3)));
  // the rod
  parts.push(part(new CylinderGeometry(0.08, 0.08, BW + 0.5, 6).rotateZ(Math.PI / 2).translate(0, 0.02, 0), C.goldLit, C.goldShade));
  return joined(parts, "banner");
}

export function buildBanners(engine, ctx, staticGroup) {
  const R = ctx.rng(41), g = new Group();
  g.userData.layer = 1;
  const protos = C.guild.map((col) => { const m = engine.prop(bannerGeo(col), 0.5); engine.ink(m, 0.9); return m; });
  const swing = [];
  let n = 0;
  for (const side of [-1, 1]) for (let i = 0; i < SLOTS; i++) {
    const z = slotZ(i), x = side * (HALL.x - 0.12);
    if (side === GAP.side && i === GAP.i) {
      // the gap: a bare hook rod and a ghost outline where the banner was (static)
      const hook = engine.prop(part(new CylinderGeometry(0.08, 0.08, BW + 0.5, 6).rotateZ(Math.PI / 2).rotateY(-side * Math.PI / 2).translate(x, TOPY, z), C.goldMid, C.goldShade), 0.5);
      const ghost = engine.prop(part(new PlaneGeometry(BW, BH).rotateY(-side * Math.PI / 2).translate(side * (HALL.x - 0.03), TOPY - BH / 2, z), C.stoneShade, C.deep), 0.5);
      staticGroup.add(hook, ghost);
      continue;
    }
    const m = protos[n % 6].clone(true); // shares geometry + material (one program, six colours)
    m.rotation.y = -side * Math.PI / 2;     // face into the hall: left wall faces +x, right wall faces -x
    const pivot = new Group();              // the pendulum: rotates about the hall's z axis at the top rod
    pivot.position.set(x, TOPY, z);
    pivot.add(m);
    pivot.userData = { side, phi: R(), amp: 0.014 + 0.012 * R() };
    g.add(pivot); swing.push(pivot); n++;
  }
  // n === 41 by construction
  return {
    group: g,
    count: n,
    update(t) {
      for (const p of swing) p.rotation.z = p.userData.side * p.userData.amp * Math.sin(Math.PI * 2 * (0.32 * t + p.userData.phi));
    },
    dispose() { for (const p of protos) { p.geometry.dispose(); p.material.dispose(); } },
  };
}
