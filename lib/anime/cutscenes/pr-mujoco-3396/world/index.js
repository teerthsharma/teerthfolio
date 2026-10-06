// WORLD layer for pr-mujoco-3396 (Attack on Titan, the Rumbling, in fresco). Everything environmental:
//   sky.js       E01  baked fresco dome (peach-to-lapis, hard-cut cloud banks, spolvero rims, low sun)
//   terrain.js   E02/E03/E16  one painted ground: cobbled square, ochre plain, sea + sun path, footprints, the crack race, the blue wash
//   harbour.js   E02  quay + three cranes + piers (far cards) and the far "God" skeleton (egg 6)
//   district.js  E03  18 houses, bell tower, gate, rubble, windows; roofs jump and the bell swings on each footfall
//   wall.js      E04  the Wall: 288 skin plates falling from the crowned face, 3 carved faces, muscle core, crack glow, the 1282 cornerstone
//   rank.js      E06  the Rumbling rank: 960 impostor titans in ONE draw call
//   embers.js    E03  foreground embers
// NOT here (other layers): the five hero Wall Titans, victims, steam, tendrils, lightning, the cube block, ripple rings (cast / fx),
// and the fresco paper, giornate, flake wipe, grade (direction: scene.look + post).
// Cues read (all optional, the bible's clock is the fallback): crack, tremble, skinfall, rise, gap, footfall.
import { buildSky, sunDir } from "./sky.js";
import { buildTerrain } from "./terrain.js";
import { buildHarbour } from "./harbour.js";
import { buildDistrict } from "./district.js";
import { buildWall } from "./wall.js";
import { buildRank } from "./rank.js";
import { buildEmbers } from "./embers.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const parts = [];
  // each module is isolated: one that throws leaves the rest of the set standing
  for (const [name, fn] of [["sky", buildSky], ["terrain", buildTerrain], ["harbour", buildHarbour], ["district", buildDistrict], ["wall", buildWall], ["rank", buildRank], ["embers", buildEmbers]]) {
    try { const p = fn(ctx); group.add(p.group); parts.push({ name, p, dead: false }); }
    catch (e) { console.error(`[pr-mujoco-3396 world] ${name} failed to build:`, e); }
  }
  // the god-rays come from the low sun behind the Wall (post shafts read engine.sun as a world position)
  const [sx, sy, sz] = sunDir();
  if (ctx.engine && "sun" in ctx.engine) ctx.engine.sun = new ctx.THREE.Vector3(sx * 900, sy * 900, sz * 900);
  return {
    group,
    update(t, dt, cue) {
      for (const q of parts) {
        if (q.dead) continue;
        try { q.p.update(t, dt, cue); } catch (e) { q.dead = true; console.error(`[pr-mujoco-3396 world] ${q.name} update failed, muted:`, e); }
      }
    },
    dispose() { for (const q of parts) { try { q.p.dispose(); } catch { /* already gone */ } } },
  };
}
