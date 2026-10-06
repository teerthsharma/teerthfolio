// FX layer for p-tangle (Your Name, kataware-doki, the red cord of musubi). Layer 1. Written straight from bible sections 3.10-3.15, 6, 7.
// Modules (each isolated: one that throws is muted, the others keep playing):
//   comet.js     Tiamat: 3-band tail + star-dust + second streak, break-up in two then three, red ember piece, fan burst, flare 0.9, far shore lit
//   sparkles.js  firefly petal pool, water glints, three 64-sparkle bursts (link, bow pop, girl's hand)
//   lens.js      crepuscular shafts, 5 hex ghosts + pink, flare cross + pink streak, poster flare at centre (egg 1), link glint
//   water.js     ripple rings (link, impact, pull, bow, retract) and the red loop reflection
//   text.js      the thin-serif sky card 誰そ彼 / kataware-doki (egg 7) and the faint "kimi no na wa?" in the glare (egg 3)
//   screen.js    the gold-rim dimension bubble, the near-first dissolve edge, the one short wipe, slow compositor warp rings
//
// CUE NAMES (all optional; a beat named like this in scene.js sets { t, dur } of that effect, absent beats fall back to the bible's
// real-second card times scaled by scene.duration / 28.6):
//   dimension 0 (2.8)   ghosts 1.9 (1.3)   posterFlare 2.8 (.2)   shafts 2.8 (8.2)   loopLight 7.7   link 10.2   cometStart 11.0 (2.9)
//   cometSplit 11.9 (.7)   cometThird 12.6   cometImpact 13.9   pull 14.2   bowPop 15.2   girlBurst 16.4   flareCross 16.4 (3.0)
//   kimi 19.4 (2.2)   ghostsOut 19.4 (3.0)   retract 22.4   titleCard 22.4 (2.6)   dissolve 25.0 (2.8)   wipe 27.8 (.8)
// Optional scene.layout.fx = { lakeY, hand:[x,y,z], flipper:[x,y,z], loops:[x,y,z], impact:[x,y,z], cometFrom:[x,y,z], sun:[x,y,z] }
// to match the world layer; defaults put the girl 28 m, the link 14 m and the far shore 85 m ahead of the seal (its +z).
// The seal is never covered (full-frame quads sit behind its depth; local sprites fade where they would sit in front of it) and never emissive.
import { timeline, layoutOf, makeShared } from "./lib.js";
import makeComet from "./comet.js";
import makeSparkles from "./sparkles.js";
import makeLens from "./lens.js";
import makeWater from "./water.js";
import makeText from "./text.js";
import makeScreen from "./screen.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group(); group.name = "p-tangle-fx";
  const L = layoutOf(ctx), T = timeline(ctx), sh = makeShared(ctx.THREE, ctx, L);
  const dur = ctx.scene.duration || 28.6;
  const mods = [];
  for (const [name, make] of [["screen", makeScreen], ["text", makeText], ["lens", makeLens], ["water", makeWater], ["comet", makeComet], ["sparkles", makeSparkles]]) {
    try { const m = make(ctx, sh, T, L); m.name = name; group.add(m.group); mods.push(m); } catch (e) { console.error(`[p-tangle fx] ${name} failed to build`, e); ctx.player?.errors?.push({ layer: `fx/${name}`, message: String(e?.stack ?? e) }); }
  }
  return {
    group,
    update(t, dt, cue) {
      const tc = cue?.t ?? t; // display-rate clock: sky, water and light are continuous (twos only for the seals)
      sh.sync(tc); sh.setSun(tc, dur);
      for (const m of mods) {
        if (m.dead) continue;
        try { m.update(tc, dt, cue); } catch (e) { m.dead = true; m.group.visible = false; console.error(`[p-tangle fx] ${m.name} muted`, e); ctx.player?.errors?.push({ layer: `fx/${m.name}`, message: String(e?.stack ?? e) }); }
      }
    },
    dispose() { for (const m of mods) { try { m.dispose(); } catch { /* already freed */ } } },
  };
}
