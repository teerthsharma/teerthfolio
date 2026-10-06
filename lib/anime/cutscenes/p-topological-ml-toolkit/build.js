// BUILD for p-topological-ml-toolkit (DIRECTION). Assembles world (layer 0), cast and fx (layer 1) and nothing else.
// The timeline lives in scene.js: shots drive the camera law, beats drive impact/speedlines/shock/trauma/pose in the player,
// and the free cues (see the CUE INDEX in scene.js) reach each layer's update(t, dt, cue). Layers read staging from
// ctx.scene.rival, ctx.scene.stage and ctx.palette. composeLayers mutes a layer that throws; the others keep playing.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx });
}
