// BUILD for p-separatrix (DIRECTION agent). Assembles the three layers; cue names and times live in scene.js (see its CUE TABLE).
// composeLayers isolates layers: one that throws is muted and the others keep playing. The player drives the timeline,
// the camera law (scene.shots), reserved beats and bubbles from scene.js; layers read cue.on/k/since/done by those names.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx });
}
