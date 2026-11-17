// HERO SWAP for p-resolvent: the pale playable seal (cast/pup.js, the site's own pup) becomes the Frieren character (ctx.seal, the hero rig
// in look p-resolvent) under the impact frame, and is the pale pup again on screen after the gold star at BACK. The rig is never edited:
// this file only switches it, squashes it and lifts it, as Sukuna's cast/index.js does.
import { Group } from "three";
import { BACK, IMPACT, LIFT, SEAL, YAWAT, beatT } from "../clock.js";
import { sitePup } from "./pup.js";

const squash = (g, k, s = 1) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export function heroSwap(ctx) {
  const pup = sitePup({ yaw: SEAL.pup, track: { sign: [0.45, 0.6, 0.9], blink: [1.7, 24.6] } });
  const group = new Group();
  group.add(pup.group);
  return {
    group,
    update(t) {
      const on = t >= IMPACT && t < BACK + 2 / 24;
      const into = Math.floor((t - IMPACT - 0.12) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on;
      pup.group.visible = !on;
      pup.update(t);
      pup.group.rotation.y = YAWAT(t);
      if (on) {
        squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1), SEAL.scale);
        ctx.seal.group.position.y = LIFT(beatT(t));
      } else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
    },
    dispose() {
      ctx.seal.group.visible = true;
      pup.dispose();
      group.removeFromParent();
    },
  };
}
