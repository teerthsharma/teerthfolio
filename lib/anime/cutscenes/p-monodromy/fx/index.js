// FX layer for p-monodromy (Magi: Sinbad's Baal Djinn Equip, Baararaq Saiqa). Layer 1. Written straight from the bible: scripts/p-monodromy.md section 5, 6, 7.
// Modules (each isolated: one that throws is muted, the others keep playing):
//   bolt.js    Baararaq Saiqa mega-bolt (3 seeds on threes), strike wash, blue sparks on the hits
//   aura.js    wreath arcs, equip sheath helices, gold ring vessels with halos (easter egg 1)
//   sigil.js   floor and sky sigil rings (easter egg 3)
//   storm.js   vortex column, six sky flashes, strike flash, frame-01 light slabs, equip bursts
//   lens.js    lens crack, facets, glints, dust, 40-shard shatter, the closed-loop shard (easter egg 5)
//   wave.js    ring shockwaves, gold motes, the closing wipe
// CUE NAMES (all optional; absent beats fall back to the bible's card times, seconds):
//   equip 1.9 (dur 1.2), vessels 0.9 (dur .6), sigilFloor 1.9, sigilSky 3.0, flash (repeatable: 3.35 3.95 4.9 5.35 5.8 6.1), charge 4.9,
//   bolt 6.4, crack 6.5, shatter 8.4 (fall +.5, back +1.1, ring +1.3, lock +2.1), motes 0 (dur 1.6), motesB 12.0 (dur 1.4), wipe 13.2 (dur .4)
// Reserved beats (impact, speedlines, shock, trauma) belong to scene.js; where the scene omits them they are registered here from the card times.
// Optional scene.layout.fx: { vortex:[x,y,z], palace:[x,y,z], cultists:[[x,y,z]...], floorY } to match the world and cast layers.
// The seal is never covered (quads sit behind its depth, particles and arcs hide inside its disc) and never emissive.
import { timeline, layoutOf, makeShared } from "./lib.js";
import makeBolt from "./bolt.js";
import makeAura from "./aura.js";
import makeSigil from "./sigil.js";
import makeStorm from "./storm.js";
import makeLens from "./lens.js";
import makeWave from "./wave.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group(); group.name = "p-monodromy-fx";
  const sh = makeShared(ctx.THREE, ctx), T = timeline(ctx), L = layoutOf(ctx);
  const mods = [];
  for (const [name, make] of [["storm", makeStorm], ["sigil", makeSigil], ["lens", makeLens], ["wave", makeWave], ["aura", makeAura], ["bolt", makeBolt]]) {
    try { const m = make(ctx, sh, T, L); m.name = name; group.add(m.group); mods.push(m); } catch (e) { console.error(`[p-monodromy fx] ${name} failed to build`, e); ctx.player?.errors?.push({ layer: `fx/${name}`, message: String(e?.stack ?? e) }); }
  }
  // reserved beats the direction layer may have left out: the inverted impact frame (f154 = 6.4 s), focus lines, the warp ring
  const tB = T.one("bolt", 6.4), tF = T.one("shatter", 8.4);
  try {
    if (!T.has("impact")) ctx.sakuga.impact(tB);
    if (!T.has("speedlines")) ctx.sakuga.speedLines({ t: tB, dur: 0.5, kind: "radial", at: [0.5, 0.5], strength: 0.8, col: "#0b2a55" });
    if (!T.has("shock")) { ctx.sakuga.shock({ t: tB, dur: 0.5, at: [0.5, 0.5], amp: 0.05, r1: 0.9 }); ctx.sakuga.shock({ t: tF + 1.3, dur: 0.6, at: [0.5, 0.5], amp: 0.035, r1: 0.9 }); }
  } catch (e) { console.error("[p-monodromy fx] sakuga registration failed", e); }
  let shook = false;
  return {
    group,
    update(t, dt, cue) {
      sh.sync();
      // camera shake for 6 frames at the bolt (once; trauma decays by itself)
      if (!shook && cue.t >= tB && cue.t < tB + 0.2 && dt > 0 && !T.has("trauma")) { shook = true; try { ctx.sakuga.trauma(0.6); } catch { /* optional */ } }
      if (cue.t < tB - 0.5) shook = false;
      for (const m of mods) {
        if (m.dead) continue;
        try { m.update(t, dt, cue); } catch (e) { m.dead = true; m.group.visible = false; console.error(`[p-monodromy fx] ${m.name} muted`, e); ctx.player?.errors?.push({ layer: `fx/${m.name}`, message: String(e?.stack ?? e) }); }
      }
    },
    dispose() { for (const m of mods) { try { m.dispose(); } catch { /* already freed */ } } },
  };
}
