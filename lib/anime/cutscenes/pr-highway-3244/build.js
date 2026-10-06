// BUILD for pr-highway-3244 (DIRECTION). Assembles world + cast + fx and publishes the ride to every layer.
// cue.rig = { dist, speed, warp, seat, hit, rivals, sunAz } is refreshed each frame from scene.rig (pure functions
// of the clock, so a scrubbed frame equals a played one). The sun is set once for the light shafts: behind-left, low, gold.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const R = ctx.scene.rig;
  try { ctx.engine.sun?.set?.(-0.6, 0.18, -0.77); } catch { /* the sun is optional */ }
  const out = composeLayers(ctx, { world, cast, fx });
  const inner = out.update.bind(out);
  out.update = (t, dt, cue) => {
    if (cue) cue.rig = { t, dist: R.dist(t), speed: R.speed(t), warp: R.warp(t), seat: R.seat, hit: R.hit, rivals: R.rivals, sunAz: R.sunAz };
    return inner(t, dt, cue);
  };
  return out;
}
