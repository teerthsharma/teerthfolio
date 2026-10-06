// CAST layer for p-resolvent (Frieren vs Aura). Layer 1 (redrawn every step). Law L6b: no silhouettes; every figure is a costumed SEAL.
//   hero.js        the locked seal's dress: twin tails (lift on the release wind), earrings, gold collar, staff   (ctx.seal.attach)
//   aura.js        Aura the Guillotine: wig + braids, horns, bodice, cape, skirt, eyes; timeline pop 1.75 .. stunned 9.6
//   scale.js       the Scale of Obedience: cel parts, silver weighing state, tilt, swing, break into 5 pieces, the gold hand chain
//   army.js        27 armoured knight seals in ranks of 8/9/10 with a clear aisle: march, controlled eyes, rock-back wave, kneel wave
//   bystanders.js  Fern and Stark in their true colours
// Cue names (free beats; defaults are the bible times, a scene.js beat of the same name overrides them):
//   aura_pop 1.75 | scale_up 2.4 | scale_tip 3.0 | pan_glow 5.0 | scale_tremble 6.2 | release 7.7 | scale_swing 7.85 | scale_break 8.5 |
//   army_march 2.0 | army_rock 7.7 | army_kneel 10.3
// Published for the other layers through ctx (layers never import each other):
//   ctx.castRefs = { panWorld(side "pup"|"aura", out), auraHead(out), auraHand(out), scalePivot: Vector3 }
import { T } from "./layout.js";
import { timeOf } from "./util.js";
import { buildHero } from "./hero.js";
import { buildAura } from "./aura.js";
import { buildScale } from "./scale.js";
import { buildArmy } from "./army.js";
import { buildBystanders } from "./bystanders.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  group.name = "p-resolvent-cast";
  const time = timeOf(ctx, T);
  const parts = [];
  // a part that throws while building is skipped so one bad costume never mutes the rest of the cast
  const add = (name, make) => {
    try {
      const p = make();
      if (p?.group) group.add(p.group);
      if (p?.linkGroup) group.add(p.linkGroup);
      parts.push(p);
      return p;
    } catch (e) { console.error(`[p-resolvent cast] ${name} failed`, e); return null; }
  };
  add("hero", () => buildHero(ctx, time));
  const aura = add("aura", () => buildAura(ctx, time));
  const scale = aura && add("scale", () => buildScale(ctx, time, aura));
  add("army", () => buildArmy(ctx, time));
  add("bystanders", () => buildBystanders(ctx));

  const v = new THREE.Vector3();
  ctx.castRefs = {
    panWorld: (side, out = v) => (scale ? scale.panWorld(side, out) : out.set(2.5, 1.2, 0)),
    auraHead: (out = v) => (aura ? aura.headWorld(out) : out.set(4, 1.3, 0)),
    auraHand: (out = v) => (aura ? aura.handWorld(out) : out.set(3.9, 1.2, 0.3)),
    scalePivot: new THREE.Vector3(2.5, 1.9, 0),
  };

  return {
    group,
    update(t, dt, cue) {
      for (const p of parts) {
        try { p?.update?.(t, dt, cue); } catch (e) { if (!p.__warned) { p.__warned = true; console.error("[p-resolvent cast] update", e); } }
      }
    },
    dispose() { for (const p of parts) p?.dispose?.(); },
  };
}
