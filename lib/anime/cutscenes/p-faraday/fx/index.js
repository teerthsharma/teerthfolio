// FX layer for p-faraday (A Certain Scientific Railgun). Layer 1. Written straight from the bible, FX section 6 and the shot list.
// Modules (each isolated: one that throws is muted, the others keep playing):
//   fields.js  cyan arcs + lilac rings + ghosts + 18 right-angle ticks + the orbit round the pup
//   beam.js    outlined posterised Railgun, Imagine Breaker cut, sonic ring, flares, 170 sparks, flash, shimmer, river gold, afterglow sparks
//   coin.js    the coin (toss, smear, held up), its streak, and the amber rise
//   screen.js  ZAP burst, gold rim, scorch wipe, moon halo, impact/speed-line/shock registration
// CUE NAMES (all optional; absent beats fall back to the bible's card times, seconds):
//   zap 1.15, fieldsStart 1.2, tickLock 4.0, amber 4.85, coinToss 6.4, shot 6.8, afterglow 9.2, proof 12.0, face 14.4, credit 16.7, wipe 20.0
// Optional scene.layout.fx: { A:[x,y,z], B:[x,y,z], deckY, fieldZ, riverY, handD, moon:[x,y,z] } to match the world layer.
// The seal is never covered (full-frame quads sit behind its depth) and never emissive.
import { timeline, layoutOf, makeShared } from "./lib.js";
import makeFields from "./fields.js";
import makeBeam from "./beam.js";
import { makeCoin, makeAmber } from "./coin.js";
import makeScreen from "./screen.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group(); group.name = "p-faraday-fx";
  const sh = makeShared(ctx.THREE, ctx), T = timeline(ctx), L = layoutOf(ctx);
  const mods = [];
  for (const [name, make] of [["screen", makeScreen], ["fields", makeFields], ["amber", makeAmber], ["coin", makeCoin], ["beam", makeBeam]]) {
    try { const m = make(ctx, sh, T, L); m.name = name; group.add(m.group); mods.push(m); } catch (e) { console.error(`[p-faraday fx] ${name} failed to build`, e); ctx.player?.errors?.push({ layer: `fx/${name}`, message: String(e?.stack ?? e) }); }
  }
  return {
    group,
    update(t, dt, cue) {
      sh.sync();
      for (const m of mods) {
        if (m.dead) continue;
        try { m.update(t, dt, cue); } catch (e) { m.dead = true; m.group.visible = false; console.error(`[p-faraday fx] ${m.name} muted`, e); ctx.player?.errors?.push({ layer: `fx/${m.name}`, message: String(e?.stack ?? e) }); }
      }
    },
    dispose() { for (const m of mods) { try { m.dispose(); } catch { /* already freed */ } } },
  };
}
