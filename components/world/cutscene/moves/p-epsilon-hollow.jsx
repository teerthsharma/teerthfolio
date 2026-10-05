// epsilon-hollow: the AKATSUKI HIDEOUT. Itachi's Mangekyo, abstract; not a normal dock play (issue 10 W3/W5).
//   0.7-1.5  an eye opens over the hideout's mouth (no dock pull): the lid parts, the iris fills the lens
//   1.5-2.4  three tomoe turn on their ring
//   2.4-3.0  they close into the Mangekyo pinwheel, turning
//   5.2-6.8  the lens falls through the pupil: the pupil is a hole, and inside it the seal stands in Tsukuyomi
//   6.8-26   Tsukuyomi: a red-moon field brushed in paint behind the seal, crows as flecks; the mouth speaks
//   24.6-28.5  the kill: Amaterasu climbs the frame as black fire-paint, the crows scatter; home is the mouth
// Two fullscreen fragments (moves/p-epsilon-hollow/iris.js) on the shared Stage: 2 draws above the stage's own.
// Card: lib/world/cutscene/cards/p-epsilon-hollow.js. The Tensura play left with the seal for the spawn statue.

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Mesh } from "three";
import { live } from "../../../../lib/world/store";
import { Speaker, Stage, moveAt, signAt, smooth, useCutFrame } from "../kit";
import { eyeMaterial, fieldMaterial, quad } from "./p-epsilon-hollow/iris";

function fullscreen(material, order) {
  const m = new Mesh(quad(), material);
  m.frustumCulled = false;
  m.renderOrder = order;
  m.visible = false;
  return m;
}

export default function EpsilonHollow(cut) {
  const { tl, mode } = cut;
  const size = useThree((s) => s.size);
  const k = useMemo(() => ({ eye: fullscreen(eyeMaterial(), 45), field: fullscreen(fieldMaterial(), -0.5) }), []);
  useEffect(() => () => {
    for (const m of [k.eye, k.field]) {
      m.geometry.dispose();
      m.material.dispose();
    }
  }, [k]);

  useCutFrame((t, state) => {
    const still = mode !== "full";
    const aspect = size.width / Math.max(1, size.height);
    const E = k.eye.material.uniforms;
    const F = k.field.material.uniforms;
    E.uTime.value = F.uTime.value = state.clock.elapsedTime;
    E.uAspect.value = F.uAspect.value = aspect;

    // the eye: opens on the impact, fills the lens, falls through its pupil
    const show = smooth(0.5, 0.75, t) * (1 - smooth(6.4, 6.8, t));
    E.uShow.value = show;
    E.uOpen.value = smooth(0.7, 1.5, t);
    E.uSpin.value = still ? 0.6 : 1.3 * t + 2.2 * smooth(1.5, 3.0, t);
    E.uMorph.value = smooth(2.3, 2.9, t);
    const fall = smooth(5.2, 6.6, t);
    E.uZoom.value = 1 + 40 * fall * fall;
    E.uHole.value = smooth(5.6, 6.2, t);
    // the kill: Amaterasu, then the crows break out of it
    const ama = smooth(24.6, 27.2, t) * (1 - smooth(27.8, 28.5, t));
    E.uAma.value = ama;
    E.uCrows.value = smooth(26.2, 28.4, t) * (1 - smooth(28.2, 29.0, t));
    k.eye.visible = show > 0.002 || ama > 0.002 || E.uCrows.value > 0.002;

    // Tsukuyomi behind the seal, from the moment the pupil opens until the stage goes
    F.uShow.value = smooth(5.4, 6.0, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    F.uCrows.value = smooth(8.0, 10.0, t);
    k.field.visible = F.uShow.value > 0.002;

    // the pup: the opening sign, then eyes held open in the red field
    if (still) return;
    const turn = moveAt(tl, t);
    live.pose.sign = signAt(tl, t) * (1 - turn);
    live.pose.eyes = Math.max(live.pose.eyes, turn * (1 - smooth(tl.collapse[0], tl.collapse[1], t)));
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <primitive object={k.field} />
      <primitive object={k.eye} />
    </>
  );
}
