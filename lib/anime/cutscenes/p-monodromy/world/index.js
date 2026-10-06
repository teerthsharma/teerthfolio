// WORLD layer for p-monodromy (Magi, Sinbad: Baal): Sindria, the Terrace Quay, the cliff palace, the sea, the sky. A-1 warm cel: flat 2-3 tone
// fills with hard violet shadows, painted sky plates, storm half near-monochrome cyan-blue. Facade-built: only what the lens sees.
//
// CUES (read from scene.beats by name; the bible's timings are the defaults, so every state is a pure function of t and scrubbing == playing):
//   "dissolve"   { t 0,   dur 0.25 }  the 6-frame match dissolve from the dock into Sindria (noise discard with a gold edge)
//   "storm"      { t 1.9, dur 4.5 }   the day sky is overrun by the storm front, cumulus -> spiral cloud deck, world goes cyan-blue
//   "violet"     { t 4.9, dur 1.5 }   the bruise-violet torn band #2b2a6b low on the horizon (the crowd ducks with it)
//   "flash"      { t }                one beat per sky flash (defaults 3.35 3.95 4.9 5.35 5.8 6.1), 4 frames, additive #cfe6ff 22%
//   "strike"     { t 6.4, dur 1.1 }   Baararaq Saiqa: the hard-edged light wash on the terrace, sky horizon flare (grow 0.2, hold 0.5, fade 0.4)
//   "freeze"     { t 8.4 }            the world stops: sea, flags, boats, steam hold still until the island lands
//   "fold"       { t 8.4, dur 1.0 }   the island folds like a book about the x=0 seam (world-fold vertex squeeze)
//   "reassemble" { t 9.7, dur 0.8 }   unfold: land at 9.7 (F+1.3), locked at 10.5 (F+2.1); the storm clears, Sindria daylight returns
// Anything that changes (storm, flashes, strike, fold, dissolve) needs a redraw each step, so the static subtree flips to layer 1 while any
// state is non-zero and back to layer 0 (the baked plate) otherwise. The sea, flags, palms, boats and fountain jets are always layer 1.
// NOTHING stands within 3 m of the seal at the origin. The lens side of the quay is open (no rail, no palm in the x > 5, z > 5 corner).
import { Group } from "three";
import { buildSky } from "./sky.js";
import { buildSea } from "./sea.js";
import { buildPalace } from "./palace.js";
import { buildQuay } from "./quay.js";
import { buildPalms } from "./flora.js";
import { buildFleet } from "./fleet.js";
import { buildLanterns } from "./lanterns.js";
import { SUN, makeU, timeline } from "./common.js";

export default function build(ctx) {
  const { engine, scene } = ctx;
  const group = new Group(), stat = new Group(), anim = new Group();
  group.add(stat, anim);
  const U = makeU();
  // the key light of the whole cut: Sindria's high sun, top-left; restored on dispose
  const prevLight = engine.shared.uLightDir.value.clone();
  engine.shared.uLightDir.value.copy(SUN);

  const sky = buildSky(ctx, U), sea = buildSea(ctx, U), palace = buildPalace(ctx, U), quay = buildQuay(ctx, U);
  const palms = buildPalms(ctx, U), fleet = buildFleet(ctx, U), lan = buildLanterns(ctx, U);
  stat.add(sky.mesh, palace.mesh, quay.stat, lan.stat, lan.hal);
  anim.add(sea.mesh, palace.flags, palms.mesh, fleet.group, quay.anim);
  ctx.setLayer(anim, 1);
  ctx.setLayer(stat, 0);

  const tl = timeline(scene);
  let layer = 0;
  return {
    group,
    update(t) {
      const s = tl(t);
      U.uStorm.value = s.storm; U.uViolet.value = s.violet; U.uStrike.value = s.strike; U.uFlash.value = s.flash;
      U.uFoldA.value = s.fold; U.uReveal.value = s.reveal; U.uTw.value = s.tw;
      const dyn = s.dynamic || s.storm > 0.0005 || s.violet > 0.0005 || s.strike > 0 || s.flash > 0 || s.fold > 0 || s.reveal < 0.999 || s.frozen ? 1 : 0;
      if (dyn !== layer) { layer = dyn; ctx.setLayer(stat, layer); }
      fleet.update(s.tw, s.folded);
      lan.update(s.folded);
      quay.update(s.tw);
    },
    dispose() {
      engine.shared.uLightDir.value.copy(prevLight);
      sky.dispose(); sea.dispose(); palace.dispose(); quay.dispose(); palms.dispose(); fleet.dispose(); lan.dispose();
    },
  };
}
