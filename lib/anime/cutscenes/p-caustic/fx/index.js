// FX layer for p-caustic (layer 1): the BLUE Perfect Susanoo, sky tear, Tengai Shinsei meteors, impact (flash, ring, dust, crater,
// debris), chakra threads, the genjutsu shatter. Impact frames / speed lines / shake / shock warp are scene.js beats (reserved names).
// The seal is never emissive and nothing here sits between the lens and the seal (all matter is behind it or on the far ground).
//
// CUE NAMES (each falls back to the bible's absolute second when scene.js does not define the beat):
//   susanoo   1.7  dur 1.1   rise from the ground (also drives the ember cracks)
//   flareCast 3.45 dur .5    Susanoo flare + blue-white 12% card
//   skytear   3.45 dur .5    the sky rip opens (dark gap + light seam)
//   meteor1   3.8  dur .9    M1 flight;  land1 4.7 dur .35/.6/3  M1 landing (flash .15, ring, puffs, debris)
//   meteor2   4.85 dur 1.57  M2 slide-out, hang, slam (last 4 frames on ones)
//   flareHit  6.42 dur .45   Susanoo flare + warm flash 0.35;  hit 6.42  slam: shake, ring, 24 puffs, crater, web, debris
//   shatter   6.6  dur 1.5   sky-glass shards + daylight bloom
import { makeWin, disposeAll } from "./util.js";
import { buildSusanoo } from "./susanoo.js";
import { buildSky } from "./sky.js";
import { buildImpact } from "./impact.js";
import { buildThreads } from "./threads.js";
import { buildShatter } from "./shatter.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const win = makeWin(ctx);
  const parts = [buildThreads(ctx), buildSky(ctx), buildSusanoo(ctx), buildImpact(ctx), buildShatter(ctx)];
  parts.forEach((p) => group.add(p.group));
  return {
    group,
    update(t, dt, cue) { for (const p of parts) p.update(t, dt, cue, win); },
    dispose() { parts.forEach((p) => p.dispose && p.dispose()); disposeAll(group); },
  };
}
