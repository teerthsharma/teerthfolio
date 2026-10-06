// COLONY: eight 0.28 m costumed pups (tiny dark collars #1c1816) under the hut eave, x 4.62 to 6.78, z 0 to 0.45, each holding a tiny apple (0.09 m, #b3171f).
// Hop on every toll (0.12 m, 0.35 s, staggered 0.02 s a pup); munch from the crunch beat (eat): bow bobs at 8 Hz and the apple shrinks over 1.2 s.
import { T, lerp, clamp01, sinceToll, buildApple } from "./util.js";
import { colonySpec } from "./costumes.js";

export function buildColony(ctx) {
  const rng = ctx.rng("p-nerve-colony");
  const pups = [];
  const furs = [["#8e8c91", "#6d6b7d"], ["#a09a92", "#76706a"], ["#6f6e78", "#4d4c5c"], ["#9b9aa6", "#6f6e82"]];
  for (let i = 0; i < 8; i++) {
    const [c, s] = furs[Math.floor(rng() * furs.length)];
    const h = ctx.kit.costumedSeal(ctx.engine, colonySpec(c, s));
    const x = 4.62 + (i / 7) * (6.78 - 4.62), z = rng() * 0.45;
    h.place(x, 0, z, 0).lookAtPoint(ctx.seal.at[0], ctx.seal.at[2]);
    // tiny apple at the right grip: 0.09 m on a 0.35-scaled body -> local radius 0.045 / 0.35 / 1 = 0.13 (apple default r 0.11 = 0.22 m)
    const apple = buildApple(ctx, 0.13); apple.position.set(0.24, 0.3, 0.3); h.body.add(apple);
    pups.push({ h, apple, i, y0: 0, ph: rng() * 6.28 });
  }
  return {
    roots: pups.map((p) => p.h.group),
    update(t, cue) {
      const eat = T(cue, "eat");
      for (const p of pups) {
        // hop: half-sine over 0.35 s after the most recent toll, per-pup delay
        const st = sinceToll(cue, t) - p.i * 0.02;
        p.h.group.position.y = st >= 0 && st < 0.35 ? 0.12 * Math.sin(Math.PI * st / 0.35) : 0;
        const m = t >= eat ? 1 : 0;
        p.h.setPose("bow", m * (0.35 + 0.35 * Math.sin((t - eat) * 8 + p.ph)));
        p.h.setPose("recoil", st >= 0 && st < 0.2 ? 0.4 : 0);
        p.h.expression(m ? "calm" : "neutral", 1);
        p.apple.scale.setScalar(m ? lerp(1, 0.35, clamp01((t - eat) / 1.2)) : 1);
        p.h.update(t);
      }
    },
    dispose() { for (const p of pups) p.h.dispose(); },
  };
}
