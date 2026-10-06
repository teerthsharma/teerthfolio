// L-SEAL: ~0.8 m costumed seal, hunched crouch, thumb at the lip (02-ep25-engdub-a.jpg), at (-3.55, -0.24, -2.2).
// Face: huge black pupils in a grey ring (eye decal, pupil enlarged), 3 hatched dark-circle lines #3a3a42 under each eye, small flat mouth (the painted one).
// Beats: faces the rain 0 to 4 s, then turns to the seal; flinch on each toll (recoil e^-8 s); flare 9.95 the thumb leaves the lip and the eyes go wide; lineC 17.6 onward watches.
// Cuff on the left wrist (steel band #c9cdd1 / #565c64) carries the chain (chain.js).
import { SphereGeometry, TorusGeometry, PlaneGeometry } from "three";
import { lSpec } from "./costumes.js";
import { T, sm, lerp, decay, sinceToll, figProp, mesh } from "./util.js";

export const L_AT = [-3.55, -0.24, -2.2];
const HEAD = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] };
export const L_CUFF = [-0.3, 0.2, 0.26]; // pup-local, the left wrist

export function buildL(ctx) {
  const { kit } = ctx;
  const h = kit.costumedSeal(ctx.engine, lSpec(kit));
  h.place(...L_AT, 0.9);
  const body = h.body;
  // huge pupils: enlarge the pupil of this material's own style copy (the shared EYE_STYLES are never edited)
  for (const e of h.eyes?.userData.eyes ?? []) { e.material.userData.style = { ...e.material.userData.style, pupilScale: 0.86 }; e.material.uniforms.uPupilS.value = 0.86; }
  // hatched under-eye rings: 3 thin lines each, #3a3a42, laid on the head surface
  for (const s of [1, -1]) for (let j = 0; j < 3; j++) {
    const f = kit.faceOnHead(HEAD, s * (0.122 + (j - 1) * 0.02), 0.572 - 0.052 - j * 0.011, 0.004);
    const m = mesh(new PlaneGeometry(0.058 - j * 0.008, 0.0045), "#3a3a42", { side: 2 });
    m.position.copy(f.p); m.lookAt(f.p.clone().add(f.n)); m.rotateZ(s * (0.18 - j * 0.1)); body.add(m);
  }
  // thumb at the lip (fur #ecebe7, shade by the ink hull)
  const thumb = figProp(ctx, new SphereGeometry(0.03, 10, 8), "#ecebe7", "#9ea39a", { pos: [0.035, 0.452, 0.28], scl: [0.8, 1.3, 0.9], lineMul: 0.6 });
  body.add(thumb);
  // the cuff
  const cuff = figProp(ctx, new TorusGeometry(0.052, 0.015, 7, 16), "#c9cdd1", "#565c64", { pos: L_CUFF, rot: [0.2, 1.1, 0.3], lineMul: 0.6 });
  body.add(cuff);
  h.cuff = cuff;
  return {
    h, root: h.group,
    update(t, cue) {
      const flare = T(cue, "flare"), lineC = T(cue, "lineC");
      const st = sinceToll(cue, t), fl = decay(st, 8);
      // yaw: faces the rain (+x, out over the deck edge) until 4 s, then turns to the seal
      const toSeal = Math.atan2(ctx.seal.at[0] - L_AT[0], ctx.seal.at[2] - L_AT[2]);
      h.group.rotation.y = lerp(toSeal - 0.9, toSeal, sm(3.4, 4.4, t));
      // hunched crouch (kneel 0.3 + a forward cower lean) and the flinch on each DONG
      h.setPose("kneel", 0.3); h.setPose("cower", 0.22); h.setPose("recoil", 0.7 * fl);
      const wide = sm(flare, flare + 0.3, t) * (1 - sm(lineC + 4, lineC + 5, t) * 0.4);
      h.expression(wide > 0.05 || fl > 0.1 ? "terror" : "neutral", Math.max(wide, fl));
      // thumb at the lip until the flare, then it drops to the knee
      const away = sm(flare, flare + 0.25, t);
      thumb.position.set(lerp(0.035, 0.2, away), lerp(0.452, 0.22, away), lerp(0.28, 0.3, away));
      h.update(t);
    },
    dispose() { h.dispose(); },
  };
}
