// WORLD layer for pr-nemo-relay-481: the island the cutscene opens and closes on, and the violet stage (sky, arena, gods) that swells over it.
import { Group, Vector3 } from "three";
import buildIsland from "./island.js";
import buildSet from "./set.js";
import { BACK, DOCK, T, smooth, warp } from "../clock.js";

const AT = new Vector3(...DOCK);

export default function build(ctx) {
  const island = buildIsland(ctx), set = buildSet(ctx), group = new Group(), camPos = new Vector3();
  group.add(island.group, set.group);
  return {
    group,
    update(t) {
      const tt = warp(t), cam = ctx.player?.camera;
      if (cam) camPos.copy(cam.position).sub(AT);
      const sa = ctx.seal.at;
      const st = {
        camPos, off: { x: sa[0] - DOCK[0], z: sa[2] - DOCK[2] }, dpr: ctx.engine.renderer?.getPixelRatio?.() ?? 1,
        lift: smooth(2.7, 3.15, tt) * (1 - smooth(9.2, 10.0, tt)), drain: smooth(9.5, 10.9, tt),
        quake: tt > T.crack - 0.9 && tt < T.crack ? 1 : 0,
      };
      const { inside } = set.update(t, tt, st);
      island.page(inside && tt < T.reveal, t < 1.15 || t >= BACK);
    },
    dispose() { island.dispose(); set.dispose(); },
  };
}
