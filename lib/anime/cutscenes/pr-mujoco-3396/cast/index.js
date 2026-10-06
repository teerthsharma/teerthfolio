// CAST layer for pr-mujoco-3396 (THE WALLS WERE TITANS, in fresco). Layer 1 (redrawn every step).
// Law L6b: every victim and extra is a SMALL COSTUMED SEAL (kit.costumedSeal); the hero is ctx.seal (locked, never restyled).
//   12 victims : 5 Marleyan riflemen, 1 officer (the poster man), 4 Survey scouts (Wings of Freedom, streaming cloaks, two blades),
//                2 civilians (cream coat, red armband, ember-lit)            -> actors.js, costumes.js, parts.js
//   props      : the coral block of 1,282 cubes + the one blue cube + the hero's open mouth for the eat   -> block.js
// Cues (all read from the bible's frames at 24 fps; a beat of the same name in scene.beats moves the time, see actors.timeline):
//   lineA (kneel, f77)  stand (f98 skin falls)  flee (f118)  strike (f162)  swell (f164)  eat (f177)  gap (f247)  flip (f280)  fist (f300)  footfall (every 0.9 s from 4.6 s)
// Easter eggs staged here: the Creation of Adam (scout 0's blade almost touches the seal, f300-312), the Last Judgment spiral
// (the lower-left riflemen fall in a spiral, f163-185), the poster pose (civilian 0 and the officer, backs to us, staring up at the Wall,
// f30-77), the Wings of Freedom (0.2 m, blue and white, on the scout cloaks).
import { makeParts } from "./parts.js";
import { buildActors, timeline } from "./actors.js";
import { buildBlock } from "./block.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  group.name = "cast-pr-mujoco-3396";
  const T = timeline(ctx);
  const parts = makeParts(ctx);
  const actors = buildActors(ctx, parts, group, T);
  const props = buildBlock(ctx, T, group);
  ctx.setLayer(group, 1);
  return {
    group,
    update(t) { actors.update(t); props.update(t); }, // t is the STEPPED clock (twos/threes): every state is a pure function of it
    dispose() { actors.dispose(); props.dispose(); },
  };
}
