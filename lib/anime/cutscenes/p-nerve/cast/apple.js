// THE APPLE (saturated #d21f1a, 0.22 m): grows 0.4 -> 1 in the hero's right flipper from 1.9 s, taken by Ryuk's claw at take (3.25 s),
// bitten at 4.1 / 4.85 / 5.65 s (scale 0.62, 0.38, 0.2), held as a core until flick (10.4 s) when it is flung on a ballistic arc
// p(u) = p0 + v u + (0, -4.9 u^2, 0), spinning, gone 1.2 s later. World space (the cast group sits at the origin).
import { Vector3 } from "three";
import { T, sm, lerp, buildApple } from "./util.js";

const TIP = [0.3, 0.22, 0.36]; // hero right flipper tip, pup-local
export function buildAppleProp(ctx, ryuk) {
  const a = buildApple(ctx, 0.11); a.visible = false;
  const tip = new Vector3(), claw = new Vector3(), toR = new Vector3(), v = new Vector3(1.0, 2.6, 1.9), launch = new Vector3();
  return {
    root: a,
    update(t, cue) {
      const t0 = T(cue, "apple"), take = T(cue, "take"), flick = T(cue, "flick");
      a.visible = t >= t0 && t < flick + 1.2;
      if (!a.visible) return;
      ctx.seal.group.updateMatrixWorld(true); ryuk.root.updateMatrixWorld(true);
      ctx.seal.body.localToWorld(tip.set(...TIP));
      ryuk.clawPoint.getWorldPosition(claw);
      toR.copy(claw).sub(tip).setY(0).normalize();
      const out = sm(t0, t0 + 0.5, t), give = sm(take - 0.35, take, t);
      let s = lerp(0.4, 1, sm(t0, take - 0.35, t));
      a.position.copy(tip).addScaledVector(toR, 0.25 * out).lerp(claw, give);
      const bites = (t >= T(cue, "bite1") ? 1 : 0) + (t >= T(cue, "bite2") ? 1 : 0) + (t >= T(cue, "bite3") ? 1 : 0);
      s *= [1, 0.62, 0.38, 0.2][bites];
      a.rotation.set(0, 0, 0.25 * Math.sin(t * 3));
      if (t >= flick) { // the core, ballistic from the claw's rest point (a pure function of t: the wrist flick does not move the launch)
        const u = t - flick;
        ryuk.h.body.localToWorld(launch.set(0.3, 0.37, 0.63));
        a.position.set(launch.x + v.x * u, Math.max(0.03, launch.y + v.y * u - 4.9 * u * u), launch.z + v.z * u);
        if (a.position.y > 0.031) a.rotation.set(u * 9, u * 6, 0);
        s *= 1 - sm(flick + 0.9, flick + 1.2, t);
      }
      a.scale.setScalar(Math.max(0.001, s));
    },
    dispose() {},
  };
}
