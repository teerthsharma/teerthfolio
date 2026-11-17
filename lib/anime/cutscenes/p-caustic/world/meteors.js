// THE METEORS: meteor one falls through the sky split onto the first crater; meteor two slides out of it, hangs filling the sky, then slams the second.
// Their rock and fire tail are the war's own (live/war.js). Both hidden at the break.
import { Group, Mesh, Vector3 } from "three";
import { HIT1, HIT2, meteorGeometry, meteorMaterial } from "../live/war.js";
import { smooth, T } from "../clock.js";

const UP = new Vector3(0, 1, 0), HANG = new Vector3(4, 14, -68);
const M1 = { from: new Vector3(-32, 28, -105), to: new Vector3(HIT1[0], 0, HIT1[1]), r: 4.5 };
const M2 = { from: new Vector3(40, 40, -120), to: new Vector3(HIT2[0], 0, HIT2[1]), r: 32 };
const V = new Vector3();

export function buildMeteors() {
  const geo = meteorGeometry(), mat = meteorMaterial();
  const one = new Mesh(geo, mat), two = new Mesh(geo, mat);
  one.frustumCulled = two.frustumCulled = false;
  one.scale.setScalar(M1.r); two.scale.setScalar(M2.r);
  const group = new Group();
  group.add(one, two);
  return {
    group,
    update(tt, brk, t) {
      mat.uniforms.uTime.value = t;
      one.visible = tt > T.m1[0] && tt < T.m1[1] && brk < 0;
      const f1 = Math.min(1, Math.max(0, (tt - T.m1[0]) / (T.m1[1] - T.m1[0])));
      one.position.lerpVectors(M1.from, M1.to, f1 * f1 * (0.6 + 0.4 * f1));
      one.quaternion.setFromUnitVectors(UP, V.subVectors(M1.from, M1.to).normalize());
      two.visible = tt > T.m2in && tt < T.hit2 && brk < 0;
      if (tt < T.m2hang) {
        two.position.lerpVectors(M2.from, HANG, smooth(T.m2in, T.m2hang, tt));
        two.quaternion.setFromUnitVectors(UP, V.subVectors(M2.from, HANG).normalize());
      } else {
        const a = Math.min(1, (tt - T.m2hang) / (T.hit2 - T.m2hang));
        two.position.lerpVectors(HANG, M2.to, a * a);
        two.quaternion.setFromUnitVectors(UP, V.subVectors(HANG, M2.to).normalize());
      }
    },
  };
}
