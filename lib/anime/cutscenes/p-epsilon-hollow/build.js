// BUILD for p-epsilon-hollow (DIRECTION agent). Imports only the three layer entry points and the framework.
// Each layer exports `export default function build(ctx)` returning { group, update(t, dt, cue), dispose }.
// composeLayers isolates them: a layer that throws is muted and the others keep playing.
//
// The timeline is DATA: scene.js `beats` is the single source of truth for cue names and times (see its CUE TABLE).
// The framework fires them into `cue` for every layer; the camera law runs from scene.js `shots`; seal poses from `seal.track`.
//   world (layer 0): eye sky, nebula, planet, cracks, plinths, statues, dead moons, island reveal
//   cast  (layer 1): the four costumed victims, sleeper, crow, the shard-wielding props
//   fx    (layer 1): wires, glow, strands, shard blade, ripple, sparks, slash, wipe
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  // the sun for light shafts is the eye: over -z, 12 deg above the wide's line of sight (scene.stage.eye)
  try { ctx.engine.sun?.set?.(0, 90, -160); } catch { /* shafts are optional */ }
  return composeLayers(ctx, { world, cast, fx });
}
