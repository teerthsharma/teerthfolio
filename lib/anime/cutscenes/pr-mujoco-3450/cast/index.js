// CAST layer for pr-mujoco-3450 (One Punch Man): the hero's costume pieces and marks, and the Dark Matter Thieves as costumed seals.
// Layer 1 (redrawn every step). The hero is the locked pup (never restyled); everything on it rides seal.attach():
//   hero-face.js   the serious-face decal (dot eyes, brow slash, cheek hatch, cross-vein, flat mouth, 70% brow shadow)
//   hero-cape.js   the 4-panel white cape with 3 pleats and the collar knot
//   hero-arm.js    the Serious Punch flipper + mitt + smear multiples + star glint, and the red wristband
//   victims.js     Boros-seal + four thieves (costumes.js), reactions, flight, dust, dropped blasters, the white flag
// Cue names read (the bible's own words; each also falls back to the bible's absolute frame when the beat is absent):
//   punch (aliases strike, serious-punch, fist, impact)  the f94 strike: every reaction is an offset from it
//   crouch (a `pose` beat with pose:"crouch", or the name crouch / windup)  f70: cape on, serious face opens
//   hull (aliases born, storm, rays, spray)  f41: the thieves point up, the thin brow
export * from "./timeline.js";
import { resolve, frameOf } from "./timeline.js";
import { makeProps } from "./props.js";
import { buildHeroFace } from "./hero-face.js";
import { buildHeroCape } from "./hero-cape.js";
import { buildHeroArm } from "./hero-arm.js";
import { buildVictims } from "./victims.js";
import { costumeSpecs } from "./costumes.js";

export default function build(ctx) {
  const T = resolve(ctx), frame = frameOf(ctx.scene), P = makeProps(ctx);
  const group = new ctx.THREE.Group();
  const parts = [];
  const safe = (name, make) => { try { const p = make(); parts.push(p); return p; } catch (e) { console.error(`[pr-mujoco-3450 cast] ${name} failed:`, e); return null; } };

  // ---- the hero's attachments (the pup mesh is never edited)
  const face = safe("hero-face", () => buildHeroFace(ctx, T));
  if (face) ctx.seal.attach(face.mesh, 1);
  const cape = safe("hero-cape", () => buildHeroCape(ctx, T, P));
  if (cape) ctx.seal.attach(cape.group, 1);
  const arm = safe("hero-arm", () => buildHeroArm(ctx, T, P, frame));
  if (arm) ctx.seal.attach(arm.group, 1);

  // ---- the Dark Matter Thieves
  const vic = safe("victims", () => buildVictims(ctx, T, P, frame, costumeSpecs(ctx.kit)));
  if (vic) group.add(vic.group);

  return {
    group,
    update(t, dt, cue) {
      // t is the stepped clock; the strike (f94-97) is drawn on ones, so the parts that own it also read cue.t
      face?.update(t);
      cape?.update(t, cue.t);
      arm?.update(t, cue.t);
      vic?.update(t, dt, cue);
    },
    dispose() {
      for (const p of parts) p?.dispose?.();
      for (const o of [face?.mesh, cape?.group, arm?.group]) o?.parent?.remove(o);
      P.dispose();
    },
  };
}
