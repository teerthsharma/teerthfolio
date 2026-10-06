// WORLD layer for pr-mujoco-warp-1541 (Dragon Ball Z, Frieza on Namek): the forest is the final form. Layer 0 is static painted art,
// layer 1 the animated set pieces. Bible: scripts/pr-mujoco-warp-1541.md sections 2, 3.1-3.4, 3.11, 6 (sky, condense and forest).
//
//   sky.js      live painted Namek dome: 5 hard bands, 12 cumuli, 3 low suns, sparkle stars, violet shift, crack flash   (layer 0)
//   ground.js   turquoise sea, grass island + cliff, 16 painted rock spires, five-arm ground fissure decal           (0 / decal 1)
//   islands.js  10 baked far cards of ajisa-tree islands with white dome houses                                      (layer 0)
//   floor.js    the 484-cell coral pair floor: build wave, pulse, row slide into the diagonal, instanced hull          (layer 1)
//   forest.js   22 ajisa trees lifting off the diagonal cells, pop-in squash, sway, canopy sparkles                      (layer 1)
//
// Timeline (24 fps frames in the bible, seconds here): crack tc = f168 = 7.0 s, rows slide from tc + 0.5 s, violet shift in f96..f168,
// out f216..f270. If the direction layer names beats "crack" (or "impact"), "slide", they override the defaults, latched on first sight.
// Cue names read: crack | impact, slide | condense (all optional). Cue law "wide" thins the cell hull to 1.5 px.
// Not in this layer: the horned shell, the aura, lightning, flash, shock dome, shards and levitating rocks (cast / fx), victims and scouters (cast).
import { buildSky } from "./sky.js";
import { buildGround } from "./ground.js";
import { buildIslands } from "./islands.js";
import { buildFloor } from "./floor.js";
import { buildForest } from "./forest.js";
import { buildFrescoBorder } from "./fresco-border.js";
import { makeTimeline, sm } from "./common.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const u = (v = 0) => ({ value: v });
  // uniforms shared by the world's materials
  const U = { pow: u(), flash: u(), step: u(), sea: u(), cellOn: u(1), glow: u(), edge: u(), reveal: u(), glowC: u() };
  const tl = makeTimeline();

  const sky = buildSky(ctx, U);
  const ground = buildGround(ctx, U);
  const islands = buildIslands(ctx);
  const floor = buildFloor(ctx, U);
  const forest = buildForest(ctx);
  const border = buildFrescoBorder(ctx);
  group.add(sky.mesh, ground.group, islands.group, floor.group, forest.group, border.group);

  return {
    group,
    update(ts, dt, cue) {
      const T = tl(cue);
      // sky power curve: in f96..f168 (smoothstep), held through the crack, out f216..f270
      U.pow.value = sm(T.violetIn, T.tc, ts) * (1 - sm(T.violetOut, T.violetEnd, ts));
      U.flash.value = ts >= T.tc && ts < T.tc + 2 / 24 ? 1 : 0;                  // the sky flashes #fff3c2 for 2 frames at the crack
      U.step.value = ts;
      U.sea.value = 0.25 * Math.floor(ts * 8) / 8;                               // sea streaks slide on threes
      floor.update(ts, cue, T);                                                    // sets cellOn, glow, edge
      ground.update(ts, cue, T);
      forest.update(ts, cue, T);
      border.update(ts, cue, T);
    },
    dispose() { for (const m of [sky, ground, islands, floor, forest, border]) m.dispose(); },
  };
}
