// CAST layer for p-caustic (Naruto, Madara; the blue Susanoo is the PROTECTED look, drawn by the FX/WORLD layers).
// The hero seal is Madara by COSTUME only (hero.js: mane, red plates, rope belt, gunbai with the Uchiha fan, red slit-iris eyes, blue rim).
// The Allied Shinobi Forces are 12 small costumed seals (victims.js + costumes.js): Onoki, Gaara, Mei, A, Tsunade, Mifune and six troops.
// Layer 1. Cue names read (all optional, bible times as fallback): costume flinch cast hit1 meteor2 hit2 break release aftermath.
import buildHero from "./hero.js";
import buildVictims from "./victims.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  group.name = "p-caustic-cast";
  const hero = buildHero(ctx), army = buildVictims(ctx);
  group.add(army.group); // the hero costume is attached to the seal itself (ctx.seal.attach), not to this group
  return {
    group,
    update(t, dt, cue) { hero.update(t, dt, cue); army.update(t, dt, cue); },
    dispose() { hero.dispose(); army.dispose(); },
  };
}
