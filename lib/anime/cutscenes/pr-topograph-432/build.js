// BUILD for pr-topograph-432 (DIRECTION). Composes world + cast + fx; the player owns the timeline, the camera law and the cue clock.
// This file adds the one thing the direction owns beyond the data: the slow-motion dilation (cue.warp) of shot 5, derived from
// the scene's `warp` beat, so every layer reads the SAME number and a scrubbed frame equals a played one (pure function of cue.t).
//   warp(t) = 1 - (1 - scale) * w(t), w = smoothstep ramp in 0.25 s, hold, ramp out 0.25 s, over the beat window [t0, t0+dur]
//   cue.warpT = integral of warp dt (numeric, 1/48 s grid): the dilated clock layers may use for slow-mo motion (shards, lashes, dust).
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  const B = (ctx.scene.beats ?? []).find((b) => b.name === "warp");
  const t0 = B?.t ?? 0, d = B?.dur ?? 0, s = B?.scale ?? 1, R = 0.25;
  const w = (t) => sm((t - t0) / R) * (1 - sm((t - (t0 + d - R)) / R));
  const warp = (t) => (B ? 1 - (1 - s) * w(t) : 1);
  const warpT = (t) => {
    if (!B || t <= t0) return t;
    const end = Math.min(t, t0 + d), n = Math.max(1, Math.ceil((end - t0) * 48));
    let a = 0;
    for (let i = 0; i < n; i++) a += warp(t0 + ((i + 0.5) * (end - t0)) / n) * ((end - t0) / n);
    return t0 + a + Math.max(0, t - (t0 + d));
  };
  const update = comp.update;
  comp.update = (t, dt, cue) => {
    cue.warp = warp(cue.t);
    cue.warpT = warpT(cue.t);
    cue.stage = ctx.scene.stage; // convenience: layers may also read ctx.scene.stage
    update(t, dt, cue);
  };
  return comp;
}
