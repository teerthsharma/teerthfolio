// CAST layer for pr-tensorflow-124410 (JoJo Part 3: DIO, ZA WARUDO, MUDA). Layer 1. Written by the CAST agent; no other layer is touched.
// The hero seal is DIO by COSTUME only (dio.js: yellow jacket, black shirt, heart buckle, red cape, 7 blond clumps, tsurime eye decals, the flex flipper).
// The Stand is The World (stand.js). The victim is a Jotaro-dressed small seal (jotaro.js) and six Cairo bystander seals (bystanders.js). The road roller (roller.js).
// Cue names read (all optional; the bible times are the fallback, aliases in timing.js): stand approach muda timestop resume drown flex tear credit.
// Poses for the hero (sign, point, fist, raise ...) are scene.seal.track's job. Camera law "home": the Stand and the cape step out of the lens-to-seal line.
// Bridge for FX/WORLD (optional, read-only): ctx.marks.tensorflow = { fistL, fistR, standYaw, standVisible, jotaro }.
import buildDio from "./dio.js";
import buildStand from "./stand.js";
import buildJotaro from "./jotaro.js";
import buildBystanders from "./bystanders.js";
import buildRoller from "./roller.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  group.name = "pr-tensorflow-124410-cast";
  const marks = {};
  try { ctx.marks = ctx.marks ?? {}; ctx.marks.tensorflow = marks; } catch { /* ctx frozen: the bridge is optional */ }
  const parts = [];
  // each part is isolated: one that throws is muted (logged) and the rest keep playing
  for (const [name, make] of [["dio", buildDio], ["stand", buildStand], ["jotaro", buildJotaro], ["bystanders", buildBystanders], ["roller", buildRoller]]) {
    try {
      const p = make(ctx, marks);
      if (p.group && name !== "dio") group.add(p.group);
      parts.push({ name, p, dead: false });
    } catch (err) { console.error(`pr-tensorflow-124410 cast/${name}:`, err); ctx.player?.errors?.push?.(`cast/${name}: ${err?.message ?? err}`); }
  }
  return {
    group,
    update(t, dt, cue) {
      for (const e of parts) {
        if (e.dead) continue;
        try { e.p.update(t, dt, cue); } catch (err) { e.dead = true; console.error(`pr-tensorflow-124410 cast/${e.name}:`, err); ctx.player?.errors?.push?.(`cast/${e.name}: ${err?.message ?? err}`); }
      }
    },
    dispose() { for (const e of parts) { try { e.p.dispose(); } catch { /* already gone */ } } },
  };
}
