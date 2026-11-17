// BUILD for _chart, the pipeline test card: the three layers composed by the framework, each isolated.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx });
}
