// WORLD layer for pr-mujoco-3450 (One Punch Man, Madhouse S1): the wasteland under an enormous cloud deck, and the sky the punch splits.
// Bible items: E01 sky and cloud deck (+ the split), E02 ground plain and horizon, E13 light shaft through the split, E17 motes and the
// halftone underside. Everything environmental; the hull, rays, rings, shards, victims, speed lines and impact cards are CAST and FX.
//
// The world group sits at the seal's first placement and turns with its yaw, so every number below is in the seal's own frame.
// Timing (seconds; read from scene.beats at build, else the bible's frames at 24 fps):
//   punch = beat "punch" (else "impact", else f94)
//   split = beat "split" (else punch + 4 f = f98), dur (else 25 f = f123): uSplit = ease-out cubic of (t - split.t) / dur
//   shaft = beat "shaft" (else punch + 10 f = f104), full at the split's end; holds with 1% breath
//   crack flash: for 4 drawings from the punch the crack card's tint is x(1 + 2.5 (1 - q/4)).
// Layers: ground, rubble, shadows, haze, sky dome = layer 0 (static, baked per shot); deck, cracks, shaft, motes = layer 1.
// Cues read: punch, split, shaft (all optional; the scene's beat table is the source of timing).
import { HULL, F, e3, sm, beatOf } from "./palette.js";
import { buildSky } from "./sky.js";
import { buildDeck } from "./deck.js";
import { buildGround } from "./ground.js";
import { buildShaft } from "./shaft.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const s0 = ctx.scene.seal ?? {};
  group.position.set(...(s0.at ?? [0, 0, 0])); group.rotation.y = s0.yaw ?? 0;

  const tPunch = (beatOf(ctx, "punch") ?? beatOf(ctx, "impact"))?.t ?? 94 / F;
  const bs = beatOf(ctx, "split"), tSplit = bs?.t ?? tPunch + 4 / F, dSplit = bs?.dur ?? 25 / F;
  const bh = beatOf(ctx, "shaft"), tShaft = bh?.t ?? tPunch + 10 / F, dShaft = Math.max(0.1, bh?.dur ?? (tSplit + dSplit - tShaft));

  const sky = buildSky(ctx);
  const deck = buildDeck(ctx, HULL);
  const ground = buildGround(ctx);
  const shaft = buildShaft(ctx, HULL);
  // the dome lives at infinity: it must not turn with the group's yaw in a way that matters (it is symmetric in az), so it rides the scene root
  group.add(sky.mesh, deck.mesh, ground.group, shaft.group);

  return {
    group,
    update(t) {
      const sp = e3((t - tSplit) / dSplit);
      deck.uniforms.uSplit.value = sp;
      deck.uniforms.uBoil.value = Math.floor(t * 6);        // the torn rim boils every 2 drawings
      deck.uniforms.uDrift.value.set(0.05 * t, 0.02 * t);   // 0.05 m/s on twos
      const vis = sm((t - tShaft) / dShaft);
      shaft.update(t, vis, 1 + 0.01 * Math.sin(1.7 * t), sp);
      const q = (t - tPunch) * F;                           // drawings since the punch
      const k = q >= 0 && q < 4 ? 1 - q / 4 : 0;
      ground.cracks.material.uniforms.uTint.value.setScalar(1 + 2.5 * k);
    },
    dispose() { sky.dispose(); deck.dispose(); ground.dispose(); shaft.dispose(); },
  };
}
