// ACTOR: a costumed seal inside two wrappers so a scene can move, tumble and flip it without touching the kit.
//   root   (world position, set by the cast)  ->  pivot (rotated about the body's centre of mass)  ->  seal.group
// The kit's react() clears every pose channel, so the cast drives pose channels directly with `pose({kneel: .5, ...})`.
import { Group } from "three";
import { L1 } from "./util.js";

const POSE_NAMES = ["recoil", "kneel", "blown", "terror", "petrified", "cower", "bow", "salute", "fallen", "stagger"];

export function actor(ctx, spec) {
  const seal = ctx.kit.costumedSeal(ctx.engine, spec);
  const root = new Group(), pivot = new Group();
  const cy = 0.4 * seal.scale; // centre of mass height, m
  pivot.position.y = cy;
  seal.group.position.set(0, -cy, 0);
  pivot.add(seal.group); root.add(pivot);
  L1(root);
  return {
    seal, root, pivot, cy,
    // world placement and facing (yaw about +y; 0 faces +z, -pi/2 faces -x)
    at(x, y, z, yaw) { root.position.set(x, y, z); if (yaw !== undefined) seal.group.rotation.y = yaw; },
    face(x, z) { seal.group.rotation.y = Math.atan2(x - root.position.x, z - root.position.z); },
    // flip about world x (rx) and z (rz) through the centre of mass
    tumble(rx, rz) { pivot.rotation.set(rx, 0, rz); },
    // pose channels: { kneel: 0.5, recoil: 0.3 }; unnamed channels are cleared
    pose(ch) { for (const n of POSE_NAMES) seal.setPose(n, ch[n] ?? 0); },
    // eye expression (kit: neutral calm terror rage sad smug petrified shut awe) and swirl pupils (tomoe pupil kind)
    expr(name, k, swirl = false) {
      seal.expression(name, k);
      for (const e of seal.eyes?.userData.eyes ?? []) e.material.uniforms.uPupilKind.value = swirl ? 3 : e.material.userData.style.pupil;
    },
    shadow(v) { if (seal.shadow) seal.shadow.visible = v; },
    show(v) { root.visible = v; },
    update(ts) { seal.update(ts); },
    dispose() { seal.dispose(); },
  };
}
