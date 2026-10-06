// BUILD for p-planimeter (DIRECTION). Assembles the three layers; the timeline, cues, beats and camera director are driven by
// scene.js and the framework player. composeLayers isolates each layer: one that throws is muted, the others keep playing.
// Cue contract (full list at the top of scene.js): world listens to rays/glow/petals/grade/banner/chalk-write/collapse,
// cast to rv-*/victims-*/pencil-*/chin-pose/tail-flick, fx to sphere/cardframe/board-slam/pawn-takes/checkmate/clack/bell.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx });
}
