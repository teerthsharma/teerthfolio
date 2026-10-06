// BUILD for p-resolvent (DIRECTION layer). Imports only the three layer entry points and the framework.
// It (1) publishes `ctx.dir` (stage + the shared dusk curve) BEFORE the layers build, so world/cast/fx agree on one
// definition; (2) composes the layers (a layer that throws is muted, the rest play); (3) drives the light-shaft sun
// and its dusk dimming from the timeline.
//
// ctx.dir = { stage, dim(cue) -> 0.8..1, unmake(cue) -> 0..1, release(cue) -> 0..1 }
//   dim:     1 before 7.7; eases to stage.dimTo over the `dim` beat at 7.7 (0.3 s); eases back to 1 over the `dim`
//            beat with release:true at 10.3 (0.8 s). Pure function of the clock, so scrubbing equals playing.
//   unmake:  0..1 across the unmaking 13.0 -> 15.4 (the dissolve to the island).
//   release: 0..1 from the release at 7.7 over 0.6 s.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export default function build(ctx) {
  const { THREE, engine, scene } = ctx;
  const stage = scene.stage;
  const T = { dimIn: 7.7, dimInDur: 0.3, dimOut: 10.3, dimOutDur: 0.8 };
  ctx.dir = {
    stage,
    dim(cue) {
      const t = cue.t, to = stage.dimTo ?? 0.8;
      const down = sm((t - T.dimIn) / T.dimInDur), up = sm((t - T.dimOut) / T.dimOutDur);
      return 1 + (to - 1) * down * (1 - up);
    },
    unmake(cue) { return sm((cue.t - stage.unmake[0]) / (stage.unmake[1] - stage.unmake[0])); },
    release(cue) { return sm((cue.t - T.dimIn) / 0.6); },
  };

  // the low sun for the light shafts: a far point along the sun direction from the seal
  const sunDir = new THREE.Vector3(...stage.sunDir).normalize();
  const sun = sunDir.clone().multiplyScalar(900);
  const prevSun = engine.sun;
  engine.sun = sun;

  const layers = composeLayers(ctx, { world, cast, fx });
  return {
    ...layers,
    update(t, dt, cue) {
      // the shafts dim with the dusk and glow when the column rises; sun is held still (static light)
      engine.sun = sun;
      layers.update(t, dt, cue);
    },
    dispose() { layers.dispose(); engine.sun = prevSun ?? null; },
  };
}
