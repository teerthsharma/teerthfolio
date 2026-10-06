// THE EIGHT COSTUME SEALS (bible 4 + shot 9): Polnareff (turtle, key), Mista (black ridged hat, revolver low), Trish (pink bob, hand to mouth) are the
// witnesses on the tiers from the start; Bucciarati, Abbacchio, Fugo, Narancia and Risotto pop in at 12.1 and all eight strike poses until the zero.
// Reactions (on twos, `t` is the stepped clock): recoil 2 frames at the erase 3.7, terror at the pierce 5.8, awe at the gild 6.45, tremble under the
// barrage, arms up at the claim 12.3 (hop), the strike pose 12.1-15.4, returned to zero 16.6-17.0.
import { smallSeal } from "./smallseal.js";
import { SEALS, SEAL_ORDER } from "./costumes.js";
import { MARK, CLK } from "./layout.js";
import { sm, win, pop, T, occludes } from "./util.js";

// strike pose per seal: [pitch back (rad), yaw off the centre (rad), roll lean (rad)]
const LEAN = { polnareff: [-0.2, 0.3, 0.16], mista: [-0.12, -0.3, -0.18], trish: [0.1, -0.2, 0.2] };

export function buildSeals(ctx, F) {
  const list = SEAL_ORDER.map((id, i) => {
    const h = smallSeal(ctx, SEALS[id]);
    h.group.rotation.order = "YXZ";
    const m = MARK[id], face = F.yaw + Math.atan2(0 - m[0], 2.4 - m[2]);
    h.id = id; h.i = i; h.mark = m; h.face = face; h.lean = SEALS[id].lean ?? LEAN[id];
    h.witness = i < 3;
    h.occ = (eye, tgt) => h.group.visible && occludes(eye, tgt, h.group.position.toArray(), 0.8 * h.scale, 0.26 * h.scale);
    return h;
  });
  const update = (t, cue) => {
    const tE = T(cue, "erase", CLK.erase[0]), tPi = T(cue, "pierce", CLK.pierce), tG = T(cue, "gild", CLK.gild), tB0 = T(cue, "barrage", CLK.barrage[0]), tLb = T(cue, "lastBlow", CLK.lastBlow);
    const tC = T(cue, "claim", CLK.claim), tP = T(cue, "pose", CLK.pose), tZ = T(cue, "collapse", CLK.collapse[0]);
    for (const h of list) {
      const j = Math.max(0, h.i - 3), tIn = h.witness ? 1.0 : tP + 0.12 * j; // witnesses stand from 1.0; extras pop in from 12.1, 0.12 s apart
      const sc = (h.witness ? pop(t, tIn, tIn + 0.3, 1.15) : pop(t, tIn, tIn + 0.35, 1.22)) * (1 - sm(tZ, CLK.collapse[1], t));
      h.group.visible = sc > 0.001 && t < CLK.collapse[1];
      h.group.scale.setScalar(h.scale * Math.max(sc, 1e-4));
      // the strike pose: eases in over 0.35 s from the pose beat (witnesses from 12.1 too; the extras come in already posing)
      const strike = sm(tP + 0.12 * h.i * 0.5, tP + 0.5 + 0.12 * h.i * 0.5, t);
      const hop = t >= tC && t < tC + 1.1 ? 0.14 * Math.abs(Math.sin(((t - tC) / 0.55) * Math.PI)) * (1 - sm(tC + 0.7, tC + 1.1, t)) : 0; // arms-up hop, twice
      const [wx, wy, wz] = F.w(h.mark[0], hop + 0.005 * Math.sin(t * 3 + h.i), h.mark[2]);
      h.group.position.set(wx, wy, wz);
      h.group.rotation.set(h.lean[0] * 0.5 * strike, h.face + h.lean[1] * strike, h.lean[2] * strike);
      // reaction primary
      let kind = "terror", k = 0;
      const rec = sm(tE, tE + 0.084, t) * (1 - 0.65 * sm(tE + 0.2, tE + 0.8, t)) * (t < tPi ? 1 : 0);
      if (t >= tE && t < tPi) { kind = "recoil"; k = rec; }
      if (t >= tPi && t < tG) { kind = "terror"; k = 0.45 * (1 - sm(tG - 0.2, tG, t)); }
      if (t >= tB0 && t <= tLb + 0.1) { kind = "terror"; k = 0.5 * win(t, tB0, tLb + 0.1, 0.1, 0.1); }
      h.react(kind, k);
      // expression + the extra arms-up pose
      const awe = Math.max(win(t, tG, CLK.rewind, 0.15, 0.4), 0.7 * win(t, tB0, tLb + 0.4, 0.1, 0.3), win(t, tC, tC + 1.4, 0.1, 0.5), 0.9 * strike);
      if (awe > 0.01) h.expression("awe", awe);
      h.setPose("salute", Math.max(0.6 * win(t, tG, CLK.rewind, 0.2, 0.4), win(t, tC, tC + 1.4, 0.1, 0.5), 0.8 * strike));
      // witnesses react to the claim line too; Trish's hand to the mouth during recoil and awe; the key glints on twos
      if (h.x.hand) h.x.hand.visible = (t >= tE && t < tE + 1.5) || (t >= tG && t < tG + 1.1);
      if (h.x.glint) h.x.glint.visible = Math.floor(t * 12) % 9 === 0 || (t >= tC && t < tC + 0.6 && Math.floor(t * 12) % 2 === 0);
      if (h.x.hairPivot) h.x.hairPivot.rotation.z = 0.05 * Math.sin(t * 3.1 + h.i) + 0.12 * win(t, tE, tE + 0.5, 0.04, 0.3) * Math.sin(t * 40); // hair sways, flutters at the erase
      if (h.group.visible) h.update(t);
    }
  };
  // L1: hide any body that sits on the lens-to-seal ray this frame
  const guard = (eye, tgt) => { for (const h of list) if (h.group.visible && h.occ(eye, tgt)) h.group.visible = false; };
  return { list, update, guard, dispose() { for (const h of list) h.dispose(); } };
}
