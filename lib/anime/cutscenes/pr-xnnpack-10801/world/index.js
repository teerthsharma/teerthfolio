// WORLD layer for pr-xnnpack-10801: the Las Noches dimension (world/dimension.js, the live ink picture) and the real island it is laid over
// (world/island.js). Both are built in the rig frame; build.js stands this group at the dock and turns it by TURN, so the island lands on the site.
import { Group } from "three";
import { buildDimension } from "./dimension.js";
import { buildIsland, landOn } from "./island.js";
import { F, HIT, LINE, env, warp } from "../clock.js";

export default function build(ctx) {
  const group = new Group(), dim = buildDimension(ctx), island = buildIsland();
  group.add(dim.group, island.group);
  return {
    group,
    update(t, dt, cue) {
      const on = landOn(t), panel = t >= HIT.brk && t < HIT.brk + F(2); // the break's two frames are the paper/ink panel alone
      island.page(on);
      island.group.visible = on && !panel; // page() leaves the island's sky dome up; off-stage the island is out of the frame entirely
      dim.group.visible = t >= LINE.impact[0] && env(warp(t)).brk < 1.5 && !panel; // the picture stands from the impact until the glass is gone
      dim.update(t, dt, cue);
    },
    dispose() { dim.dispose(); island.dispose(); },
  };
}
