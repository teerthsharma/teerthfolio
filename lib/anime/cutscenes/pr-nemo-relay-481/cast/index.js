// CAST layer for pr-nemo-relay-481: the pale playable seal, swapped for the character at the impact and back at BACK, with the cel coat and the crouch.
import { Group } from "three";
import { sitePup } from "./pup.js";
import { wrapCel } from "./character.js";
import { BACK, SEAL, smooth } from "../clock.js";
import { STAND } from "../lens.js";

const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const cel = wrapCel(ctx), pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.6, 0.3] } }), group = new Group(), S = SEAL.pup;
  pup.group.position.set(...STAND);
  group.add(pup.group);
  return {
    group,
    update(t) {
      const on = t >= 1.15 && t < BACK + 2 / 24, into = Math.floor((t - 1.15 - 0.12) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on; pup.group.visible = !on;
      pup.update(t, { spent: smooth(18.6, 19.2, t) * (1 - smooth(20.6, 20.8, t)) });
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? 1, SEAL.scale);
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, S);
      cel.update(on);
    },
    dispose() { cel.dispose(); ctx.seal.group.visible = true; pup.dispose(); },
  };
}
