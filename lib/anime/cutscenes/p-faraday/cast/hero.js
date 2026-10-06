// HERO SEAL extras (the locked pup is never edited): the cream Tokiwadai vest and Misaka's arcade coin, both riding ctx.seal.attach.
// Vest: cloth shell lifted from a costumed seal (the kit's uniform layer), pops f13-26 (0.54-1.08 s): scale 0 -> 1.15 -> 1 about the chest.
// Coin: radius 0.17 m, 0.045 thick, ridged edge (24 flat facets = 24 ridges) #ff9b1a, face #ffc34a, stamp #7a3a00, one specular dot #fff8e0.
//   toss f154-163 (6.4-6.8 s): 7 half-turns on twos, rises 0.45 m and comes back; flick f163 (6.8 s): one smear frame (x2.2 stretch), gone into the streak;
//   returns at the credit (16.7 s) held up between the flipper tips, facing the lens.
import { CircleGeometry, CylinderGeometry, DoubleSide, Group, SphereGeometry } from "three";
import { VEST } from "./costumes.js";
import { T, mesh, figProp, pivoted, sm, lerp, L1, clamp01 } from "./util.js";

// right flipper tip in the pup frame (grip r = 0.27, 0.28, 0.25, pushed out to the fingertip), and the held-up spot between the tips
const TIP = [0.3, 0.22, 0.36], HELD = [0.0, 0.3, 0.4];

export function buildHero(ctx) {
  const seal = ctx.seal;
  // ---- the vest
  const donor = ctx.kit.costumedSeal(ctx.engine, VEST);
  let vest = null;
  if (donor.shell) {
    donor.body.remove(donor.shell);
    donor.shell.position.set(0, 0, 0);
    vest = pivoted(donor.shell, [0, 0.3, 0]);
    // crest #c8342a on the chest (the seal's left, pup +x... the wearer's crest sits at the viewer's right of a front shot)
    const crest = figProp(ctx, new SphereGeometry(0.03, 12, 8), "#c8342a", "#7a1810", { pos: [-0.17, 0.3 + 0.0, 0.29], scl: [1, 1, 0.45] });
    vest.add(crest);
    seal.attach(vest, 1);
    L1(vest);
    vest.scale.setScalar(0.001);
  }
  // ---- the coin
  const coin = new Group();
  const R = 0.17, TH = 0.045;
  const edge = figProp(ctx, new CylinderGeometry(R, R, TH, 24, 1).rotateX(Math.PI / 2), "#ff9b1a", "#b8600a", { lineMul: 0.7 });
  const face = figProp(ctx, new CylinderGeometry(R * 0.86, R * 0.86, TH + 0.012, 24).rotateX(Math.PI / 2), "#ffc34a", "#e08c20", { lineMul: 0.5 });
  const dot = mesh(new CircleGeometry(0.02, 12), "#fff8e0", { side: DoubleSide }); dot.position.set(-0.07, 0.07, TH / 2 + 0.008);
  // tiny seal stamp on the face: head disc, two flipper nubs, in #7a3a00
  const stamp = new Group(); stamp.position.z = TH / 2 + 0.007;
  const sb = mesh(new CircleGeometry(0.05, 14), "#7a3a00", { side: DoubleSide }); sb.scale.set(1, 0.8, 1); sb.position.y = -0.02;
  const sh = mesh(new CircleGeometry(0.033, 12), "#7a3a00", { side: DoubleSide }); sh.position.y = 0.04;
  const se = mesh(new CircleGeometry(0.008, 6), "#ffc34a", { side: DoubleSide }); se.position.set(-0.013, 0.05, 0.002);
  const se2 = se.clone(); se2.position.x = 0.013;
  stamp.add(sb, sh, se, se2);
  const back = stamp.clone(); back.position.z = -(TH / 2 + 0.007); back.rotation.y = Math.PI;
  coin.add(edge, face, dot, stamp, back);
  coin.visible = false;
  seal.attach(coin, 1); L1(coin);

  return {
    update(t, cue) {
      const tSign = T(cue, "sign", 0.45), tCoin = T(cue, "coin", 6.4), tShot = T(cue, "shot", 6.8), tCredit = T(cue, "credit", 16.7);
      // vest pop: 0 -> 1.15 over 6 frames (0.25 s) from 0.54 s, settles to 1 by 1.08 s; an ease-out-back
      if (vest) {
        const p = clamp01((t - (tSign + 0.09)) / 0.54);
        const back = p <= 0 ? 0 : p < 0.45 ? lerp(0, 1.15, p / 0.45) : lerp(1.15, 1.0, sm(0.45, 1, p));
        vest.scale.setScalar(Math.max(0.001, back));
        vest.visible = p > 0;
      }
      // coin
      let vis = false, pos = TIP, rot = 0, stretch = 1, sc = 1;
      if (t >= tCoin && t < tShot) { // on the tip, then tossed: 7 half-turns on twos, 0.45 m up and back
        const k = (t - tCoin) / (tShot - tCoin);
        vis = true; pos = [TIP[0], TIP[1] + 0.45 * Math.sin(Math.PI * k) * (k > 0.08 ? 1 : 0), TIP[2]];
        rot = Math.PI * 7 * k; // spin about the x axis (the coin's face turns toward and away from the lens)
      } else if (t >= tShot && t < tShot + 0.16) { // the flick: a smear frame, then it is the streak (the FX layer owns the streak)
        vis = t < tShot + 0.06; pos = [TIP[0], TIP[1], TIP[2]]; stretch = 2.2; rot = Math.PI * 7;
      } else if (t >= tCredit) { // held up between the flipper tips, pop in, then a slow gold turn on twos
        const k = clamp01((t - tCredit) / 0.35);
        vis = true; sc = 0.7 * (k < 1 ? 1.2 - 0.2 * sm(0, 1, k) : 1);
        pos = [lerp(TIP[0], HELD[0], sm(0, 0.6, t - tCredit)), lerp(TIP[1], HELD[1], sm(0, 0.6, t - tCredit)), lerp(TIP[2], HELD[2], sm(0, 0.6, t - tCredit))];
        rot = 0.12 * Math.sin((t - tCredit) * 1.4);
      }
      coin.visible = vis;
      if (vis) {
        coin.position.set(pos[0], pos[1], pos[2]);
        // the coin's axis is its local z; lying on the thumb it faces up (rotate -90 deg about x), held up it faces the lens (0)
        const lying = t < tShot + 0.2 ? 1 : 0;
        coin.rotation.set(lying ? -Math.PI / 2 + rot : rot * 0, lying ? 0 : rot, 0);
        coin.scale.set(sc * (stretch), sc, sc);
      }
    },
    dispose() { donor.dispose(); },
  };
}
