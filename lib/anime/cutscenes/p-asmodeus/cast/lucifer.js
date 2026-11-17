// LUCIFER for p-asmodeus: the guest, a costumed seal in a violet coat with his wings (wings.js), pinned to the layout's foe row and facing the lens.
import { Vector3 } from "three";
import { depthFor, pin, shotAt } from "../cams.js";
import { kOf } from "../clock.js";
import { makeWings } from "./wings.js";

export function makeLucifer(ctx) {
  const costume = ctx.kit.defineCostume("extra", {
    layers: [{ type: "coat", col: "#2c2140", shade: "#120a22", trim: "#b8913c", open: 0.05 }],
    hair: ctx.kit.defineHair("bob", { color: { base: "#2a2038", shade: "#120c1c", hi: "#6a5a8a" } }),
  });
  const v = ctx.kit.costumedSeal(ctx.engine, { ...costume, scale: 0.55 });
  const wings = makeWings(ctx);
  v.group.add(wings.group);
  const at = new Vector3();
  return {
    group: v.group,
    update(t, dt, row) {
      const on = t >= 7 && kOf(t) < 11 && !!row?.foe;
      v.group.visible = on;
      if (!on) return;
      const s = shotAt(t), A = ctx.aspect(), f = row.foe;
      pin(s, t, A, f.u, f.v, depthFor(s, t, A, 0.85, f.hh), at);
      v.place(at.x, at.y, at.z, Math.atan2(s.eye[0], s.eye[2]));
      const k = kOf(t);
      wings.open(k < 9);
      if (k >= 9) v.react("blown", Math.min(1, 0.5 + 0.5 * (k - 9)));
      else if (k >= 4) v.react("terror", Math.min(1, 0.5 + 0.25 * (k - 4)));
      else v.expression("smug", 1);
      v.update(t, dt);
    },
    dispose() { wings.dispose(); v.dispose(); },
  };
}
