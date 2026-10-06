// WORLD layer for pr-nemo-relay-481 (Dragon Ball Super, Ultra Instinct): the Tournament of Power stage in a dark nebula.
// Layer 0: baked nebula dome (maroon/green/violet clouds, orb world, stars), pillar, orbit ring, ledge + pudding, far rocks, the island.
// Layer 1: the 3D mosaic disc as chunks (rumbles, then breaks outside-in along tile seams at "crumble") and the rubble that rises at "ignite".
// Cues read: "ignite" (silver ignition, ~7.5 s), "crumble" (the form runs out, ~13.5 s). If a beat is absent the bible's time share is used.
// Hints for other layers (read-only): ctx.nemoSet = { ledge:{x,y,z,halfW,halfD}, pudding:[x,y,z], island:{x,y,z,r} }.
import { buildSky } from "./sky.js";
import { buildChunks, crumble } from "./mosaic.js";
import { buildSet } from "./set.js";
import { buildRubble } from "./rubble.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const sky = buildSky(ctx);
  group.add(sky);
  group.add(buildSet(ctx));

  const arena = buildChunks(ctx.engine, ctx.rng(5));
  arena.group.userData.layer = 1; // animated: redrawn every step
  group.add(arena.group);
  const rubble = buildRubble(ctx);
  group.add(rubble.group);

  const dur = ctx.scene.duration || 25.8;
  const defI = dur * (7.5 / 25.8), defC = dur * (13.5 / 25.8);
  let settled = false;

  return {
    group,
    update(t, dt, cue) {
      const sc = cue.since("crumble"), si = cue.since("ignite");
      const T0 = Number.isFinite(sc) ? cue.t - sc : defC;
      const I0 = Number.isFinite(si) ? cue.t - si : defI;
      sky.rotation.y = -0.004 * cue.t; // the slow nebula drift
      if (t < T0 - 1.05) { if (!settled) { crumble(arena.chunks, -1e3, 1e3); settled = true; } } // pristine before the rumble
      else { settled = false; crumble(arena.chunks, t, T0); }
      rubble.update(t, I0, T0);
    },
    dispose() {
      rubble.dispose();
      group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); o.userData?.target?.dispose?.(); });
    },
  };
}
