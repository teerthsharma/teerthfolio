// CAST for pr-topograph-432: the original seal (the pale playable pup, pup.js) on the island, and the seal in Ainz's cloak (the look's rig) on the
// hall floor, printed in the cover's ink (comic-ink.js). They swap under the impact frame at T.impact and back on the star at T.back.
import { Group } from "three";
import { sitePup } from "./pup.js";
import { inkHero } from "./comic-ink.js";
import { HIT, T } from "../clock.js";

const HITS = [HIT.eyes, HIT.rise, HIT.reveal, HIT.staff];
const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const group = new Group(), S = ctx.scene.seal.scale ?? 1;
  ctx.scene.seal.hero.extras?.(ctx.engine, ctx.seal.hero);
  const ink = inkHero(ctx), pup = sitePup({ yaw: 0.6, track: { sign: [T.sign[0], 0.6, 0.3], hop: 20.9, turn: 0.2, blink: [27.0] } });
  group.add(pup.group);
  return {
    group,
    update(t, dt, cue) {
      const on = t >= T.impact && t < T.back + 2 / 24;
      const into = Math.floor((t - T.turn) * 12 + 1e-6), out = Math.floor((t - T.back) * 24 + 1e-6);
      ctx.seal.group.visible = on; pup.group.visible = !on;
      pup.update(t);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1), S);
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
      let flash = 0; // a hit lands on the figure as a flat silhouette: ink on its first drawing, gold on the second
      for (const h of HITS) { const f = Math.floor((t - h) * 24 + 1e-6); if (f === 0) flash = 2; else if (f === 1) flash = 1; }
      ink.set({ on, t, dpr: ctx.engine.renderer.getPixelRatio(), flash });
    },
    dispose() { ink.dispose?.(); pup.dispose(); ctx.seal.group.visible = true; },
  };
}
