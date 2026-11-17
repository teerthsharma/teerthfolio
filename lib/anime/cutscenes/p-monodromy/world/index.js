// WORLD layer for p-monodromy: the dock island the cutscene opens and closes on, and Sindria between the lift-off and the shatter.
// The island is a solid layer-1 object (it toggles and its balls bob), so a held shot still shows it when it returns at R.back.
import { Group } from "three";
import sindria from "./sindria.js";
import island from "./island.js";
import { R, smooth } from "../clock.js";

export default function build(ctx) {
  const group = new Group();
  const sin = sindria(ctx), isl = island(ctx);
  isl.group.userData.layer = 1;
  group.add(sin.group, isl.group);
  return {
    group,
    update(t, dt, cue) {
      sin.group.visible = t >= R.sindria && t < R.fall;
      isl.group.visible = t < R.sindria || t >= R.back - 0.001;
      sin.update(t);
      isl.update(t);
      isl.dusk(smooth(1.5, 1.9, t) * (1 - smooth(R.back, R.back + 0.1, t)));
    },
    dispose() { sin.dispose(); isl.dispose(); },
  };
}
