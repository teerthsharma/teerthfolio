// BUILD for pr-mujoco-3450 (DIRECTION agent). Imports the three layer entry points, the framework and this dock's own scene.js.
// Each layer exports `export default function build(ctx)` returning { group, update(t, dt, cue), dispose }.
// composeLayers isolates them: a layer that throws leaves the others playing.
//
// Besides the three layers this file adds a fourth part, `direction`: it owns no geometry, only the Madhouse colour script (scene.colourScript):
// per shot it drives post saturation (0.9 wide to 1.1 on the punch) and the vignette (18 percent, tightening to 28 percent on the crouch).
// Maths: sat(t) = S[shot.n];  vig(t) = lerp(from, to, smooth(w)) over the `vignette` cue, w = min(a / 0.4d, (d - a) / 0.35d), a = t - cue.t;
//        outside the cue window vig = from (released by f101).
// It writes engine.composer.u.uSat / uVig only (the engine's own post uniforms), never anything of another layer's.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";
import scene from "./scene.js";

function direction(ctx) {
  const group = new ctx.THREE.Group();
  group.name = "direction";
  const U = ctx.engine?.composer?.u;
  const table = scene.colourScript;
  const vc = scene.beats.find((b) => b.name === "vignette");
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const base = U ? { sat: U.uSat.value, vig: U.uVig.value } : null;
  return {
    group,
    update(t) {
      if (!U) return;
      const row = table.find((r) => t >= r.t[0] && t < r.t[1]) ?? table[table.length - 1];
      let vig = vc ? vc.from : base.vig;
      if (vc) {
        const a = t - vc.t, d = vc.dur;
        // in over the first 40 percent of the window (before the punch lands), out over the last 35 percent
        if (a >= 0 && a <= d) vig = vc.from + (vc.to - vc.from) * smooth(Math.min(a / (0.4 * d), (d - a) / (0.35 * d)));
      }
      U.uSat.value = row.sat;
      U.uVig.value = vig;
    },
    dispose() { if (U && base) { U.uSat.value = base.sat; U.uVig.value = base.vig; } },
  };
}

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx, direction });
}
