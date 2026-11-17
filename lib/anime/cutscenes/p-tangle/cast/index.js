// CAST for p-tangle: the site's pale playable pup (pup.js) and the approved character (the hero rig, look p-tangle, untouched). They swap under the impact frame,
// and the character turns back into the pup on screen at BACK. The cord wrap is tied on whichever seal is showing (wrap.js); the dusk lights the rig's own materials (dusk.js).
import { Group, Vector3 } from "three";
import { sitePup } from "./pup.js";
import { tieWrap, wrapScale } from "./wrap.js";
import { duskLook } from "./dusk.js";
import { BACK, LINE, SEAL } from "../clock.js";
import { SWAP } from "../fx/swap.js";

const S = SEAL.scale, OPEN = 2 / 24;
const squash = (g, k, s = S) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.6, 0.3], hop: BACK + 0.4, turn: 0, blink: [BACK + 1.5] } });
  const group = new Group();
  group.add(pup.group);
  const tieP = tieWrap(pup.flipR), tieC = tieWrap(null);
  ctx.seal.hero.attach(tieC.obj, "handR");
  const dusk = duskLook(ctx);
  ctx.cast = { ...(ctx.cast ?? {}), tie: ctx.cast?.tie ?? new Vector3() };
  return {
    group,
    update(t) {
      const on = t >= LINE.impact && t < BACK + OPEN, into = Math.floor((t - LINE.impact - 0.12) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on;
      pup.group.visible = !on;
      pup.update(t);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? SWAP.squashOut[0] : 1));
      else squash(pup.group, out >= 2 ? SWAP.squashIn[out - 2] ?? 1 : 1, 1);
      tieC.obj.visible = on;
      tieC.set(wrapScale(t));
      tieP.obj.visible = !on && t >= BACK;
      tieP.set(1);
      if (on) tieC.world(ctx.cast.tie); else pup.tie(ctx.cast.tie);
    },
    dispose() { dusk.dispose(); pup.dispose(); tieP.dispose(); tieC.dispose(); ctx.seal.group.visible = true; },
  };
}
