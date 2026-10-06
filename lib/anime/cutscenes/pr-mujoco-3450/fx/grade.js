// E18 POST: composite tweaks (grade, vignette, shake) for the Madhouse S1 register, as pure functions of the clock written onto the
// engine's composer uniforms. Base values are captured on the first frame (the style's own numbers) and restored on dispose, so this
// layer is a multiplier on whatever style the direction picked, never a replacement.
// MATHS
//   vignette   uVig = base + 0.10 s(t; TP - 6f .. TP) (1 - s(t; TP + 8f .. TP + 30f))          (18 percent tightening to 28 percent before the punch)
//   saturation uSat = base x [ 0.92 (wide, cool desaturated) -> 1.10 (the punch) -> 1.0 (aftermath) ]:
//              0.92 + 0.18 s(TP - 3f .. TP + 2f) - 0.10 s(TP + 30f .. TP + 60f)
//   shake      one trauma of 0.6 the instant the clock crosses TP (decays 1.6/s => ~14 frames of 4 px), latched, re-armed when scrubbed back
//   engine one-offs (only when the scene did not fire them as beats): impact [[1,1],[2,1]] (mono white, inverted; frame 3 is screen.js's
//              red-black card), the warp ring `shock` at the strike
import { clamp, sstep, fr } from "./util.js";

export function make(ctx, S) {
  const { T } = S, u = ctx.engine.composer.u, TP = T.TP;
  let base = null, latched = false;
  if (!T.has("impact")) ctx.sakuga.impact(TP, [[1, 1], [2, 1]]);            // f94 mono white, f95 inverted (the 1-drawing white flash)
  if (!T.has("shock")) ctx.sakuga.shock({ t: TP, dur: 0.45, at: [0.5, 0.52], amp: 0.035, r1: 0.9 });
  return {
    group: null,
    update(ts, dt, cue) {
      if (!base) base = { vig: u.uVig.value, sat: u.uSat.value };
      const t = cue.t;
      const vig = 0.10 * sstep(TP - fr(6), TP, t) * (1 - sstep(TP + fr(8), TP + fr(30), t));
      u.uVig.value = base.vig + vig;
      const sat = 0.92 + 0.18 * sstep(TP - fr(3), TP + fr(2), t) - 0.10 * sstep(TP + fr(30), TP + fr(60), t);
      u.uSat.value = base.sat * clamp(sat, 0.5, 1.3);
      if (!T.has("trauma")) {
        if (t >= TP && !latched) { latched = true; ctx.sakuga.trauma(0.6); }
        if (t < TP - 0.1) latched = false;
      }
    },
    dispose() { if (base) { u.uVig.value = base.vig; u.uSat.value = base.sat; } },
  };
}
