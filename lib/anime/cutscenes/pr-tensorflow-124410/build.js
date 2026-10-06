// BUILD for pr-tensorflow-124410 (DIRECTION agent). Imports only the three layer entry points and the framework.
// It composes the three layers and drives the shared timeline state they read from ctx, so no layer re-derives it:
//
//   ctx.pal    { name, cols:[5 hex], invert, note }   the colour-script entry now active (hard cut, ON TWOS).
//   ctx.stage  { stopped, stopK, resume, tearK, island, dutch }
//                stopped : true while time is stopped (6.21-7.46): the world clock, spray, bystanders and Jotaro
//                          freeze; only DIO and The World keep moving.
//                stopK   : 0..1 across the stop. tearK: 0..1 across the poster tear (9.3-10.14). island: from 9.54.
//                dutch   : diagonal roll in degrees during the barrage, flipping every 2 frames (informational:
//                          the director's own dutch ramp is in scene.shots).
// The scene's stage coordinates are in scene.stage (ctx.scene.stage). Layers refresh from these in update().
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const scene = ctx.scene;
  ctx.pal = { name: "violet", cols: scene.palettes.violet.cols, invert: false, note: scene.palettes.violet.note };
  ctx.stage = { stopped: false, stopK: 0, resume: 0, tearK: 0, island: false, dutch: 0 };

  const comp = composeLayers(ctx, { world, cast, fx });
  const inner = comp.update ? comp.update.bind(comp) : null;

  // the timeline driver: runs before the layers, on the stepped clock (palette swaps cut ON TWOS)
  const drive = (t, dt, cue) => {
    const ts = ctx.step ? ctx.step(t) : t;
    let name = ctx.pal.name;
    for (const b of scene.beats) if (b.name === "palette" && ts >= b.t && ts < b.t + b.dur) { name = b.set; break; }
    if (name !== ctx.pal.name && scene.palettes[name]) {
      const p = scene.palettes[name];
      ctx.pal.name = name; ctx.pal.cols = p.cols; ctx.pal.invert = !!p.invert; ctx.pal.note = p.note;
    }
    const S = ctx.stage, on = (n) => !!(cue && cue.on && cue.on(n)), k = (n) => (cue && cue.k ? cue.k(n) : 0);
    S.stopped = on("timestop");
    S.stopK = S.stopped ? k("timestop") : 0;
    S.resume = on("resume") ? k("resume") : 0;
    S.tearK = on("tear") ? k("tear") : ts > 10.14 ? 1 : 0;
    S.island = ts >= 9.54;
    S.dutch = on("muda") ? (Math.floor(ts * ctx.fps) % 2 ? 7 : -7) * (0.4 + 0.6 * k("muda")) : 0;
  };

  return {
    group: comp.group,
    update(t, dt, cue) { drive(t, dt, cue); if (inner) inner(t, dt, cue); },
    dispose() { if (comp.dispose) comp.dispose(); },
  };
}
