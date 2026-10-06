// CAST layer for p-faraday: Touma-seal, Kuroko-seal and 10 colony seals (all costumed seals, law L6b), plus the hero's vest and coin.
// Layer 1 (redrawn every step). Positions are relative to the hero seal's `at`: +x is the beam line, the colony and Kuroko's lamp stand on +z.
// Cue names read (all optional; the bible's absolute times are the fallback): sign, lineA, shot, lineC, credit, coin.
// Reaction beats come from the clock of `shot` (6.8 s): hit-stop 4 frames, then everything on twos from the stepped t.
import { buildTouma } from "./touma.js";
import { buildKuroko } from "./kuroko.js";
import { buildColony } from "./colony.js";
import { buildHero } from "./hero.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const parts = [];
  const mk = (f) => { try { const p = f(ctx); parts.push(p); return p; } catch (e) { console.warn("[p-faraday/cast]", e); return null; } }; // one broken figure never mutes the rest
  const hero = mk(buildHero);
  const touma = mk(buildTouma), kuroko = mk(buildKuroko), colony = mk(buildColony);
  for (const p of [touma, kuroko]) if (p) group.add(p.root);
  for (const r of colony?.roots ?? []) group.add(r);
  const base = [0, 0, 0];
  return {
    group,
    update(t, dt, cue) {
      const at = ctx.seal.at; base[0] = at[0]; base[1] = at[1]; base[2] = at[2];
      hero?.update(t, cue);
      touma?.update(t, cue, base);
      kuroko?.update(t, cue, base);
      colony?.update(t, cue, base);
    },
    dispose() { for (const p of parts) p?.dispose?.(); },
  };
}
