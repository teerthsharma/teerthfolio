// DIAVOLO-SEAL (victim): a small costumed seal, pink waist hair (14 clumps), mesh top, green eyes, coin in the right flipper.
// Beats (bible 4): walks to his mark 1.3-3.0; 3.0 snarl; coin flick 4.2; shock 5.8; barrage 10.35-11.85 (hair whips on twos); launched 11.85;
// slides in the saddle 12.1-15.4 with open-mouth dismay (terror eyes); collapses with the zero 16.6-17.0.
import { smallSeal } from "./smallseal.js";
import { DIAVOLO } from "./costumes.js";
import { MARK, CLK } from "./layout.js";
import { sm, win, lerp, T, occludes } from "./util.js";

export function buildDiavolo(ctx, F) {
  const h = smallSeal(ctx, DIAVOLO);
  h.group.rotation.order = "YXZ";
  // faces the seal: yaw = home yaw + pi (local +z of Diavolo points back toward the seal), a snarl turn toward the lens is not allowed (never cover)
  const faceYaw = F.yaw + Math.PI;
  const pulses = 7, t0 = CLK.barrage[0]; // seven MUDA pulses, the seventh is the last blow at 11.85 (easter egg 3)
  h.update2 = (t, cue) => {
    const tn = T(cue, "enter", CLK.enter), tSn = T(cue, "lineA", CLK.snarl), tCoin = T(cue, "coin", CLK.coin), tPierce = T(cue, "pierce", CLK.pierce);
    const tB0 = T(cue, "barrage", t0), tLb = T(cue, "lastBlow", CLK.lastBlow), tL1 = tLb + (CLK.launch[1] - CLK.launch[0]);
    const walk = sm(tn, tSn, t); // 1.3 -> 3.0: walks onto the mark
    let [x, , z] = [lerp(MARK.diavoloFrom[0], MARK.diavolo[0], walk), 0, lerp(MARK.diavoloFrom[2], MARK.diavolo[2], walk)];
    let y = walk < 1 && walk > 0 ? 0.018 * Math.abs(Math.sin((t - tn) * 9)) : 0; // footfalls on twos
    // launch: ballistic arc from the mark to the landing, parabola y = 4 h u (1 - u), u in [0,1] over 0.55 s
    const lu = Math.min(1, Math.max(0, (t - tLb) / (tL1 - tLb)));
    let blown = 0;
    if (t >= tLb) {
      const e = lu * lu * (3 - 2 * lu);
      const slideX = (u) => 2.0 * Math.sin(u * Math.PI * 2 / 2.3);
      const sx = t >= tLb + (tL1 - tLb) ? slideX(t - T(cue, "slide", CLK.slide[0])) : 0;
      x = lerp(MARK.diavolo[0], MARK.landing[0], e) + (t >= tL1 ? sx : 0) * sm(tL1, tL1 + 0.3, t);
      z = lerp(MARK.diavolo[2], MARK.landing[2], e);
      y = 4 * 0.9 * lu * (1 - lu);
      blown = 1 - sm(tL1 - 0.1, tL1 + 0.15, t); // lying back during the flight, upright on landing
    }
    // the loop slide: stagger and dismay
    const slide = win(t, CLK.slide[0] + 0.3, CLK.slide[1], 0.3, 0.3);
    const [wx, wy, wz] = F.w(x, y, z);
    h.group.position.set(wx, wy, wz);
    const turn = t >= tL1 ? Math.sin(t * 1.6) * 0.25 : 0; // sliding sideways he yaws a little, never away from the seal
    h.group.rotation.set(0, faceYaw + turn, 0);
    h.group.visible = t > tn - 0.05 && t < CLK.collapse[1];
    // collapse: returned to zero, scale 1 -> 0
    const z0 = 1 - sm(T(cue, "collapse", CLK.collapse[0]), CLK.collapse[1], t);
    h.group.scale.setScalar(h.scale * z0 + 1e-4);

    // reactions: one reaction at a time (react() clears the previous), then add exact extras
    const barrage = win(t, tB0, tLb, 0.1, 0.05);
    const pulseK = barrage * Math.max(0, Math.sin(((t - tB0) / ((tLb - tB0) / (pulses - 1))) * Math.PI)); // 0..1 per MUDA hit
    let kind = "terror", k = 0;
    if (t >= tPierce && t < tPierce + 0.9) { kind = "recoil"; k = 0.55 * sm(tPierce, tPierce + 0.06, t) * (1 - sm(tPierce + 0.5, tPierce + 0.9, t)); } // shock at the arrow
    if (barrage > 0) { kind = "stagger"; k = 0.5 * barrage + 0.5 * pulseK; }
    if (t >= tLb && lu < 1) { kind = "blown"; k = Math.min(1, lu * 1.1) * blown; }
    if (t >= tL1) { kind = "stagger"; k = 0.45 * slide; }
    h.react(kind, k);
    // eyes: snarl (rage) 3.0-5.8 with the coin flick; terror otherwise at the hits; open-mouth dismay in the slide
    const snarl = win(t, tSn, tPierce, 0.12, 0.1), dismay = Math.max(slide, barrage, blown);
    if (dismay > 0.01) h.expression("terror", dismay);
    else if (snarl > 0.01) h.expression("rage", snarl);
    else h.expression("smug", 0.6 * sm(tn, tSn, t) * (1 - sm(tPierce + 0.9, tPierce + 1.2, t)));
    // coin flick 4.2: leans back, right flipper up (rx tilt as an extra on the group)
    const flick = win(t, tCoin - 0.05, tCoin + 0.35, 0.08, 0.2);
    h.group.rotation.x = -0.18 * flick + (barrage ? 0.12 * pulseK : 0);
    // hair whips on twos during the barrage and the launch (the pivot sits at the head): sway = A sin(w t + phase), stepped by `t`
    const whip = Math.max(barrage, win(t, tLb, tL1 + 0.5, 0.05, 0.4));
    h.x.hairPivot.rotation.set(0.35 * whip * Math.sin(t * 38), 0, 0.5 * whip * Math.sin(t * 31 + 1) + 0.04 * Math.sin(t * 2.2));
    h.update(t);
  };
  h.occ = (eye, tgt) => h.group.visible && occludes(eye, tgt, h.group.position.toArray(), 0.8 * h.scale, 0.28 * h.scale);
  return h;
}
