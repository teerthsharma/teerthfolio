// FX for pr-highway-3244: the slice, the trail and the bolts, the smoke, confetti and the chequered page, the in-world word, the war-cry and fling marks, the turn-back star, and the comic print.
import { Group } from "three";
import buildLightning from "./lightning.js";
import buildPools from "./pools.js";
import buildLettering from "./lettering.js";
import buildHits from "./hits.js";
import buildPoof from "./poof.js";
import buildComic from "./comic.js";

export default function build(ctx) {
  const parts = [buildLightning(ctx), buildPools(ctx), buildLettering(ctx), buildHits(ctx), buildPoof(ctx)];
  const comic = buildComic(ctx);
  const group = new Group();
  for (const p of parts) group.add(p.group);
  return {
    group,
    update(t, dt, cue) {
      const cam = ctx.player?.camera;
      parts[0].update(t, cam);
      parts[1].update(t, cam);
      parts[2].update(t, cam);
      parts[3].update(t);
      parts[4].update(t, cue);
      comic.update(t, cue);
    },
    dispose() {
      for (const p of parts) p.dispose?.();
      comic.dispose?.();
    },
  };
}
