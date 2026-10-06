// BUILD for p-faraday (DIRECTION layer). Imports only the three layer entry points and the framework.
// The timeline, cue names and the camera law live in scene.js (single source of truth). The player drives the clock, the
// director, the reserved beats (impact, speedlines, shock, trauma, pose) and the overlay; this file only assembles the layers.
// Layers read the beats by their scene.js names (cue.on / cue.k / cue.fired / cue.since). `hitstop` (6.8, 0.17 s) is a free
// cue: each layer holds its own motion while cue.on("hitstop"). A layer that throws is muted by composeLayers.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx });
}
