// WORLD for p-aether-lang: the island the cutscene opens and returns to, and the Infinite Void with its glass floor, on the live clock (clock.js).
// Layer 0 (the plate). The island shows before the bloom and after the return; the void and its floor show from the impact to the return.
import { Group, Vector3 } from "three";
import { buildIsland } from "./island.js";
import { buildVoid } from "./void.js";
import { buildFloor } from "./floor.js";
import { buildFar } from "./far.js";
import { krackle } from "../live/world.js";
import { BACK } from "../clock.js";

const G = (n) => n / 12;
const NEAR = [[G(150), G(166)], [G(166), G(190)]]; // the two teles (lock, cry) carry krackle dots at the lens
const FWD = new Vector3();

export default function build(ctx) {
  const island = buildIsland(), void_ = buildVoid(ctx), far = buildFar(ctx), near = krackle();
  const floor = buildFloor(ctx, { exclude: void_.far });
  near.mesh.scale.setScalar(0.4);
  near.mesh.visible = false;
  const lab = island.group.children.find((o) => o.isGroup && o.position.z === -6.6);
  const group = new Group();
  group.add(island.group, far.group, void_.group, floor.group, near.mesh);
  const cam = () => ctx.player?.camera;
  const place = new Vector3();
  return {
    group,
    update(t) {
      island.update(t);
      far.update(t);
      const c = cam();
      if (!c) return;
      group.updateWorldMatrix(true, false);
      if (lab) lab.visible = !(t >= BACK && group.worldToLocal(c.position.clone()).distanceTo(lab.position) < 4.5);
      const v = void_.update(t, c) ?? { flow: 0, lock: 0, fade: 1 };
      floor.update(t, v.flow, v.lock, v.fade);
      near.mesh.visible = NEAR.some(([a, b]) => t >= a && t < b);
      if (near.mesh.visible) {
        c.getWorldDirection(FWD);
        place.copy(c.position).addScaledVector(FWD, 2.5);
        near.mesh.position.copy(group.worldToLocal(place));
        near.mesh.quaternion.copy(c.quaternion);
        near.m.uniforms.uTime.value = v.flow;
        near.m.uniforms.uBurst.value = 0.3;
        near.m.uniforms.uFade.value = v.fade;
        near.m.uniforms.uCoreL.value.copy(near.mesh.position);
      }
    },
    dispose() { island.dispose?.(); void_.dispose?.(); far.dispose(); floor.dispose?.(); near.g.dispose(); near.m.dispose(); },
  };
}
