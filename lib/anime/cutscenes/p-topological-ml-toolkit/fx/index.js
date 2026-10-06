// FX layer for p-topological-ml-toolkit (Index, Accelerator vs Kakine; "the shape of data is a field of vectors, turn it round").  Layer 1.
// Modules (each returns {group, update(t, dt, cue), dispose}), isolated so one failure leaves the rest playing:
//   ribbons.js  72 wind ribbons spiralling to the orb 5.7-9.7 s, 14 with arrow heads
//   arrows.js   storm arrows (red -> flip -> white/cyan), gold feature grid round the Betti-1 hole, the pale-gold outlier (egg 5)
//   impacts.js  hit stars/rings/sparks/debris/dust, rival ray, lattice, pop (shards, ring pairs, surviving ring: egg 6)
//   orb.js      plasma orb (posterised, violet shell, ink arcs) -> soap-bubble film -> release trail arcs
//   stage.js    shell wave (shot 1), pop flash, accordion crease lines, map-fold wipe (shot 11)
// Cue names read (windows fall back to the bible's seconds when scene.js does not fire them; a fired beat of the same name moves the start):
//   shell[0] storm[1.2] reverse[3.4] hit[4.55] fire[5.0] ribbons[5.7] orb[5.8] bubble[7.95] grid[8.0] release[9.46] pop[10.35] fold[10.4] wipe[15.0]
// Reserved beats (impact f109 / f248-249, speedlines 12 radial x 6 f at the pop, shock = the sky wave 3.4 rad, trauma, pose) are fired by scene.js, not here.
// Not here (other layers / overlay / post): world plate, sky erase, turbines and the train smear, the folding leaves themselves (world), the rival seal,
//   its wings and the "ACCEL" decal (cast), SFX lettering (scene.sfx), the costume rim and tuft (seal). Easter eggs 5 and 6 are here; 1-4 and 7 are cast / world.
import buildRibbons from "./ribbons.js";
import buildArrows from "./arrows.js";
import buildImpacts from "./impacts.js";
import buildOrb from "./orb.js";
import buildStage from "./stage.js";
import { makeFrame, resolveTimeline, smooth, lerp, T0 } from "./util.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const F = makeFrame(ctx);
  const o0 = new THREE.Vector3(), o1 = new THREE.Vector3();
  // shared, per-frame state: the timeline, the bubble's centre, and the arrow heads the ribbons hand to the arrow pool
  const env = {
    T: { ...T0 }, F, B: new THREE.Vector3(), v1: new THREE.Vector3(), bubbleOn: false, gridOn: false, heads: [],
    bubbleAt(tt, out) {                                   // the bubble rises from the orb's centre to [0.3, 6.0, -1.0] between the flick and the pop
      F.toWorld(0.2, 3.7, -1.0, o0); F.toWorld(0.3, 6.0, -1.0, o1);
      const k = smooth(env.T.release, env.T.pop - 0.05, tt);
      return out.set(lerp(o0.x, o1.x, k), lerp(o0.y, o1.y, k), lerp(o0.z, o1.z, k));
    },
  };
  const mods = [];
  for (const [name, fn] of [["ribbons", buildRibbons], ["arrows", buildArrows], ["impacts", buildImpacts], ["orb", buildOrb], ["stage", buildStage]]) {
    try { const m = fn(ctx, env); m.name = name; group.add(m.group); mods.push(m); } catch (e) { console.warn("[p-topological-ml-toolkit fx] " + name + " failed to build", e); }
  }
  const dead = new Set();
  return {
    group,
    update(t, dt, cue) {
      resolveTimeline(cue, env.T);
      env.bubbleAt(t, env.B);
      env.bubbleOn = t >= env.T.bubble && t < env.T.pop;
      env.gridOn = t >= env.T.grid && t < env.T.pop + 0.8;
      for (const m of mods) {
        if (dead.has(m)) continue;
        try { m.update(t, dt, cue); } catch (e) { dead.add(m); m.group.visible = false; console.warn("[p-topological-ml-toolkit fx] " + m.name + " muted", e); }
      }
    },
    dispose() { for (const m of mods) { try { m.dispose(); } catch { /* ignore */ } } },
  };
}
