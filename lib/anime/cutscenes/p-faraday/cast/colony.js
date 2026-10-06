// COLONY SEALS x10 (extras): 0.5 m small seals in school uniform, spacing 1.9 m, x -13 to +4 along the far walkway (the +z side of the seal,
// so no camera on the kill side ever has one between lens and seal). White shirt #f1f0ff, tie in 4 variants, navy bottoms #2a2f6a,
// a single tuft in 4 colours. Watching -> flinch f163-170 (squash 0.7, scatter 0.3 m) -> relief; hop on twos f290-340 (12.1-14.2 s).
import { actor } from "./actor.js";
import { colony as spec, TIES, schoolTie, navyBottoms } from "./costumes.js";
import { T, sm, win, L1 } from "./util.js";

export const N_COLONY = 10;

export function buildColony(ctx) {
  const R = ctx.rng("p-faraday/colony");
  const crowd = [];
  for (let i = 0; i < N_COLONY; i++) {
    const a = actor(ctx, spec(i));
    a.seal.body.add(L1(schoolTie(ctx, TIES[i % 4])), L1(navyBottoms(ctx)));
    crowd.push({ a, x0: -13 + 1.9 * i, z0: 3.4 + (R() - 0.5) * 0.5, delay: R() * 0.1, ph: R() * 6.28, hopAmp: 0.1 + R() * 0.06, scat: 0.2 + R() * 0.1 });
  }
  return {
    roots: crowd.map((c) => c.a.root),
    update(t, cue, base) {
      const tShot = T(cue, "shot", 6.8), tC = T(cue, "lineC", 12.0);
      for (const c of crowd) {
        const m = t - tShot - c.delay;
        const flinch = m <= 0 ? 0 : win(m, 0, 1.4, 0.05, 1.2); // squash to 0.7 in 2 frames, ease back over ~1 s
        const away = sm(0, 0.35, m); // scatter ~0.3 m: off the beam line (+z) and sideways from the bite
        const dir = Math.sign(c.x0 + 4 - 2.6) || 1;
        // relief hop f290-340 on twos, per-seal phase
        const hop = win(t, tC + 0.1, tC + 2.2, 0.2, 0.3) * Math.abs(Math.sin(t * Math.PI * 3 + c.ph)) * c.hopAmp;
        c.a.at(base[0] + c.x0 + dir * c.scat * away * 0.5, base[1] + hop, base[2] + c.z0 + c.scat * away);
        c.a.face(base[0] + c.x0 * 0.3 + 2.6, base[2]); // watching the platform
        c.a.pose({ kneel: 0.9 * flinch, terror: 0.5 * flinch });
        if (m > 0 && m < 1.6) c.a.expr("terror", 1);
        else if (m >= 1.6) c.a.expr(t > tC ? "awe" : "calm", t > tC ? 0.6 : 0.8); // relief
        else c.a.expr("calm", 0.4); // watching
        c.a.update(t);
      }
    },
    dispose() { for (const c of crowd) c.a.dispose(); },
  };
}
