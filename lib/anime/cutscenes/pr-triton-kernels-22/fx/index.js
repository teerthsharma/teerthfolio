// FX layer for pr-triton-kernels-22 (Sukuna, Malevolent Shrine; PROTECTED look: manga ink, one blood-red accent).
// Layer 1. Composes the FX modules in this folder:
//   slashes.js    Dismantle x18 from 8.1 s + the Cleave at 16.3 s (tapered clip-space ribbons, core / red edge / glow)
//   particles.js  ink flakes (red 1 in 5), red orbs, sparks, glass, dust, debris
//   ground.js     mirror ripples on hits + the scheduled-path pulse walking the triangle rows on the island
//   overlay.js    veined smoke, red bleed, draw-in wipe, screentone, drain, rub-out, tinted flashes, letterbox, easter eggs
//   lettering.js  DOMAIN CLOSED ink lettering (+ SHING brush)
// Cue names read from scene.beats (fallback = the bible time): bleed 2.0, rise 2.7, slash 8.1, heavy 10.4, dissolve 13.75,
// cleave 16.3, closed 16.5, flex 18.0. Impact frames and shock rings for heavy / cleave hits are registered through ctx.sakuga
// unless scene.beats already carries an impact / shock within 0.1 s of that time. Seal safety: every fragment is sealMask-ed.
import { sealTracker, beatTimes } from "./common.js";
import { buildSlashes } from "./slashes.js";
import { buildParticles } from "./particles.js";
import { buildGround } from "./ground.js";
import { buildOverlay } from "./overlay.js";
import { buildLettering } from "./lettering.js";

export default function build(ctx) {
  const { THREE } = ctx, group = new THREE.Group(); group.name = "fx-triton22";
  const TL = beatTimes(ctx), track = sealTracker(ctx);
  const slashes = buildSlashes(ctx, TL, track);
  const parts = buildParticles(ctx, TL, track, slashes.strokes);
  const ground = buildGround(ctx, TL, parts.hits);
  const overlay = buildOverlay(ctx, TL, track);
  const lettering = buildLettering(ctx, TL, track);
  group.add(ground.frame, parts.frame, slashes.mesh, overlay.mesh, ...lettering.meshes);

  // impact frames and shock rings (pure functions of the clock): 1 frame inverted on heavy hits, 2 frames red mono on the Cleave
  const has = (n, t) => (ctx.scene.beats || []).some((b) => b.name === n && Math.abs(b.t - t) < 0.1);
  try {
    for (const h of [{ t: TL.slash, seq: [[2, 1]] }, { t: TL.heavy, seq: [[2, 1]] }, { t: TL.cleave, seq: [[2, 1], [1, 2]] }]) {
      if (!has("impact", h.t)) ctx.sakuga.impact(h.t, h.seq);
    }
    for (const h of [TL.heavy, TL.cleave]) if (!has("shock", h)) ctx.sakuga.shock({ t: h, dur: 0.5, at: [0.5, 0.5], amp: h === TL.cleave ? 0.06 : 0.035, r1: 0.9 });
  } catch (e) { /* the sakuga api is optional for this layer */ }

  // trauma on each heavy stroke (the one stateful effect): fire once as the clock crosses it
  const heavy = [...slashes.strokes.filter((s) => s.heavy).map((s) => s.t), TL.heavy];
  let prev = -1;

  return {
    group,
    update(t, dt, cue) {
      const ts = cue?.ts ?? t, now = cue?.t ?? t;
      slashes.update(now); parts.update(t); ground.update(t); overlay.update(now, ts); lettering.update(now, ts);
      for (const h of heavy) if (prev < h && now >= h && now - h < 0.25) { try { ctx.sakuga.trauma(0.35); } catch (e) { /* none */ } }
      prev = now;
    },
    dispose() { slashes.dispose(); parts.dispose(); ground.dispose(); overlay.dispose(); lettering.dispose(); },
  };
}
