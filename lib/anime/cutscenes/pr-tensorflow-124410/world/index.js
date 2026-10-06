// WORLD layer for pr-tensorflow-124410 (JoJo Part 3, DIO: MUDA): Araki's psychedelic dimension, drawn flat.
// Layer 0 (static art, baked per shot): the bullseye dusk sky (sky.js), the faceted valley (terrain.js), the far ridge cards
// (mountains.js), the dam, valve tower, pylons, lamps, abutments and DIO's road roller (dam.js), and the island for shots 7-8
// (island.js). Layer 1 (redrawn each step): the reservoir with its rings (water.js), the control-edge gantry whose coral edge
// trembles, cracks into three, hangs through the stopped second and falls and drowns (gantry.js), the giant clock (clock.js)
// and DIO's banana (props.js). Everything colours from ONE set of shared uniforms (palette.js): the per-beat psychedelic swap
// is a hard cut on twos. The full-frame inversion of the time stop is the FX layer's: the world holds its pre-stop palette
// through it and freezes its own clock (water drift, bob) while t is inside [timestop, resume).
// Coordinates and the set's contract with the cast layer are in layout.js. Cues (scene.beats names, all optional, each with
// the bible's time as the default): timestop, resume, muda, crack, drown, tear, clock, palette { pal }.
import { Group } from "three";
import { L, hash1, timeline, worldT } from "./layout.js";
import { makeUniforms, palAt, setPalette } from "./palette.js";
import { disposeTree } from "./geo.js";
import { buildSky } from "./sky.js";
import { buildTerrain } from "./terrain.js";
import { buildMountains } from "./mountains.js";
import { buildDam } from "./dam.js";
import { buildIsland } from "./island.js";
import { buildWater } from "./water.js";
import { buildGantry } from "./gantry.js";
import { buildClock } from "./clock.js";
import { buildBanana } from "./props.js";
import { create as buildArakiSet } from "./araki-set-shader.js";

export default function build(ctx) {
  const { engine } = ctx;
  const T = timeline(ctx.scene);
  const U = makeUniforms(engine, L);
  let palName = "";
  const group = new Group(); group.name = "pr-tensorflow-world";
  const at = ctx.scene.seal?.at ?? [0, 0, 0];
  group.position.set(at[0], at[1], at[2]);

  // layer 0: always
  const sky = buildSky(U);
  // layer 0: the dam world
  const damWorld = new Group();
  const terrain = buildTerrain(U), ridgesDam = buildMountains(ctx, 0), shake = new Group();
  const dam = buildDam(U);
  const araki = buildArakiSet(ctx, U);
  shake.add(dam); damWorld.add(terrain, ridgesDam, shake, araki.group);
  // layer 0: the island world
  const islandWorld = new Group();
  const island = buildIsland(U), ridgesIsland = buildMountains(ctx, 1);
  islandWorld.add(island, ridgesIsland);
  // layer 1: the live set pieces
  const live = new Group();
  const water = buildWater(U), gantry = buildGantry(U, T), clock = buildClock(), banana = buildBanana(U, T);
  live.add(water, gantry.group, clock, banana);

  group.add(sky, damWorld, islandWorld, live);
  ctx.setLayer(sky, 0); ctx.setLayer(damWorld, 0); ctx.setLayer(islandWorld, 0); ctx.setLayer(live, 1);

  // compile every program now (the F3 law): everything is visible here, one compile, then update() hides what frame 0 does not need
  clock.visible = true; banana.visible = true;
  try { ctx.root.add(group); engine.renderer.compile(ctx.root, ctx.player.camera); } catch (e) { console.warn("[pr-tensorflow world] precompile skipped", e); }

  const events = [...gantry.events].sort((a, b) => a.t - b.t);
  function update(t) {
    const wt = worldT(t, T), isl = t >= T.tear;
    // the palette: a hard cut at the beat (the step input is already on twos)
    const n = palAt(t, T.palettes);
    if (n !== palName) { palName = n; setPalette(U, n); }
    damWorld.visible = !isl; islandWorld.visible = isl; water.visible = !isl; gantry.group.visible = !isl;
    // the dam judders on twos in the barrage (muda .. +1.5 s) and the drowning, and holds still inside the stopped second
    const still = t >= T.stop && t < T.resume;
    const amp = still ? 0 : (t >= T.muda && t < T.muda + 1.5) || (t >= T.resume + 0.3 && t < T.resume + 1.5) ? 0.1 : 0;
    const st = Math.floor(t * 12);
    shake.position.set((hash1(st * 1.3) - 0.5) * 2 * amp, (hash1(st * 2.1 + 3) - 0.5) * 2 * amp, 0);
    water.userData.set(t, wt, events);
    gantry.update(t);
    clock.userData.set(t, T, wt);
    banana.userData.set(t, wt);
  }
  update(0);

  return {
    group, update,
    dispose() {
      gantry.dispose(); araki.dispose();
      disposeTree(group);
    },
  };
}
