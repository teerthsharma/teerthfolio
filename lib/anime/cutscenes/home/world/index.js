// WORLD for home (Vinland Saga): the fjord (set, see-through overlay, far ridges, shingle, shadows, air and the surface finish), and the
// real island it stands over. Layer 0 is the page; its parts are built through make(), so one that fails is listed and muted and the rest
// play. The fjord page turns about the lens for a calm-menace hold (menace.calm): the world shakes, the seal does not.
import { Euler, Group, Quaternion, ShaderMaterial, Vector3 } from "three";
import { buildSet } from "./set.js";
import { buildOverlay } from "./overlay.js";
import { buildIsland } from "./island.js";
import { buildFar } from "./far.js";
import { buildGround } from "./ground.js";
import { buildShadows } from "./shadows.js";
import { buildAir } from "./air.js";
import { dress } from "./surface.js";
import { tone } from "../tone.js";
import { DOCK, INTO, LINE } from "../clock.js";

const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), EYE = new Vector3(), AT = new Vector3(...DOCK), S3 = [0, 0, 0];
const fjord = (t) => t >= INTO - 0.04 && t < LINE.collapse[0];

export default function build(ctx) {
  const root = new Group(), page = new Group(), parts = [];
  const make = (name, fn) => {
    try { return fn(); } catch (e) { console.error(`[home/world] ${name} failed to build:`, e); return null; }
  };
  const keep = (name, p, into) => { if (p) { into.add(p.group); parts.push({ name, p, dead: false }); } return p; };

  const set = keep("set", make("set", () => buildSet(ctx)), page);
  keep("overlay", make("overlay", () => buildOverlay(ctx)), page);
  keep("far", make("far", () => buildFar()), page);
  keep("ground", make("ground", () => buildGround()), page);
  keep("shadows", make("shadows", () => buildShadows()), page);
  keep("air", make("air", () => buildAir()), page);
  try { const d = set && dress({ landM: set.parts.landM, waterM: set.parts.waterM, floeM: set.parts.floeM }); if (d) parts.push({ name: "dress", p: d, dead: false }); } catch (e) { console.error("[home/world] surface finish skipped:", e); }
  const island = make("island", () => buildIsland());
  if (island) root.add(island.group);
  root.add(page);

  const toned = new WeakSet();
  root.traverse((o) => {
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !m.isShaderMaterial || typeof m.fragmentShader !== "string" || toned.has(m)) continue;
      toned.add(m);
      tone(m);
    }
  });

  return {
    group: root,
    update(t, dt, cue) {
      for (const p of parts) {
        if (p.dead) continue;
        try { p.p.update?.(t, dt, cue); } catch (e) { p.dead = true; console.error(`[home/world] ${p.name} update failed:`, e); }
      }
      for (const n of ["far", "ground", "shadows", "air", "overlay"]) { const p = parts.find((q) => q.name === n); if (p) p.p.group.visible = fjord(t); }
      try { island?.page(fjord(t), t < INTO || t >= LINE.collapse[0]); } catch (e) { console.error("[home/world] island page failed:", e); }
      const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      page.position.set(0, 0, 0); page.quaternion.identity();
      if (calm < 1 && cam && ctx.player.law) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        page.quaternion.copy(QA);
        page.position.copy(EYE.copy(cam.position).sub(AT)).applyQuaternion(QA).negate().add(EYE);
      }
    },
    dispose() {
      for (const p of parts) { try { p.p.dispose?.(); } catch (e) { console.error(e); } }
      try { island?.dispose(); } catch (e) { console.error(e); }
    },
  };
}
