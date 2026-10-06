// THE THRONE OF NAZARICK (static art, layer 0): a black-violet high-back chair trimmed in gold on the dais (y = 2.8), facing
// +z down the hall. Gold lit #ffd24a / mid #e6b43a / shadow #a8741a with a hard 4 px highlight bar #fff4c0 on the edges, a
// crimson gem in the crest, a spike crown along the back. The old comic villain figure is NOT rebuilt (bible: "remove"): the
// seal is Ainz, the chair is empty, a seat for the legend.
import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry } from "three";
import { C, part, grad, joined, mix } from "./helpers.js";

export const THRONE = { x: 0, y: 2.8, z: -16.4 };

export function buildThrone(engine, group) {
  const { x, y, z } = THRONE;
  const prop = (geo, id, ink = true) => { const m = engine.prop(geo, id); if (ink) engine.ink(m, 1.1); group.add(m); return m; };
  const dark = [], gold = [], bar = [];
  const at = (g) => g.translate(x, y, z);

  // seat block + footstool + arm rests (cloak colours: black-violet lit / shadow)
  dark.push(at(part(new BoxGeometry(2.4, 0.9, 2.2).translate(0, 0.45, 0), C.cloak, C.cloakShade)));
  dark.push(at(part(new BoxGeometry(2.0, 0.25, 0.9).translate(0, 0.12, 1.5), C.cloak, C.cloakShade)));
  for (const s of [-1, 1]) {
    dark.push(at(part(new BoxGeometry(0.45, 0.8, 2.0).translate(s * 1.35, 1.25, 0), C.cloak, C.cloakShade)));
    gold.push(at(part(new BoxGeometry(0.55, 0.12, 2.1).translate(s * 1.35, 1.69, 0), C.goldMid, C.goldShade)));
    gold.push(at(part(new SphereGeometry(0.3, 8, 6).translate(s * 1.35, 1.8, 1.0), C.goldLit, C.goldMid))); // arm-end finials
    bar.push(at(part(new BoxGeometry(0.12, 0.05, 2.0).translate(s * 1.35 - 0.12, 1.76, 0), C.goldHi, C.goldHi)));
  }
  // the back: a pointed-arch slab (shape extruded 0.5 deep), a gold frame behind it, a vertical gradient up to black
  const back = new Shape();
  back.moveTo(-1.5, 0); back.lineTo(1.5, 0); back.lineTo(1.5, 5.4);
  back.lineTo(0.9, 6.9); back.lineTo(0, 8.2); back.lineTo(-0.9, 6.9); back.lineTo(-1.5, 5.4); back.closePath();
  const slab = part(new ExtrudeGeometry(back, { depth: 0.5, bevelEnabled: false }).translate(0, 0.9, -1.2), C.cloak, C.cloakShade);
  grad(slab, (_x, yy) => { const s = Math.min(1, Math.max(0, (yy - 0.9) / 8)); return [mix(C.cloak, C.cloakShade, s), mix(C.cloakShade, C.deep, s)]; });
  dark.push(at(slab));
  const frame = new Shape();
  frame.moveTo(-1.75, 0); frame.lineTo(1.75, 0); frame.lineTo(1.75, 5.5); frame.lineTo(1.05, 7.2); frame.lineTo(0, 8.7);
  frame.lineTo(-1.05, 7.2); frame.lineTo(-1.75, 5.5); frame.closePath();
  gold.push(at(part(new ExtrudeGeometry(frame, { depth: 0.3, bevelEnabled: false }).translate(0, 0.8, -1.5), C.goldMid, C.goldShade)));
  // 4 px highlight bars down the frame's lit edge
  bar.push(at(part(new BoxGeometry(0.1, 5.4, 0.06).translate(-1.55, 3.6, -1.17), C.goldHi, C.goldHi)));
  bar.push(at(part(new BoxGeometry(1.6, 0.08, 0.06).translate(0, 0.98, -0.65), C.goldHi, C.goldHi)));
  // spike crown along the back (7 spikes; 7 = the seven gems), rising from the arch
  for (let i = -3; i <= 3; i++) {
    const hh = 1.2 + 0.7 * (1 - Math.abs(i) / 3), px = i * 0.55, py = 6.2 + 2.2 * (1 - (Math.abs(i) / 3) ** 1.5) * 0.6;
    gold.push(at(part(new ConeGeometry(0.17, hh, 5).translate(px, py + hh / 2 + 0.9, -1.4), C.goldLit, C.goldShade)));
  }
  // twin serpent-ish pillars flanking the back: gold coils (cylinder stacks) with a violet core
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) gold.push(at(part(new CylinderGeometry(0.28 + 0.04 * (k % 2), 0.28, 0.5, 8).translate(s * 2.1, 0.5 + k * 0.9, -1.4), k % 2 ? C.goldMid : C.goldLit, C.goldShade)));

  prop(joined(dark, "throne body"), 0.5);
  prop(joined(gold, "throne gold"), 0.5);
  prop(joined(bar, "throne highlights"), 0.5, false);

  // the crest gem: crimson, the only emissive on the set (0.25, the bible's circle budget, kept well under at 0.18)
  const gem = engine.prop(part(new SphereGeometry(0.42, 10, 8).translate(x, y + 6.3, z - 1.1), C.crimson, "#7a1428"), 0.5);
  gem.material.uniforms.uEmit.value.set(0.18, 0.02, 0.05);
  engine.ink(gem, 0.8); group.add(gem);

  // gold braziers flanking the stair top (set dressing the seal never stands near)
  const br = [];
  for (const s of [-1, 1]) {
    br.push(part(new CylinderGeometry(0.18, 0.3, 1.4, 8).translate(s * 5.2, y + 0.7, z + 3.2), C.goldMid, C.goldShade));
    br.push(part(new CylinderGeometry(0.7, 0.3, 0.45, 10).translate(s * 5.2, y + 1.6, z + 3.2), C.goldLit, C.goldShade));
    br.push(part(new ConeGeometry(0.5, 1.3, 7).translate(s * 5.2, y + 2.4, z + 3.2), C.purple, C.purpleDeep));
  }
  const brz = prop(joined(br, "braziers"), 0.5);
  brz.material.uniforms.uEmit.value.set(0.04, 0.015, 0.08);
}
