// WORLD for p-separatrix: the live fresco set (live/rig.js) and the island it un-paints to (island.js). Layer 0, redrawn each frame from the paced clock.
import { Group } from "three";
import { buildSet, updateSet } from "../live/rig.js";
import { layout } from "../live/geo.js";
import { buildIsland } from "./island.js";
import { TR, TURN, warp } from "../clock.js";
import { tone } from "../tone.js";

export default function build(ctx) {
  const L = layout(ctx.aspect());
  const S = buildSet(L, innerWidth, innerHeight, tone);
  const island = buildIsland();
  const group = new Group();
  group.add(S.m.rig, S.m.hud, S.m.banner.mesh, island.group);
  ctx.sharedState = { zeroPup: false };
  return {
    group,
    update(t) {
      const out = updateSet(S, { tt: warp(t), cam: ctx.player.camera, seal: { x: 0, y: 0, z: 0 } });
      island.page(t >= TURN && t < TR.island);
      ctx.sharedState.zeroPup = out.zeroPup;
    },
    dispose() { S.m.dispose(); island.dispose(); },
  };
}
