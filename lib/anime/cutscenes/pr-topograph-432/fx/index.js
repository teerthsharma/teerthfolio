// FX layer for pr-topograph-432 (Overlord, Ainz as a Saturday-morning cartoon). Layer 1, written from the bible's FX section.
// Files: circle.js (Super-Tier magic circle + beams), bits.js (gems, slam stars, crack, shock ring, walls, lashes, shards, puffs, motes),
// screen.js (iris wipe, curtain wipe, wipe home), lib.js (helpers). The seal is never emissive and nothing here sits between lens and seal:
// screen wipes discard inside the seal's padded screen box.
// CUES read (all optional; the bible's own times are the fallback):
//   circle(2.0) slam(7.92) walls(8.0) lash(7.95) break(8.5) circleclose(15.3) gems(4.58) curtain(24.17) irisin(0) wipehome(duration-0.9)
// Impact frames, speed lines, warp rings and trauma stay with scene.js beats (reserved names). SFX lettering stays in scene.sfx.
import { buildCircle } from "./circle.js";
import { buildBits } from "./bits.js";
import { buildScreen } from "./screen.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const parts = [];
  const add = (mk, attach) => { try { const p = mk(ctx); (attach ? attach(p) : group.add(p.group)); parts.push(p); } catch (e) { console.error("[pr-topograph-432 fx]", e); ctx.player?.errors?.push({ layer: "fx", message: String(e?.message || e) }); } };
  const floorPivot = new ctx.THREE.Group(); // circle sits on the floor under the seal
  group.add(floorPivot);
  add(buildCircle, (p) => floorPivot.add(p.group));
  add(buildBits);
  add(buildScreen, (p) => group.add(p.mesh));
  return {
    group,
    update(t, dt, cue) {
      const s = ctx.seal, fy = ctx.scene.seal?.at?.[1] ?? s.at[1];
      floorPivot.position.set(s.at[0], fy, s.at[2]); floorPivot.rotation.y = s.yaw; floorPivot.scale.setScalar(s.scale);
      for (const p of parts) p.update(t, dt, cue);
    },
    dispose() { parts.forEach((p) => p.dispose?.()); },
  };
}
