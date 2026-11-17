// WORLD layer for the-loop: the Triton shore (shown at B0 and B9 only) and the three painted skies with the fissure floor (layer 0).
import { Group } from "three";
import { buildIsland } from "./island.js";
import { buildStage } from "./stage.js";
import { T } from "../clock.js";

export default function build(ctx) {
  const group = new Group(), island = buildIsland(ctx), stage = buildStage(ctx);
  group.add(island.group, stage.group);
  return {
    group,
    update(t, dt, cue) {
      const shore = t < T.impactA || t >= T.cut;
      island.set(shore, shore && (t < T.impactA || t >= T.back));
      stage.update(t, dt, cue);
    },
    dispose() { island.dispose(); stage.dispose(); },
  };
}
