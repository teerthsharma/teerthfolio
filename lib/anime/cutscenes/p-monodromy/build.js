// BUILD for p-monodromy (DIRECTION). Assembles world (layer 0), cast + fx (layer 1) via composeLayers, which isolates
// failures (a layer that throws is muted, the others keep playing). Cue names/times come from ./scene.js (CUES).
//
// Strike light, the one thing spanning layers: engine.sun swings from the low gold sun to the bolt's overhead key on
// `strikeWash` then relaxes, so terrace faces take a hard wash for 0.6 s.
//   m(t) = strikeWash active ? 1 - smooth(k) : 0 ;  sun = normalize(lerp(day, strikeDir, m))
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const inner = composeLayers(ctx, { world, cast, fx });
  const T = ctx.THREE;
  const day = new T.Vector3(0.4, 0.8, 0.45).normalize();
  const strikeDir = new T.Vector3(0.0, 1.0, -0.2).normalize(); // the bolt falls down the palace axis
  const sun = day.clone();
  return {
    group: inner.group,
    update(t, dt, cue) {
      inner.update(t, dt, cue);
      try {
        const k = cue.on("strikeWash") ? cue.k("strikeWash") : 1;
        const m = k < 1 ? 1 - ctx.ease.smooth(k) : 0;
        sun.copy(day).lerp(strikeDir, m).normalize();
        if (ctx.engine) ctx.engine.sun = sun;
      } catch (e) { /* the sun is cosmetic: never break the cut */ }
    },
    dispose() { if (inner.dispose) inner.dispose(); },
  };
}
