// CAST for p-asmodeus: the pale playable pup and the Demon Lord (ctx.seal) pinned to the band at the same point, swapped at the turn and the return, and Lucifer.
import { Group, Vector3 } from "three";
import { depthFor, pin, shotAt } from "../cams.js";
import { TURN_IN, TURN_OUT } from "../clock.js";
import { layout } from "../layout.js";
import { makeLucifer } from "./lucifer.js";
import { sitePup } from "./pup.js";

const PUP_SCALE = 0.65; // the site pup is 1.30 m at scale 1; the pin fills 0.85 m for a seal
const SQUASH = [0.6, 1.14, 1.14, 0.96, 0.96];
const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  ctx.scene.seal.hero?.extras?.(ctx.engine, ctx.seal.hero);
  const group = new Group(), pupHold = new Group(), pup = sitePup({ yaw: 0, track: { blink: [0.6, 11.6] } });
  pupHold.add(pup.group);
  const luc = makeLucifer(ctx);
  group.add(pupHold, luc.group);
  const at = new Vector3(), hero = ctx.seal;
  return {
    group,
    update(t, dt, cue) {
      const L = layout(t), s = shotAt(t), A = ctx.aspect();
      pin(s, t, A, L.hero.u, L.hero.v, depthFor(s, t, A, 0.85, L.hero.hh), at);
      const yaw = Math.atan2(s.eye[0], s.eye[2]);
      const heroOn = t >= TURN_IN && t < TURN_OUT;
      hero.group.visible = heroOn;
      pup.group.visible = !heroOn;
      hero.group.position.copy(at);
      hero.group.rotation.y = yaw;
      pupHold.position.copy(at);
      pupHold.rotation.y = yaw;
      const f = Math.floor(((cue?.t ?? t) - TURN_OUT - 1 / 12) * 24 + 1e-6);
      squash(pupHold, f >= 0 && f < SQUASH.length ? SQUASH[f] : 1, PUP_SCALE);
      pup.update(t);
      luc.update(t, dt, L);
    },
    dispose() { luc.dispose(); pup.dispose(); },
  };
}
