// WORLD layer for p-resolvent (Frieren vs Aura): the late golden-hour court. Layer 0 (the plate) until the court starts to change.
// Madhouse look (bible 2.5): painted sky and ridges (baked dome), meadow strokes, chipped ashlar with golden rim strips, spruce tufts with
// lit tips, hard violet cast plates, mist banks and god-ray bands. NOTHING stands within 3 m of the seal at the origin.
//
// CUES (read from scene.beats by name, with the bible's timings as defaults so scrubbing is a pure function of t):
//   "release"   { t, dur }  dusk: the court goes violet round the column (default 7.7, ramp 0.35 s up, holds 2.6 s, 1.2 s back)
//   "cracks"    { t, dur }  kintsugi reach 0..1 across ground, ruins and sky (default 11.4, 1.8 s)
//   "unmake"    { t, dur }  the dissolve 0..1 to the island (default 13.0, 2.4 s)
//   "butterfly" { t, dur }  the fountain butterfly crossing (default 4.6, 3.0 s)
// Anything that changes (dusk, cracks, dissolve) needs a redraw each step, so the whole world subtree flips to layer 1 while any of
// them is non-zero and flips back to layer 0 (the baked plate) when all are zero.
import { Group } from "three";
import { buildSky } from "./sky.js";
import { buildGround } from "./ground.js";
import { buildRuins } from "./ruins.js";
import { buildConifers } from "./conifers.js";
import { buildFountain } from "./fountain.js";
import { buildShadows } from "./shadows.js";
import { buildAtmosphere } from "./atmosphere.js";
import { SUN, makeU, smooth } from "./common.js";

export default function build(ctx) {
  const { engine, scene } = ctx;
  const group = new Group(), dyn = new Group(); dyn.userData.layer = 0; group.add(dyn);
  const U = makeU();
  // the key light of the whole cut: the low sun (also the shaft source for post), restored on dispose
  const prevLight = engine.shared.uLightDir.value.clone(), prevSun = engine.sun ? engine.sun.clone() : null;
  engine.shared.uLightDir.value.copy(SUN);
  engine.sun = SUN.clone().multiplyScalar(300);

  const sky = buildSky(ctx, U), ground = buildGround(ctx, U), ruins = buildRuins(ctx, U), trees = buildConifers(ctx, U), fountain = buildFountain(ctx, U);
  const shadows = buildShadows(ctx, U, [...ruins.casters, ...trees.casters]), atmo = buildAtmosphere(ctx, U);
  dyn.add(sky, ground.mesh, ruins.group, trees.mesh, fountain.group, ...shadows.meshes, ...atmo.mist, ...atmo.rays, atmo.island);

  const beat = (name, t, d) => { const b = scene.beats?.find((x) => x.name === name); return [b?.t ?? t, b?.dur ?? d]; };
  const REL = beat("release", 7.7, 0.35), CRK = beat("cracks", 11.4, 1.8), UNM = beat("unmake", 13.0, 2.4);
  const k = (t, [t0, d]) => Math.min(1, Math.max(0, (t - t0) / d));
  let layer = 0;

  return {
    group,
    update(t) {
      U.uCrack.value = k(t, CRK);
      U.uDis.value = smooth(k(t, UNM));
      U.uDim.value = 0.8 * smooth((t - REL[0]) / REL[1]) * (1 - smooth((t - (REL[0] + 2.6)) / 1.2));
      const dynamic = U.uCrack.value > 0 || U.uDis.value > 0 || U.uDim.value > 0.001;
      if ((dynamic ? 1 : 0) !== layer) { layer = dynamic ? 1 : 0; dyn.userData.layer = layer; ctx.setLayer(dyn, layer); }
      atmo.island.visible = U.uDis.value > 0;
      const haze = U.uDis.value < 0.35;
      for (const m of atmo.mist) m.visible = haze;
      for (const r of atmo.rays) r.visible = haze;
      ruins.graz.visible = fountain.sorry.visible = U.uDis.value < 0.3;
      fountain.update(t);
    },
    dispose() {
      engine.shared.uLightDir.value.copy(prevLight); engine.sun = prevSun;
      sky.material.dispose(); sky.geometry.dispose(); sky.userData.target?.dispose();
      ground.dispose(); ruins.dispose(); trees.dispose(); fountain.dispose(); shadows.dispose(); atmo.dispose();
    },
  };
}
