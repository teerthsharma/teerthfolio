// WORLD layer for pr-triton-kernels-22 (Jujutsu Kaisen, Sukuna: Malevolent Shrine; PROTECTED look). One-shot from the bible.
//
//   sky.js      veined-smoke sky (baked) + live drift / bleed / drain dome       ink-smoke-tendril-sky
//   shrine.js   the shrine, mound (17 skulls, 804 bones), jaws, and its mirror    shrine-horn-crown, mirror-water-plane
//   ground.js   island, road, kerbs, zebra, lake embankment, the pool
//   city.js     Shibuya: facades with window cards, Dismantle cuts, lamps, signs, cars, tower, canopy, halo
//   ice.js      the 55-block causal triangle: rise, Cleave, glow, pulse
//   skyline.js  far skyline cards (layer 0)
//   cues.js     beat names and their bible-clock fallbacks (draw bleed rise jaw slash cleave close dissolve drain rub pulse halo)
//
// Layers: the island and skyline cards are static art (layer 0, baked per shot). Everything that moves is under `dyn` (layer 1).
// The palette is the protected ink one (black, paper #ece5d2, one blood red); the teal mirror hall is NOT built (INDEX decision 6
// default: keep the protected palette). Seal-relative frame: the seal starts at scene.seal.at facing +z; the shrine stands behind
// it at z = -78; the ice triangle at scene.triangle.at (default [-7.5, 8.5]) faces the seal.
import { Group, Vector2 } from "three";
import { makeCues } from "./cues.js";
import { buildSky } from "./sky.js";
import { buildShrine, SHRINE_Z } from "./shrine.js";
import { buildGround } from "./ground.js";
import { buildCity } from "./city.js";
import { buildIce } from "./ice.js";
import { buildSkyline } from "./skyline.js";
import { create as buildInkHatch } from "./ink-hatch.js";
import { create as buildJaws } from "./shrine-jaws.js";

export default function build(ctx) {
  const T = makeCues(ctx.scene);
  const C0 = ctx.scene.seal?.at ?? [0, 0, 0];
  const U = { drawR: { value: 0 }, rubR: { value: 1e5 }, C: { value: new Vector2(C0[0], C0[2]) } };
  const group = new Group(), dyn = new Group();
  dyn.userData.layer = 1; group.add(dyn);

  const parts = [];
  const sky = buildSky(ctx, T); dyn.add(sky.object); parts.push(sky);
  const ground = buildGround(ctx, T, U);
  for (const m of ground.static) group.add(m);
  for (const m of ground.dynamic) dyn.add(m);
  parts.push(ground);
  const shrine = buildShrine(ctx, T); dyn.add(shrine.object); parts.push(shrine);
  const hatch = buildInkHatch(ctx); dyn.add(hatch.group);
  const jaws = buildJaws(ctx); dyn.add(jaws.group);
  const city = buildCity(ctx, T, U); dyn.add(city.object); parts.push(city);
  const ice = buildIce(ctx, T); dyn.add(ice.object); parts.push(ice);
  const skyline = buildSkyline(ctx); group.add(skyline.object); parts.push(skyline);

  const shrineDist = Math.hypot(C0[0], SHRINE_Z - C0[2]);
  return {
    group,
    update(t) {
      ground.update(t);                         // sets the wipe radii first
      sky.update(t);
      shrine.update(t, shrineDist, U.rubR.value);
      const open = t >= T.rise + 0.2 ? 0.28 : 0;
      hatch.update(t, open); jaws.update(t, open);
      city.update(t);
      ice.update(t);
    },
    dispose() { hatch.dispose(); jaws.dispose(); for (const p of parts) p.dispose?.(); },
  };
}
