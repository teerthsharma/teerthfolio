// BUILD for p-aether-lang (DIRECTION layer). Imports only the three layer entry points and the framework.
// Timeline, cue names and the camera law live in scene.js (single source of truth); composeLayers isolates the layers
// so one that throws is muted while the others keep playing.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  const core = ctx.scene.stage && ctx.scene.stage.core;
  const setSun = (k) => {
    try {
      if (core && ctx.engine.sun && ctx.engine.sun.set) ctx.engine.sun.set(core[0] * k, core[1] * k, core[2] * k);
    } catch (e) { /* sun is optional */ }
  };
  // light shafts radiate from the core (key light, bible section 3): engine.sun is a world-space Vector3.
  setSun(1);
  // camera-law audit once per build: lists any shot that breaks L1-L3 (cut > 5 s, seal too small).
  try {
    const rep = ctx.camera && ctx.camera.report && ctx.camera.report();
    if (rep && rep.length) console.warn("[p-aether-lang] camera law:", rep);
  } catch (e) { /* advisory */ }

  const update = comp.update;
  comp.update = (t, dt, cue) => {
    // once the island returns (19.5 s) the core light leaves and the home ground is lit by its own light
    setSun(cue.done("islandReturn") ? 0 : 1);
    return update ? update.call(comp, t, dt, cue) : undefined;
  };
  return comp;
}
