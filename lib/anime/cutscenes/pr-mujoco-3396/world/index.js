// WORLD layer for pr-mujoco-3396: the painted kit on the deployed clock (live/kit.js, drive.js), the island the painting covers and burns off
// (island.js), and the BOOST modules (masonry, faces, dress, floor, heaven, horizon, debris), which are switched off by ?boost=0 to give the port exactly.
// Every module is hidden once the painting has burned off (s >= T.burn[1]); a module with a tier runs only at that tier or above.
import { Euler, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from "three";
import { CUT, DOCK, R, T, smooth, warp } from "../clock.js";
import { U } from "../ink.js";
import { buildKit } from "../live/kit.js";
import { zF } from "../live/world.js";
import { buildDebris } from "./debris.js";
import { buildDress } from "./dress.js";
import { buildFaces } from "./faces.js";
import { buildFloor } from "./floor.js";
import { buildHeaven } from "./heaven.js";
import { buildHorizon } from "./horizon.js";
import { buildIsland } from "./island.js";
import { buildMasonry } from "./masonry.js";
import { drive } from "./drive.js";

const BOOST = !/[?&]boost=0\b/.test(globalThis.location?.search ?? "");
const AT = new Vector3(...DOCK), EYE = new Vector3(), QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), SH = [0, 0, 0];
const BURN = new Vector3();

export default function build(ctx) {
  const kit = buildKit(), island = buildIsland();
  const clear = new Mesh(new PlaneGeometry(0.001, 0.001), new MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
  clear.renderOrder = 999;
  clear.frustumCulled = false;
  clear.onBeforeRender = (r) => r.clearDepth();
  const set = new Group(), group = new Group();
  set.add(clear, kit.group);
  group.add(island.group, set);

  const mods = [];
  if (BOOST) {
    for (const [name, make, tier] of [
      ["masonry", () => buildMasonry(kit)], ["faces", () => buildFaces(kit)], ["dress", () => buildDress()],
      ["floor", () => buildFloor(kit, ctx), 2], ["heaven", () => buildHeaven(kit, ctx)], ["horizon", () => buildHorizon(kit, ctx)],
      ["debris", () => buildDebris(ctx)],
    ]) {
      try { const m = make(); m.tier ??= tier; set.add(m.group); mods.push(m); } catch (e) { console.error(`[pr-mujoco-3396 world] boost ${name} skipped:`, e); }
    }
  }

  return {
    group,
    update(t, dt, cue) {
      const s = warp(t), up = t >= CUT && s < T.burn[1], cam = ctx.player?.camera;
      kit.group.visible = clear.visible = up;
      island.page(up && t < R.restore[0]);
      island.update(t);
      const RES = ctx.engine.shared.uRes.value;
      U.uPx.value = ctx.engine.renderer.getPixelRatio();
      U.uTime.value = s;
      U.uRes.value.copy(RES);
      U.uBurn.value = s >= T.burn[0] ? smooth(T.burn[0], T.burn[1], s) * 1.9 - 0.02 : -1;
      if (cam) {
        BURN.set(DOCK[0], 4.5, DOCK[2] + zF(0)).project(cam);
        U.uBurnC.value.set((BURN.x * 0.5 + 0.5) * RES.x, (BURN.y * 0.5 + 0.5) * RES.y);
      }
      // the calm law: the world takes the hit while the seal holds still (the page turns about the lens by the shake)
      const calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      set.position.set(0, 0, 0);
      set.quaternion.identity();
      if (calm < 1 && cam) {
        const sh = ctx.player.law.shake(t, SH), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(sh[1] * k, sh[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        set.quaternion.copy(QA);
        set.position.copy(EYE.copy(cam.position).sub(AT)).applyQuaternion(QA).negate().add(EYE);
      }
      if (up) drive(kit, ctx, s);
      for (const m of mods) {
        if (m.group) m.group.visible = up && (!m.tier || ctx.atTier(m.tier));
        try { m.update?.(t, s, cue); } catch (e) { console.error("[pr-mujoco-3396 world] boost update failed:", e); }
      }
    },
    dispose() {
      for (const m of mods) m.dispose?.();
      island.dispose();
      kit.dispose();
      clear.geometry.dispose();
      clear.material.dispose();
    },
  };
}
