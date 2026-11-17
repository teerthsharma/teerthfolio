// The war-cry lettering of pr-highway-3244: AAALALALALAI! 9 m in front of the lens for 1.15 race seconds from the cry, popped, lower half of the frame, lens-facing in the rig frame.
import { Group, Quaternion, Vector3 } from "three";
import { DOCK, TURN, rotY, warp } from "../clock.js";
import { T } from "../live/path.js";
import { lettering } from "../live/parts.js";

const UP = new Vector3(0, 1, 0), F = new Vector3(), U = new Vector3();

export default function buildLettering(ctx) {
  const group = new Group(), boom = lettering("AAALALALALAI!", "#ffc926", -0.1), QL = new Quaternion();
  group.add(boom);
  return {
    group,
    update(tc, cam) {
      const t = warp(tc), back = t >= T.swap, kb = t - T.cry;
      boom.visible = kb > -0.05 && kb < 1.1 && !back;
      if (!boom.visible) return;
      const pop = Math.min(1, (kb + 0.05) / 0.1) * (1 + 0.22 * Math.max(0, 1 - (kb + 0.05) / 0.25)), w = 7.0 * pop;
      const p = cam.position, q = rotY(-TURN, [p.x - DOCK[0], p.y - DOCK[1], p.z - DOCK[2]]);
      cam.getWorldDirection(F);
      U.set(0, 1, 0).applyQuaternion(cam.quaternion);
      const fr = rotY(-TURN, [F.x, F.y, F.z]), up = rotY(-TURN, [U.x, U.y, U.z]);
      boom.position.set(q[0] + 9 * fr[0] - 1.6 * up[0], q[1] + 9 * fr[1] - 1.6 * up[1], q[2] + 9 * fr[2] - 1.6 * up[2]);
      boom.scale.set(w, w, 1);
      boom.quaternion.copy(QL.setFromAxisAngle(UP, -TURN).multiply(cam.quaternion));
    },
    dispose() {
      boom.material.map?.dispose();
      boom.material.dispose();
      boom.geometry.dispose();
    },
  };
}
