// CAST for _hero: the hero seal itself is placed by the framework from scene.seal.hero (the look picked in scene.js);
// its form change rides the seal track. With `&second=<look id>` a second full hero is built here, the documented way:
// castHero() from the seal framework, its own look, place, scale and track, updated on the layer's stepped time.
import { castHero } from "../../framework/seal.js";
import { second } from "../scene.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  ctx.scene.seal.hero.extras?.(ctx.engine, ctx.seal.hero);
  const other = second ? castHero(ctx.engine, second.look, second) : null;
  if (other) group.add(other.group);
  return { group, update(ts) { other?.update(ts); }, dispose() { other?.dispose(); } };
}
