// BUILD for pr-openxla-46539 (DIRECTION agent). Imports only the three layer entry points and the framework.
// Each layer exports `export default function build(ctx)` returning { group, update(t, dt, cue), dispose }.
// composeLayers isolates them: a layer that throws leaves the others playing.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx });
}
