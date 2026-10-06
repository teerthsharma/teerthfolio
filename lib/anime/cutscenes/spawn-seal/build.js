// BUILD for spawn-seal (DIRECTION). The timeline, cues, camera law and bubbles are all data in ./scene.js (the framework drives
// them); this file only composes the three layers. composeLayers isolates them: a layer that throws is muted, the rest play.
// Layers never import each other; they talk through ctx and the cue names listed at the top of scene.js.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const layers = composeLayers(ctx, { world, cast, fx });
  // Indigo pocket fog, near 40 far 180 (bible 3.17). The pocket owns its fog; never white, never lifted blacks.
  try { ctx.root.fog = new ctx.THREE.Fog(new ctx.THREE.Color("#1a1f5e"), 40, 180); } catch { /* cosmetic */ }
  return layers;
}
