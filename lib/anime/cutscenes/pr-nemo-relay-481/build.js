// BUILD for pr-nemo-relay-481 (DIRECTION). Imports only the three layer entry points and the framework.
// Sets the dark-nebula background and the key-light direction (the luminous orb world, upper-left), then composes.
// Slow motion x0.5 on the dodges travels as the `slowmo` beat (arg rate); layers scale their own motion by it.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const { THREE, root, engine, scene } = ctx;
  try {
    root.background = new THREE.Color(scene.bg || "#0a0814"); // the pocket owns its background
    const o = scene.stage.orbWorld;
    engine.sun?.set?.(o[0], o[1], o[2]); // light shafts from the orb world
  } catch (e) { console.error("[pr-nemo-relay-481] build prelude:", e); }
  return composeLayers(ctx, { world, cast, fx });
}
