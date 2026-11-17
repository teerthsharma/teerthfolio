// CAST for p-aether-lang: the original seal (the site's pale pup, cast/pup.js) opens and closes the cutscene; the character (the hero, look
// gojo) is the same seal in the void. The swap is under the impact frame and at the return (BACK), each on twos with its squash.
import { Group } from "three";
import { sitePup } from "./pup.js";
import { SKIN, skin } from "./skin.js";
import { BACK, HIT, SEAL, TL, realOf, smooth } from "../clock.js";

const F = (n) => n / 24;
const ENTER = [0.5, 1.16, 0.97], POP = [0.6, 1.14, 1.14, 0.96, 0.96];
const SIGN = [realOf(TL.sign[0]), realOf(TL.sign[1])];
const partOf = (o) => {
  for (let p = o; p; p = p.parent) {
    if (/hair/i.test(p.name ?? "")) return "hair";
    if (/eye/i.test(p.name ?? "")) return "eyes";
  }
  return "fur";
};

export default function build(ctx) {
  const root = ctx.seal.group, S = SEAL.scale, seen = new Set();
  root.traverse((o) => {
    if (!o.isMesh || !o.material || seen.has(o.material)) return;
    seen.add(o.material);
    o.material = skin(o.material, partOf(o));
  });
  const pup = sitePup({ yaw: SEAL.yaw, track: {} }), group = new Group();
  group.add(pup.group);
  const squash = (g, k, s = S) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));
  return {
    group,
    update(t) {
      const on = t >= HIT.impact && t < BACK + F(2);
      root.visible = on;
      pup.group.visible = !on;
      pup.setSign(t < HIT.impact ? smooth(SIGN[0], SIGN[1], t) : 0);
      pup.update(t);
      const ei = Math.floor((t - HIT.impact) * 12 + 1e-6), pi = Math.floor((t - BACK - F(2)) * 12 + 1e-6);
      if (on) squash(root, t < HIT.impact + F(6) && ei >= 0 ? ENTER[ei] ?? 1 : t >= BACK - F(4) ? 0.86 : 1);
      else squash(pup.group, pi >= 0 ? POP[pi] ?? 1 : 1, 1);
      SKIN.uOn.value = t >= HIT.impact + F(2) && t < BACK ? 1 : 0;
      SKIN.uCell.value = 6 * ctx.engine.renderer.getPixelRatio();
    },
    dispose() { pup.dispose(); root.visible = true; SKIN.uOn.value = 0; },
  };
}
