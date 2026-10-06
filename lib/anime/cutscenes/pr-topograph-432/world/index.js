// WORLD layer for pr-topograph-432 (WORLD agent): the Throne Room of Nazarick as a Saturday-morning cartoon cel set.
// Layer 0 (baked per shot): plate, hall, stair, carpet, pillars, arches, throne, window, floor inlay, banner ghost.
// Layer 1 (redrawn per step): the 41 swaying banners and the dust motes.
// Bible: scripts/pr-topograph-432.md "Throne Room hall", "Purple walls" (set pieces owned by FX/CAST are NOT built here:
// the live magic circle, walls of force, lashes, shards and the cloaked seal belong to the fx and cast layers).
// Style law: flat 2-tone fills, uniform ink hulls (engine.ink), painted gradients per vertex, 2 px joints, no noise, no
// hatching, no panel borders. Cues: reads `cue.k("circle")`-style cues only to dim the dust at the strike; names below.
//
// CUES READ: "strike" (the staff slam, 7.92 s): the dust holds still on the slam cel (a held cel, cartoon timing).
//            "wipe" is the direction layer's; the world does nothing for it.
import { C } from "./helpers.js";
import { buildHall } from "./hall.js";
import { buildThrone } from "./throne.js";
import { buildBanners } from "./banners.js";
import { buildWindow } from "./window.js";
import { buildInlay } from "./inlay.js";
import { buildDust } from "./dust.js";
import { buildPlate } from "./plate.js";

export default function build(ctx) {
  const { THREE, engine } = ctx;
  const group = new THREE.Group();
  const stat = new THREE.Group(); group.add(stat); // layer 0 static art

  buildPlate(ctx, stat);
  buildHall(engine, stat);
  buildThrone(engine, stat);
  const window_ = buildWindow(ctx, stat);
  buildInlay(engine, stat);
  const banners = buildBanners(engine, ctx, stat);
  const dust = buildDust(engine, ctx);
  group.add(banners.group, dust.mesh);

  // the same violet height fog on every prop (banners, dust included): amount, y centre, scale, distance
  group.traverse((o) => { const u = o.material?.uniforms; if (u?.uFog) { u.uFog.value.set(0.5, 0, 5, 60); u.uFogCol.value.set(C.stoneShade); } });

  let held = 0;
  return {
    group,
    banners: banners.count, // 41
    update(t, dt, cue) {
      banners.update(t);
      // held cel on the slam: the motes freeze for the 3 smear frames after "strike"
      if (!(cue?.since?.("strike") < 0.125)) held = t;
      dust.update(held);
    },
    dispose() {
      banners.dispose(); dust.dispose();
      stat.traverse((o) => {
        if (o.userData?.dispose) o.userData.dispose();
        else { o.geometry?.dispose?.(); o.material?.dispose?.(); }
      });
      window_.userData?.dispose?.();
    },
  };
}
