// WORLD layer for home (Vinland Saga, Thors: "You have no enemies"): the Igloo's fjord at dawn. Layer 0 (static art baked per shot);
// animated pieces (floes, turret, lens catch, warm pools, smoke, Vinland) set userData.layer = 1.
// Bible: scripts/home.md 3.1 sky, 3.2 mountains + cliff band, 3.3 snow shelf, 3.4 water, 3.5 ice, 3.6 jetty (+ empty twin), 3.7 longhouses,
// 3.8 igloo + telescope, 3.9 longship, 3.10 cairns (warm key), 3.16 Vinland, 3.17 smoke, 3.20 haze, 6.7 sun, 6.8 dawn grade lights.
// Not here (other layers): the orca, Thors-seal, penguins, gull (cast); flames, embers, rain, rings, the wet-wash bleed and run-off, motes (fx).
//
// FRAME (metres, fixed by the bible and shared with the other layers): the hero seal at the jetty end, origin (0, 0, 0), deck y = 0, water y = -0.55;
// the fjord runs down -z toward Vinland (z = -150); the farmstead is on the left bank (-x); the camera law rigs around the seal.
//
// CUE NAMES (all optional, each falls back to the bible's seconds):
//   vinland     12.8 s  Vinland rises out of the haze (arg dur, default 1.2 s)
//   beacons     19.0 s  the eleven beacons light one per `every` (default 0.5 s): the telescope pans, the lens catches, warm pools grow on the ground
//   scopehold   24.4 s  the telescope returns to the nearest cairn (egg 6)
//
// SHARED STATE for the other layers, read at THEIR build (world builds first): ctx.world = { H(x, z), waterY, beacons: [[x, y, z] x 11], jetty,
//   pier2, smokeAt, iglooTop, sunDir, shoreL, shoreR }. Layers never import this folder; FX should place the eleven flames on ctx.world.beacons.
import { buildSky } from "./sky.js";
import { buildTerrain, H, WATER_Y, shoreL, shoreR } from "./terrain.js";
import { buildWater } from "./water.js";
import { buildStructures, JETTY, PIER2 } from "./structures.js";
import { buildAtmosphere } from "./atmosphere.js";
import { SUN, dirOf } from "./palette.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const parts = [];
  const make = (name, fn) => { try { const p = fn(); if (p.group) group.add(p.group); else group.add(p); parts.push({ name, p, dead: false }); return p; } catch (e) { console.error(`[home/world] ${name} failed to build:`, e); return null; } };

  const sky = make("sky", () => buildSky(ctx));
  const terrain = make("terrain", () => ({ group: buildTerrain(ctx.engine), update() {}, dispose() { terrain?.group.geometry.dispose(); terrain?.group.material.dispose(); } }));
  const water = make("water", () => buildWater(ctx));
  const structures = make("structures", () => buildStructures(ctx));
  const atmos = structures ? make("atmosphere", () => buildAtmosphere(ctx, structures)) : null;

  ctx.world = {
    H, waterY: WATER_Y, shoreL, shoreR, jetty: JETTY, pier2: PIER2, sunDir: dirOf(SUN.az, SUN.el),
    beacons: structures?.spots ?? [], smokeAt: structures?.smokeAt ?? [], iglooTop: structures?.iglooTop ?? [0, 0, 0],
  };

  function update(t, dt, cue) {
    const run = (name, fn) => { const q = parts.find((x) => x.name === name); if (!q || q.dead) return; try { fn(q.p); } catch (e) { q.dead = true; console.error(`[home/world] ${name} update failed, muted:`, e); } };
    run("sky", (p) => p.update(t, cue));
    run("water", (p) => p.update(t, cue, sky?.state?.rise ?? 0));
    run("structures", (p) => p.update(t, cue));
    run("atmosphere", (p) => p.update(t, cue));
  }
  function dispose() { for (const q of parts) { try { q.p.dispose?.(); } catch (e) { console.error(e); } } }
  return { group, update, dispose };
}
