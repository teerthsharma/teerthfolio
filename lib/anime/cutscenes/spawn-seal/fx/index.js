// FX layer for spawn-seal (FX agent). Layer 1: everything that glows, flies, flashes or eats. Imports only this folder.
// Parts (each its own file, each isolated: one that throws is muted and the rest keep playing):
//   stage.js    pool ripples + caustics, cave light shafts, Veldora's barrier pulse
//   morph.js    slime-morph column around the seal, 4-point eye glint
//   megiddo.js  seven water lenses and the gold beam cones, contact flares
//   lattice.js  topology lattice, loop, node halos, cyan / gold / pink territories
//   maw.js      Predator pearl sphere, rim, inflowing dust
//   dome.js     flashes (capped 0.35), credit-hold violet cooling, the eat front (void shell behind the seal)
//   sparks.js   all particle emitters + bokeh
// Impact frames (240-241 f, 643-644 f), gold speed lines (240-262 f), SFX lettering, the Raphael panel are scene.js beats / overlay (direction).
//
// Cue names used (all optional; each falls back to the bible's fixed time if the direction layer does not fire it):
//   plop(1.0) plop2(29.29) shafts(1.0) veldora(2.79) morph(4.42) glint(6.7) lenses(9.42) beams(10.0) lattice(13.8)
//   cool(22.58) maw(26.79) flash{strength}   (shan 8.04 and pon 18.54 are read at their fixed times)
import stage from "./stage.js";
import morph from "./morph.js";
import megiddo from "./megiddo.js";
import lattice from "./lattice.js";
import maw from "./maw.js";
import dome from "./dome.js";
import sparks from "./sparks.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group(), parts = [];
  for (const [name, make] of [["dome", dome], ["stage", stage], ["lattice", lattice], ["megiddo", megiddo], ["morph", morph], ["maw", maw], ["sparks", sparks]]) {
    try { const p = make(ctx); group.add(p.group); parts.push({ name, p, dead: false }); }
    catch (e) { console.warn(`[spawn-seal/fx] ${name} failed to build:`, e); }
  }
  return {
    group,
    update(t, dt, cue) {
      for (const o of parts) {
        if (o.dead) continue;
        try { o.p.update(t, dt, cue); }
        catch (e) { o.dead = true; o.p.group.visible = false; console.warn(`[spawn-seal/fx] ${o.name} muted:`, e); }
      }
    },
    dispose() { for (const o of parts) { try { o.p.dispose(); } catch { /* already gone */ } } },
  };
}
