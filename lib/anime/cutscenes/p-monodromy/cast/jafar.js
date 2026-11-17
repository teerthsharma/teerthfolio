// JA'FAR for p-monodromy: the live Ja'far (live/hero.js) at the live's place (rig 2.9, 0, -2, yaw -0.85), panicking up to the strike and cowering after it.
import { Group } from "three";
import { celMat } from "../live/look.js";
import { jafar } from "../live/hero.js";
import { R, T, smooth, warp } from "../clock.js";

export default function build(ctx) {
  const mat = celMat(), ja = jafar(mat), group = new Group();
  group.position.set(2.9, 0, -2.0);
  group.rotation.y = -0.85;
  group.add(ja.root);
  return {
    group,
    update(t) {
      const tt = warp(t);
      group.visible = t >= R.sindria && t < R.back;
      ja.tick(t, smooth(T.panic[0], T.panic[1], tt) * (1 - 0.3 * smooth(T.strike + 0.5, T.strike + 1.0, tt)), smooth(T.strike, T.strike + 0.25, tt));
    },
    headWorld(out) { return ja.root.userData.head.getWorldPosition(out); },
    dispose() { ja.dispose(); ja.root.traverse((o) => o.material?.dispose?.()); group.removeFromParent(); },
  };
}
