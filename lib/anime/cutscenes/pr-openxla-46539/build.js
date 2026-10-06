// BUILD for pr-openxla-46539 (DIRECTION). Assembles world (layer 0), cast and fx (layer 1) and hands each the per-shot colour script.
// A layer that throws is muted by composeLayers; the others keep playing. Cue names live in scene.js (the CUE TABLE).
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  const script = ctx.scene.colorScript ?? {};
  const upd = comp.update;
  const smashT = (ctx.scene.beats.find((b) => b.name === "freeze") ?? {}).t;
  comp.update = (t, dt, cue) => {
    // the 2-frame freeze at the strike (bible: 3 frames starburst + 2 frame freeze): every layer sees the clock held at the strike
    const held = smashT != null && cue.t >= smashT && cue.t < smashT + 2 / 24;
    try { cue.script = script[cue.shotN] ?? script[Math.floor(cue.shotN)] ?? null; cue.frozen = held; cue.stage = ctx.scene.stage; } catch { /* cue may be frozen */ }
    upd(held ? Math.min(t, smashT) : t, dt, cue);
  };
  return comp;
}
