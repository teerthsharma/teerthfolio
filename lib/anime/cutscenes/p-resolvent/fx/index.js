// FX layer for p-resolvent (Frieren vs Aura, Madhouse). Layer 1. Written by the FX agent from scripts/p-resolvent.md section 6.
//
// Sub-systems (each isolated, so one that throws is muted and the rest play):
//   flames    soul-flame, scribble-hatch mass + dark-rose shape, silver Auserlese glow           (shots 3, 6)
//   column    mana column, force rings, gold flash, violet dusk, god-ray bands                   (shots 4, 5, 6)
//   particles leaves, stones, motes, flat dust puffs, shards + star glints                       (all)
//   cracks    kintsugi proof trees on the floor and sky, the gold unmake front                    (shots 8, 9)
//   easter    the blue butterfly (egg 2)
//
// CUE NAMES read (all optional: each has the bible's own time as its default, and a beat of that name only moves the start):
//   release (7.7)  break (8.5)  cracks (11.4, dur 1.8)  unmake (13.0, dur 2.4)  butterfly (5.2, dur 1.8)
// Reserved beats (impact, speedlines, shock, trauma) are NOT built here: scene.js fires them. As a safety net this layer asks
// ctx.sakuga for the bible's 1-frame two-tone impact at 8.5 s only if scene.js has no impact beat within 0.2 s of it.
//
// SEAL LAWS: nothing here is ever drawn over the seal (common.js sealClear fades every fragment that lies between the lens and a
// disc around the seal; the full-frame flash and dusk quads carry a hole on the projected seal), and nothing here touches the seal's
// material, so it stays at lit luma <= .92 and out of bloom.
//
// ANCHORS: positions of the scale, Aura and the ranks come from scene.fx = { scale:[x,y,z], aura, ranks } if the direction layer
// writes it, else from common.js (scale 4.8 m ahead of the seal at 2.1 m, Aura 6.4 m, ranks 15 m).
import { anchors, makeShared } from "./common.js";
import flames from "./flames.js";
import column from "./column.js";
import particles from "./particles.js";
import cracks from "./cracks.js";
import easter from "./easter.js";

export default function build(ctx) {
  const THREE = ctx.THREE, group = new THREE.Group(); group.name = "p-resolvent-fx";
  const S = makeShared(THREE), A = anchors(ctx);
  const parts = [];
  for (const [name, fn] of [["flames", flames], ["column", column], ["particles", particles], ["cracks", cracks], ["easter", easter]]) {
    try { const p = fn(ctx, S, A); group.add(p.group); parts.push({ name, p, ok: true }); }
    catch (e) { console.warn(`[p-resolvent fx] ${name} failed to build:`, e); ctx.player?.errors?.push({ layer: `fx/${name}`, message: String(e?.message ?? e) }); }
  }
  // the bible's frame-204 impact, only when direction has not written one
  const hasImpact = (ctx.scene.beats ?? []).some((b) => b.name === "impact" && Math.abs(b.t - 8.5) < 0.2);
  if (!hasImpact) ctx.sakuga?.impact(8.5, [[1, 1]]);

  const chest = new THREE.Vector3();
  function update(t, dt, cue) {
    ctx.seal.chest(chest);
    S.uSeal.value.copy(chest); S.uSealR.value = 0.55 * (ctx.seal.scale || 1);
    for (const e of parts) {
      if (!e.ok) continue;
      try { e.p.update(t, dt, cue); }
      catch (err) { e.ok = false; e.p.group.visible = false; console.warn(`[p-resolvent fx] ${e.name} muted:`, err); ctx.player?.errors?.push({ layer: `fx/${e.name}`, message: String(err?.message ?? err) }); }
    }
  }
  function dispose() { for (const e of parts) { try { e.p.dispose(); } catch { /* already gone */ } } }
  return { group, update, dispose };
}
