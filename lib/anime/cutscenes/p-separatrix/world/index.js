// WORLD layer for p-separatrix: the Fresco and Gold Leaf Colosseum (JoJo Part 5 finale, David Production cel laid on chalky plaster).
// Everything in this layer is plaster-erasable, so the whole set is layer 1 (redrawn each step) and shares ONE uniform block:
//   uErase 0..1   plaster erasure 3.7-5.3 (patches flake to grey plaster + sinopia sketch, the world desaturates)
//   uGild  m      gild wipe ring 6.45-7.7 (repaints everything inside the ring, gold front)
//   uZero  m      zero un-paint 15.2-16.4 (blank plaster #fbf6e8 expanding from the saddle)
// Pieces: sky.js (live dome: dusk, cosmos, clouds), colosseum.js, ground.js (saddle floor, ridge, band, outer ground), setpieces.js (pools,
// gate, beacon), rome.js (skyline cards, pines, cypress). common.js holds constants, cue ramps and the shared GLSL.
//
// CUES READ (all optional: when the direction layer defines the beat its window wins, else the bible time window is used):
//   erase (3.7 + 1.6)  gild (6.45 + 1.25)  zero (15.2 + 1.2)  cosmos (3.0 + 2.3, args dur)  gate (8.0, args open 0..1)
//   pulse (args side -1|0|1) / pulseL / pulseR (0.9 s)  beacon / tear (0.5 s)
// Time handling: FX steps are quantised (erase on threes ~13 steps, gild/zero ~on twos), cosmos dissolve is 4 frames on threes.
import { SUN, makeU, ramp, stepK } from "./common.js";
import { buildSky } from "./sky.js";
import { buildColosseum } from "./colosseum.js";
import { buildGround } from "./ground.js";
import { buildSetpieces } from "./setpieces.js";
import { buildRome } from "./rome.js";

export default function build(ctx) {
  const { THREE, engine } = ctx;
  const group = new THREE.Group();
  const U = makeU();
  const parts = [buildGround(ctx, U), buildColosseum(ctx, U), buildSetpieces(ctx, U), buildRome(ctx, U)];
  const sky = buildSky(ctx, U);
  group.add(sky.mesh);
  for (const p of parts) group.add(p.group);
  ctx.setLayer(group, 1);
  const sunPos = SUN.clone().multiplyScalar(380);
  engine.sun = sunPos;

  return {
    group,
    update(t, dt, cue) {
      const e = stepK(ramp(cue, "erase", 3.7, 5.3), 13);
      const g = stepK(ramp(cue, "gild", 6.45, 7.7), 15);
      const z = stepK(ramp(cue, "zero", 15.2, 16.4), 10);
      U.uErase.value = e;
      U.uGild.value = g > 0 ? g * 130 : -1;
      U.uZero.value = z > 0 ? z * 140 : -1;
      sky.update(cue);
      for (const p of parts) p.update(cue);
      // light shafts from the sun, only while the dusk sky shows (not in the cosmos, not after the zero)
      engine.sun = sky.mesh.material.uniforms.uCosmos.value > 0.5 || z > 0.2 ? null : sunPos;
    },
    dispose() {
      if (engine.sun === sunPos) engine.sun = null;
      sky.dispose();
      for (const p of parts) p.dispose();
    },
  };
}
