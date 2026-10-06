// BUILD for p-tangle (DIRECTION agent). Imports only the framework and the three layer entry points.
// composeLayers isolates them: a layer that throws is muted and the others keep playing.
// A fourth, tiny "direction" layer rides along: it owns the pocket's background colour (the dusk drain,
// bible 6: the ramp slides from kataware-doki to night over scene.dusk.t) and the engine sun the light shafts aim at.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

// u in 0..1 across the dusk window, smoothstepped: the same clock every layer can recompute from scene.dusk
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

function direction(ctx) {
  const { THREE, scene, engine, root, palette: P } = ctx;
  const group = new THREE.Group();
  const day = new THREE.Color(P.zenith), night = new THREE.Color(P.night0), c = new THREE.Color();
  const [d0, d1] = scene.dusk.t;
  const sun = new THREE.Vector3(...scene.stage.sun);
  const prev = { bg: root.background };
  return {
    group,
    update(t) {
      // scrub-safe: pure function of t. Day-to-night colour; the title card and credit sit on the deepest blue.
      const u = smooth((t - d0) / (d1 - d0));
      c.copy(day).lerp(night, u);
      root.background = c;
      // the sun sinks with the dusk (low on the rim notch to just under the horizon line)
      if (engine) { const s = engine.sun ?? (engine.sun = new THREE.Vector3()); s.set(sun.x, sun.y - 6 * u, sun.z); }
    },
    dispose() { root.background = prev.bg ?? null; },
  };
}

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx, direction });
}
