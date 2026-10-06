// FX layer for pr-pyrefly-4180 (Naruto Shippuden, Nine-Tails chained and sealed; kiri-e paper theatre). Layer 1.
// Modules: lamp (back lamp + transmission + die-off), orb (roar rings, dark orb, trigram belly seal), ftg (Flying Thunder God
// streaks + sealing script), chain (208 links, hoop at 100, coral surge, burst), rosette (kirigami + brass pin), embers (leaves/embers).
// Cue names read (all optional, bible defaults apply if absent): roar orb throw ftg chain surge burst rosette pin trigram lamp_die.
// Stage anchors: scene.stage = { fox:[x,y,z], kunai:[[x,y,z] x3] } in world metres, else the fox stands 14 m ahead of the seal.
// Impact frames / speed lines / shock are NOT built here: the burst impact is a scene.js beat ("impact" at the burst time).
// The seal is never emissive and nothing here is placed between lens and seal on purpose (all fx sit at the fox).
import { stage } from "./util.js";
import lamp from "./lamp.js";
import orb from "./orb.js";
import ftg from "./ftg.js";
import chain from "./chain.js";
import rosette from "./rosette.js";
import embers from "./embers.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const S = stage(ctx);
  const parts = [lamp, orb, ftg, chain, rosette, embers].map((m) => { const p = m(ctx, S); group.add(p.group); return p; });
  return {
    group,
    update(t, dt, cue) { for (const p of parts) p.update(t, dt, cue); },
    dispose() { parts.forEach((p) => p.dispose()); },
  };
}
