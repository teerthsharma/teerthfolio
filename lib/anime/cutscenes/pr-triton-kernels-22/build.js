// BUILD for pr-triton-kernels-22 (DIRECTION). Assembles world / cast / fx and drives the one thing the three layers share:
// the 2.39:1 letterbox on the shrine reveal (bible shots 2-4, post uniform uBox), eased by the `letterbox` beat.
// Everything else (cues, the camera law, impact frames, shake, bubbles) is data in scene.js, played by the framework.
// uBox maths: bar fraction per side b = (1 - aspect/2.39)/2 (visible height = width/2.39);
//   b(t) = b * smooth(s / 0.18) * (1 - smooth((s - (dur - 0.25)) / 0.25)), s = seconds since the letterbox beat started.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  const { engine, ease } = ctx;
  const update = comp.update;
  comp.update = (t, dt, cue) => {
    update(t, dt, cue);
    const u = engine.shared?.uBox;
    if (u) {
      const aspect = ctx.aspect?.() ?? 16 / 9;
      const full = Math.max(0, (1 - aspect / 2.39) / 2);
      const s = cue.since("letterbox"), dur = cue.arg("letterbox", "dur", 6.13);
      const k = s === Infinity || s < 0 ? 0 : ease.smooth(Math.min(1, s / 0.18)) * (1 - ease.smooth(Math.min(1, Math.max(0, (s - (dur - 0.25)) / 0.25))));
      u.value = full * k;
    }
  };
  const dispose = comp.dispose;
  comp.dispose = () => { dispose(); const u = engine.shared?.uBox; if (u) u.value = 0; };
  return comp;
}
