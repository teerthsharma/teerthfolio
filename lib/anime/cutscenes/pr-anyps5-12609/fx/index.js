// FX for pr-anyps5-12609 (tier 3 add-ons on the live cast): splash rings on the flood and spray droplets at the jet ski hull, both from the kit's particle field.
import { makeParticles } from "../../../kit/fx/particles.js";

export default function build(ctx) {
  const { engine, THREE } = ctx, group = new THREE.Group();
  const rain = makeParticles(engine, { mode: "rain", splash: 1, splashSize: [0.04, 0.12], count: 360, motion: { speed: 14, slant: 0.35 }, colours: ["#d7dde1"], alpha: 0.3, fps: 12, volume: { shape: "box", size: [10, 6, 6], at: [0, 3, 0] }, blend: "normal" });
  const spray = makeParticles(engine, { mode: "burst", count: 60, kind: "disc", size: 6, sizeMode: "px", colours: ["#f2f6f6"], motion: { speed: 3, spread: 1, gravity: -6, dir: [0, 1, 0] }, life: 0.1667, once: false, loop: 0.1667, fps: 12, depth: false });
  group.add(rain.group, spray.group);
  return {
    group,
    update(ts) {
      const g = ctx.seal.group.userData, storm = ts >= 1 && ts < 5.5;
      // always visible (shrunk when off) so the particle program links at build time, never mid-play
      rain.group.visible = spray.group.visible = true;
      rain.group.scale.setScalar(ctx.atTier(3) && storm ? 1 : 1e-5); spray.group.scale.setScalar(ctx.atTier(3) && g.ski ? 1 : 1e-5);
      if (g.floor) rain.group.position.copy(g.floor);
      if (g.ski) spray.group.position.copy(g.ski);
      rain.update(ts); spray.update(ts);
    },
    dispose() { rain.dispose(); spray.dispose(); },
  };
}
