// CAST layer for p-nerve: Ryuk-seal (the control), L-seal, the 8-pup colony (all costumed seals, law L6b), plus the hero's collar, tie, notebook, pen,
// chip bag / page, the apple and the handcuff chain. Layer 1 (redrawn every step). The hero seal itself is ctx.seal (locked, poses from scene.seal.track).
// Cue names read (every one optional; the bible's absolute scene times in util.js TL are the fallback; since() of the beat overrides):
//   apple take bite1 bite2 bite3 strokes strokesEnd write toll1 toll2 toll3 flare flick bag page pageEnd eat lineC
// World layout (bible 4.1 to 4.3): Ryuk (1.55, 0.55, -2.35), L (-3.55, -0.24, -2.2), colony x 4.62 to 6.78 / z 0 to 0.45 under the hut eave.
import { buildRyuk } from "./ryuk.js";
import { buildL, L_CUFF } from "./l.js";
import { buildColony } from "./colony.js";
import { buildHero, HERO_CUFF } from "./hero.js";
import { buildAppleProp } from "./apple.js";
import { buildChain } from "./chain.js";
import { L1 } from "./util.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const parts = [];
  const mk = (n, f) => { try { const p = f(); parts.push(p); return p; } catch (e) { console.warn(`[p-nerve/cast:${n}]`, e); return null; } }; // one broken figure never mutes the rest
  const hero = mk("hero", () => buildHero(ctx));
  const ryuk = mk("ryuk", () => buildRyuk(ctx));
  const l = mk("l", () => buildL(ctx));
  const colony = mk("colony", () => buildColony(ctx));
  const apple = ryuk && mk("apple", () => buildAppleProp(ctx, ryuk));
  const chain = l && mk("chain", () => buildChain(ctx, l.h, { l: L_CUFF, h: HERO_CUFF }));
  for (const p of [ryuk, l, apple, chain]) if (p) group.add(p.root);
  for (const r of colony?.roots ?? []) group.add(r);
  L1(group);
  return {
    group,
    update(t, dt, cue) {
      hero?.update(t, cue);
      ryuk?.update(t, cue);
      l?.update(t, cue);
      colony?.update(t, cue);
      apple?.update(t, cue); // after Ryuk: it reads the claw's world position
      chain?.update(t, cue);
    },
    dispose() { for (const p of parts) p?.dispose?.(); },
  };
}
