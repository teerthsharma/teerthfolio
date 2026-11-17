// BUILD for _hero (lab only): the three layers over the articulated hero.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx });
}
