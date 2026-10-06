// KUROKO-SEAL (victim): 0.6 m small seal, cream pinafore, green Judgement armband, twin tails with red ribbons.
// Perched on the lamp post from f46 (1.9 s), crouched, worried; f163 (6.8 s) the wind snaps the tails forward and lifts them;
// f170-200 (7.08-8.33 s) she tumbles off the lamp into the river mist and is gone. No bubble: the 'Onee-sama!' SFX tag is the direction layer's.
import { Group } from "three";
import { actor } from "./actor.js";
import { KUROKO, kurokoArmband, kurokoRibbon } from "./costumes.js";
import { T, sm, clamp01 } from "./util.js";

// the lamp post, relative to the seal (the WORLD layer's KUROKO_LAMP): x along the beam line, z to the far side, 4.2 m tall
export const LAMP = [5.5, 4.2, 2.4];

export function buildKuroko(ctx) {
  const a = actor(ctx, KUROKO), s = a.seal;
  s.body.add(kurokoArmband(ctx), kurokoRibbon(ctx, 1), kurokoRibbon(ctx, -1));
  // hair pivot at the head so the tails snap and lift about the scalp, not about the feet
  let tails = null;
  if (s.hair) {
    const head = [0, 0.555, 0.03];
    s.body.remove(s.hair);
    tails = new Group(); tails.position.set(...head); s.hair.position.set(-head[0], -head[1], -head[2]);
    tails.add(s.hair); s.body.add(tails);
    tails.traverse((o) => o.layers.set(1));
  }
  return {
    root: a.root,
    update(t, cue, base) {
      const tShot = T(cue, "shot", 6.8), tA = T(cue, "lineA", 1.8);
      const m = t - tShot, u = clamp01((m - 0.28) / 1.25); // tumble 7.08 -> 8.33
      const falling = u > 0;
      // perch on the lamp top, then the fall: x drifts with the wind (+x), y = 4.2 - 5.8 u^2 down below the water, spun two turns
      a.at(base[0] + LAMP[0] + 1.8 * u, base[1] + LAMP[1] - 5.8 * u * u + 0.02, base[2] + LAMP[2]);
      if (!falling) a.face(base[0], base[2]);
      a.tumble(falling ? u * 5 : 0, falling ? -u * Math.PI * 4 : 0);
      a.shadow(!falling);
      a.show(u < 1);
      // crouched on the lamp (f46); alarm at the bite
      const crouch = sm(tA + 0.1, tA + 0.5, t);
      a.pose({ kneel: 0.5 * crouch * (m > 0 ? 0.6 : 1), stagger: m > 0 && !falling ? 0.5 : 0, terror: m > 0 ? 0.8 : 0 });
      if (m > 0) a.expr("terror", 1); else if (t > tA) a.expr("sad", 0.75); else a.expr("neutral", 0);
      if (tails) {
        const wind = m > 0 ? sm(0, 0.12, m) : 0; // snap forward by 0.55 rad, then flutter on twos
        tails.rotation.x = 0.55 * wind + 0.12 * Math.sin(t * 24) * wind;
        tails.rotation.z = m > 0 ? 0.08 * Math.sin(t * 17) : 0;
      }
      a.update(t);
    },
    dispose() { a.dispose(); },
  };
}
