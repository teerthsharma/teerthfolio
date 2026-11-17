// FX layer for pr-nemo-relay-481: the aura, the nine orbs and their ghosts, the hits, the turn effects and the comic layer, each on its own clock.
import { Group } from "three";
import { buildAura, stutter } from "./aura.js";
import { buildGhosts, buildOrbs } from "./orbs.js";
import { buildHits } from "./hits.js";
import { buildComic } from "./comic.js";
import { BACK, DOCK, T, onTwos, smooth, warp } from "../clock.js";
import { STAND } from "../lens.js";

export default function build(ctx) {
  const group = new Group();
  const aura = buildAura(ctx), orbs = buildOrbs(ctx), ghosts = buildGhosts(ctx), hits = buildHits(ctx), comic = buildComic(ctx);
  orbs.group.position.set(...STAND); // the passes are authored about the stand's origin, the character stands at STAND
  group.add(aura.group, orbs.group, ghosts.group, hits.group);
  return {
    group,
    update(t, dt, cue) {
      const tt = warp(onTwos(t)), k = t < BACK ? 1 : 0, lit = t >= BACK ? 0 : 1 - smooth(9.2, 9.45, tt), sa = ctx.seal.at;
      aura.update(tt, lit * stutter(tt), 0.5 + 0.5 * Math.sin(t * 9), tt - (T.ignite[0] + 0.05), [sa[0] - DOCK[0], sa[2] - DOCK[2]]);
      orbs.update(tt, k);
      ghosts.update(t, tt, k);
      hits.update(t, cue);
      comic.update(t, cue);
    },
    dispose() { for (const x of [aura, orbs, ghosts, hits, comic]) x.dispose(); },
  };
}
