// FX layer for p-nerve (Death Note). Layer 1. Composes five isolated modules; one that throws is muted, the rest play.
//   atmos   floodlight shaft + 9 hard streak bands, rain, splash rings, light-streak bands over the picture
//   tower   bell toll ring (3 f), amber rim pulse (e^-5t), pigeons
//   gauges  beads, red pops, blue flare (4-point star, 12 f up and hold), 160 grains, SHING slash
//   finale  realm gap (monochrome, 24 radial lines, 3 red apples), crack web, flat cel shards
//   sfx     DONG / KUKUKU / SCRITCH / SHING / RIP / CRUNCH lettering, chain witness ring, foil glint
// Impact frames (SHING, CRUNCH), speed lines on the claw and the realm are RESERVED beats owned by scene.js
// (`impact` at the shing and crunch times; `speedlines` at the realm), never built here.
// Every additive or translucent effect is multiplied by sealMask() so nothing lies over the seal and the seal never
// takes light (L2, L8). The seal itself is never touched: no emission, no bloom.
import * as THREE from "three";
import { makeShared, timeline } from "./common.js";
import { anchors, DEFAULTS } from "./anchors.js";
import atmos from "./atmos.js";
import tower from "./tower.js";
import gauges from "./gauges.js";
import finale from "./finale.js";
import sfx from "./sfx.js";

export default function build(ctx) {
  const group = new THREE.Group(); group.name = "nerve-fx";
  const U = makeShared();
  const S = { U, TL: timeline(ctx), A: anchors(ctx.scene), D: DEFAULTS };
  const mods = [];
  for (const [name, fn] of [["atmos", atmos], ["tower", tower], ["gauges", gauges], ["finale", finale], ["sfx", sfx]]) {
    try { const m = fn(ctx, S); group.add(m.group); mods.push({ name, m, dead: false }); }
    catch (e) { console.error(`[p-nerve fx] ${name} failed to build:`, e); ctx.player?.errors?.push({ layer: `fx/${name}`, message: String(e?.stack ?? e) }); }
  }
  const chest = new THREE.Vector3();
  return {
    group,
    update(t, dt, cue) {
      ctx.seal.chest(chest); U.uSeal.value.copy(chest);
      U.uSealR.value = Math.max(0.8, (ctx.seal.height || 1.2) * 0.6);
      for (const e of mods) {
        if (e.dead) continue;
        try { e.m.update(t, dt, cue); }
        catch (err) { e.dead = true; e.m.group.visible = false; console.error(`[p-nerve fx] ${e.name} update failed:`, err); ctx.player?.errors?.push({ layer: `fx/${e.name}`, message: String(err?.stack ?? err) }); }
      }
    },
    dispose() { for (const e of mods) { try { e.m.dispose(); } catch (err) { /* already gone */ } } },
  };
}
