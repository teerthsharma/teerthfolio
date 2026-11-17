// CAST for pr-highway-3244: the site's pale playable pup on the dock and on the king's shoulder; the character (the hero rig) is swapped in under the impact frame.
import { Group } from "three";
import { sitePup } from "./pup.js";
import { makeSwap } from "./character.js";
import { C, LINE, POP, TURN, smooth } from "../clock.js";
import { seatFacing, sealRig } from "../race.js";

const env = (t, a, b, c) => smooth(a, a + c, t) * (1 - smooth(b, b + c, t));

export default function build(ctx) {
  const pup = sitePup({ yaw: TURN });
  const swap = makeSwap(ctx, pup);
  const group = new Group();
  group.add(pup.group);
  return {
    group,
    update(t) {
      const o = 1 - smooth(LINE.collapse[0], LINE.collapse[1], t), hop = smooth(LINE.collapse[0], LINE.collapse[1], t);
      swap.update(t);
      const seat = t >= C.hop[1] ? seatFacing(t) : null;
      pup.group.position.set(...sealRig(t));
      pup.update(t, {
        sign: env(t, 0.45, 1.05, 0.15), sit: smooth(2.3, C.hop[1], t) * o, raise: smooth(POP + 0.25, POP + 1.1, t) * o, fist: smooth(17.4, 17.7, t) * o,
        spin: (3 * hop) % 1, crouch: smooth(1.6, 1.75, t) * (1 - smooth(1.75, 2.1, t)), yaw: seat ?? 0,
      });
    },
    dispose() { swap.dispose(); pup.dispose(); },
  };
}
