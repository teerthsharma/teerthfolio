// BUILD for home (DIRECTION agent). Composes world / cast / fx and drives the timeline-level things no layer owns:
//   - the dawn sun for the light shafts (8 degrees up, left of the fjord mouth, bible 3.1)
//   - the hero's plop squash: x,z scale 1 + .12 e, y scale 1 - .20 e, e = exp(-5 s) cos(16 s), s = since("plop")
//     (bible 3.13), a pure function of the clock, so scrubbing equals playing.
// Cue names live in scene.js (the single source of truth). Layers never import each other; they read `cue`.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const { THREE, engine, seal } = ctx;
  const out = composeLayers(ctx, { world, cast, fx });

  // direction toward the sun: 8 deg up, left of the fjord mouth, toward -z (Vinland side)
  try { engine.sun = new THREE.Vector3(-0.55, Math.sin((8 * Math.PI) / 180), -0.82).normalize(); } catch (e) { /* optional */ }

  const inner = out.update;
  const base = seal.group.scale.clone();
  out.update = (t, dt, cue) => {
    inner?.(t, dt, cue);
    try {
      const s = cue.since("plop");
      if (s >= 0 && s < 1.4) {
        const e = Math.exp(-5 * s) * Math.cos(16 * s);
        seal.group.scale.set(base.x * (1 + 0.12 * e), base.y * (1 - 0.2 * e), base.z * (1 + 0.12 * e));
      } else seal.group.scale.copy(base);
    } catch (e) { /* squash is garnish; never break playback */ }
  };
  return out;
}
