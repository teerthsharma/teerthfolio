// CAST layer for p-separatrix (Golden Wind, the Colosseum finale). Layer 1, redrawn every step.
//   hero.js      the locked seal in Giorno's costume (coat, three curls, braid, brooch, anime eyes) and its expressions per beat
//   diavolo.js   the villain as a small costumed seal (pink waist hair, spots, mesh top, green eyes)
//   stands.js    King Crimson and Gold Experience Requiem as SDF cel figures
//   seals.js     the eight costume seals (3 witnesses + 5 extras)
//   props.js     the gold beetle arrow and the coin
// Cue names read (all fall back to the bible's clock, CLK in layout.js, so an unnamed beat still plays):
//   dress enter lineA(snarl 3.0) kcRise erase coin arrow pierce gerRise gild gerStep rewind kcSink barrage lastBlow slide pose claim(lineC 12.3) collapse
// The hero seal's poses come from scene.seal.track (hero.js exports HERO_TRACK). Nothing here may cover the seal: an occlusion guard hides any
// body on the lens-to-chest ray each frame (home shot looks from behind, so the stands and extras can sit between).
import { mkFrame, layer1 } from "./util.js";
import { buildHero } from "./hero.js";
import { buildDiavolo } from "./diavolo.js";
import { buildGER, buildKC } from "./stands.js";
import { buildSeals } from "./seals.js";
import { buildArrow, buildCoin } from "./props.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const F = mkFrame(ctx.scene.seal); // the home frame: x right, y up, z forward (the seal faces +z), scaled by the seal's scale
  const hero = buildHero(ctx), dia = buildDiavolo(ctx, F), kc = buildKC(ctx, F), ger = buildGER(ctx, F), seals = buildSeals(ctx, F);
  const arrow = buildArrow(ctx, F), coin = buildCoin(ctx, F, dia);
  for (const o of [dia.group, kc.group, ger.group, arrow.group, coin.group, ...seals.list.map((s) => s.group)]) group.add(o);
  layer1(group);
  const sealC = [0, 0, 0];
  return {
    group,
    update(t, dt, cue) {
      hero.update(t, cue);
      dia.update2(t, cue); kc.update(t, cue); ger.update(t, cue); seals.update(t, cue); arrow.update(t, cue); coin.update(t, cue);
      // L1 guard against the live camera (ctx.camera.out.eye) and the live seal chest
      const eye = ctx.camera?.out?.eye;
      if (eye) {
        ctx.seal.chest({ set: (x, y, z) => { sealC[0] = x; sealC[1] = y; sealC[2] = z; return sealC; } });
        for (const s of [kc, ger, dia]) if (s.occ(eye, sealC)) s.group.visible = false;
        seals.guard(eye, sealC);
      }
    },
    dispose() { hero.dispose(); dia.dispose(); kc.dispose(); ger.dispose(); seals.dispose(); arrow.dispose(); coin.dispose(); },
  };
}
