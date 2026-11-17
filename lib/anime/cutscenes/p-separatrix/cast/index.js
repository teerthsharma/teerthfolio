// CAST for p-separatrix: the original pale pup opens and closes the cutscene; between the turn and the return the approved Giorno seal stands there, inked in the fresco's tones.
import { Group } from "three";
import { sitePup } from "./pup.js";
import inkHero from "./fresco-ink.js";
import { flash, swapAt } from "./swap.js";
import { SEAL, warp } from "../clock.js";

const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const ink = inkHero(ctx);
  const pup = sitePup({ yaw: SEAL.yaw });
  const group = new Group();
  group.add(pup.group);
  return {
    group,
    update(t) {
      const s = swapAt(t);
      ctx.seal.group.visible = s.hero;
      pup.group.visible = s.pale;
      squash(ctx.seal.group, s.sqHero, SEAL.scale);
      squash(pup.group, s.sqPale, 1);
      pup.update(t);
      ink.set(s.hero, flash(t) > 0, warp(t), ctx.engine.renderer.getPixelRatio());
    },
    dispose() { pup.dispose(); },
  };
}
