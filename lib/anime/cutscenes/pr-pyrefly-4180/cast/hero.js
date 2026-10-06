// THE HERO as the Fourth Hokage. The locked pup is never restyled: every piece below is a CHILD of seal.body via seal.attach()
// (white haori with the red flame-trim hem, forehead protector, a five-clump yellow tuft, three kunai in the right flipper).
// The face stays fully visible: the tuft sits on the crown band (phi 0.05-0.75 rad from the top), the band on the brow line.
import { PUP_HEAD2 } from "../../../pup.js";
import { sm } from "./layout.js";

export function dressHero(ctx, parts, T, LAYOUT) {
  const { THREE: Th, engine, seal, kit, sdf } = ctx;
  const { cone, paint, polygonize } = sdf;
  // --- haori: kit coat layer (open front, sleeves over the flippers, hem skirt, high collar) + flame tongues round the hem.
  // coat trim is the skirt cone painted #d83820; the tongues are ten red cones, tip height 0.1 + 0.05 sin(2.3 i), leaning round the hem ring r = 0.41.
  const prims = kit.COSTUME_LAYERS.coat({ col: "#f4f0e6", shade: "#b8b8c8", open: 0.07, trim: "#d83820", collar: "#f4f0e6" });
  const RED = paint("#d83820", "#8a1c10", { line: 1.1 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = 0.405, h = 0.1 + 0.05 * Math.sin(2.3 * i); prims.push(cone([Math.sin(a) * r, 0.03, Math.cos(a) * r], [Math.sin(a + 0.12) * (r - 0.01), 0.03 + h, Math.cos(a + 0.12) * (r - 0.01)], 0.035, 0.004, RED, 0.01)); }
  const geo = parts.geo(polygonize(prims, 0.014));
  const haori = engine.figure(geo, { head: PUP_HEAD2, ink: "#1a1420", lineMul: 1.2, constant: true });
  seal.attach(haori, 1);
  // --- forehead protector: the kit's headband (cloth #3a4a6a, plate #c8c8d0)
  seal.attach(kit.HATS.headband(engine, { col: "#3a4a6a", trim: "#c8c8d0" }), 1);
  // --- the yellow tuft: 5 hard-edged clumps with the stepped highlight cut (#f8e060 / #c8a020 / #fff4a0)
  const tuft = kit.hairMesh(engine, kit.defineHair("spiky", { count: 5, layers: 1, band: [0.05, 0.75], length: [0.16, 0.27], width: 0.085, seed: 4180, color: { base: "#f8e060", shade: "#c8a020", hi: "#fff4a0" }, cut: { at: [0.4, 0.75], slant: 0.1, rate: 1 } }), PUP_HEAD2);
  seal.attach(tuft, 1);
  // --- three kunai in the right flipper, fanned; each hides the step it leaves the hand (the thrown copies live in the stage)
  const held = [];
  for (let i = 0; i < 3; i++) {
    const k = parts.kunai(); k.position.set(LAYOUT.hand[0] + (i - 1) * 0.02, LAYOUT.hand[1] + 0.08, LAYOUT.hand[2] + 0.02 * i);
    k.rotation.set(0.15, 0, (i - 1) * 0.42 - 0.2); k.scale.setScalar(0.9);
    seal.attach(k, 1); held.push(k);
  }
  return {
    update(ts) {
      for (let i = 0; i < 3; i++) held[i].visible = ts < T.throw[i];
      // the haori hem lifts a hair when the kunai fly (cloth follows the throw): a 2% flare of the skirt for 0.3 s after each throw
      let f = 0; for (const t of T.throw) if (ts >= t && ts < t + 0.3) f = Math.max(f, 1 - sm((ts - t) / 0.3));
      haori.scale.set(1 + 0.02 * f, 1, 1 + 0.02 * f);
    },
    dispose() {},
  };
}
