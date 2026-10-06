// WORLD layer for p-aether-lang: the INFINITE VOID of Jujutsu Kaisen (MAPPA). Bible: scripts/p-aether-lang.md sections 2, 3.1-3.9, 3.20.
// Rig frame: the rig group sits at the seal's feet; the core is 15 m behind the pup at (0, 1.7, -15), so figures facing the lens are rim-lit by it.
// Layer 0 (baked per shot): only the pocket's dark plate. Everything that opens, drifts, freezes or fades with the void is layer 1 (redrawn each step).
// Cue names read (all optional; the bible times are the fallback): bloom, flood, freeze, ring, still, collide, clear.
// Not here (CAST / FX own them): victims, blindfold relic, glints, STILL lettering, orbs, Purple, tunnel.
import { Group } from "three";
import nebula from "./nebula.js";
import stars from "./stars.js";
import core from "./core.js";
import flood from "./flood.js";
import floor from "./floor.js";
import krackle from "./krackle.js";
import ring from "./ring.js";
import glow from "./glow.js";

export default function build(ctx) {
  const group = new Group();
  const rig = new ctx.THREE.Group();
  rig.position.set(...ctx.seal.at);
  group.add(rig);
  const neb = nebula(ctx, rig);
  group.add(neb.plate);
  rig.add(neb.shell);
  const parts = [stars(ctx), core(ctx), flood(ctx), floor(ctx, rig), krackle(ctx), ring(), glow(ctx, rig)];
  for (const p of parts) rig.add(p.group);
  return {
    group,
    update(t, dt, cue) { neb.update(t, cue); for (const p of parts) p.update(t, cue); },
    dispose() { neb.dispose(); for (const p of parts) p.dispose(); },
  };
}
