// WORLD layer for p-planimeter ("Checkmate, Reviewer"): the Class D classroom at golden hour, painted the way Lerche paints it.
// Layer 0 (baked per shot): the sky dome, far cards, shell, windows, furniture, props, the painted board.
// Layer 1 (redrawn each step): curtains, window blow-out, shafts, floor patches, motes, the sun halo, the chalk layer, the pencil.
//
// Modules (each isolated: one that throws is logged and the rest of the set still builds):
//   sky.js      E1  baked golden-hour dome (sun 12 deg, posterised cumulus, pink rims)
//   outside.js      courtyard, rooftop skyline + lamp post card, blossom bough card
//   shell.js    E2  floor, walls, ceiling, wainscot, bands, light panels; eggs 3 (Class D, 0 pt tag) and 7 (porthole door)
//   windows.js  E3  frames, sills, pelmets, folded breathing curtains, window blow-out
//   light.js    E7  two-band shafts, floor patches with mullion cross, dust motes, low-sun halo
//   board.js    E4  chalkboard plate + chalk writing, the graph disc, the ghost 50 (egg 1)
//   furniture.js E5 desks, stool, chairs, PR sheet, buried 50 sheet, books, pencil case, rolling pencil, chess king (egg 8)
//
// Cues read (all optional; the bible's frames at 24 fps are the fallback, a beat in scene.js overrides):
//   "chalk"   board writing + disc (f184)      "ghost50"  the ghost 50 returns (f213)
//   "pencil"  the pencil is set down (f149)    "bell"     the sun lowers and warms (14.1 s)
//
// Light: the key is set to the window side (west), warm; the pocket owns its fog (#f6d7a8, ramping with distance only so it
// never touches the interior); engine.sun feeds the screen-space shafts. All of it is restored on dispose.
import * as THREE from "three";
import { Vector3 } from "three";
import { FLOOR, sunDir, smooth01, beatT, disposeTree } from "./kit.js";
import { buildSky } from "./sky.js";
import { buildOutside } from "./outside.js";
import { buildShell } from "./shell.js";
import { buildWindows } from "./windows.js";
import { buildLight } from "./light.js";
import { buildBoard } from "./board.js";
import { buildFurniture } from "./furniture.js";

export default function build(ctx) {
  const { engine } = ctx;
  const group = new THREE.Group();
  const set = new THREE.Group(); set.position.y = FLOOR; group.add(set);       // room coordinates: floor 0, seal seat = FLOOR + 0.93
  const shared = { uSeal: { value: new Vector3(0, 0.4, 0) }, warm: { value: 0 } };
  const parts = [];
  const safe = (name, fn) => {
    try { const r = fn(); if (r?.group) set.add(r.group); else if (r?.isObject3D) set.add(r); parts.push({ name, r }); }
    catch (e) { console.error(`[p-planimeter/world] ${name} failed:`, e); }
  };

  // ---- the key light: golden hour through the west windows ----
  const sh = engine.shared, prev = {
    dir: sh.uLightDir.value.clone(), col: sh.uLightCol.value.clone(), fog: sh.uFog.value.clone(), fogCol: sh.uFogCol.value.clone(), sun: engine.sun,
  };
  sh.uLightDir.value.set(-0.78, 0.52, 0.15).normalize();      // from the glass: lit faces warm, the far side falls to violet shade
  sh.uLightCol.value.setRGB(1.0, 0.96, 0.88);                 // warm but never above the lit-luma cap (material clamps to 0.92)
  sh.uFog.value.set(0.85, FLOOR, 400, 260);                   // distance haze only; #f6d7a8 reached at the far courtyard
  sh.uFogCol.value.set("#f6d7a8");
  engine.sun = sunDir().multiplyScalar(300);                  // screen-space shafts originate at the sun

  // static art first (layer 0), then the animated light (layer 1)
  safe("sky", () => ({ group: buildSky(ctx) }));
  safe("outside", () => buildOutside(ctx));
  safe("shell", () => buildShell(ctx));
  safe("furniture", () => buildFurniture(ctx));
  safe("board", () => buildBoard(ctx));
  safe("windows", () => buildWindows(ctx, shared));
  safe("light", () => buildLight(ctx, shared));

  const tBell = beatT(ctx, "bell", 14.1), chest = new Vector3();
  return {
    group,
    update(t, dt, cue) {
      ctx.seal.chest(chest); shared.uSeal.value.copy(chest);
      shared.warm.value = smooth01((cue.t - tBell) / 6);       // shot 7: the sun lowers toward #ff9a4a
      for (const p of parts) {
        try { p.r.update?.(t, dt, cue); } catch (e) { console.error(`[p-planimeter/world] ${p.name} update failed:`, e); p.r.update = null; }
      }
    },
    dispose() {
      for (const p of parts) { try { p.r.dispose?.(); } catch (e) { console.error(e); } }
      disposeTree(group);
      sh.uLightDir.value.copy(prev.dir); sh.uLightCol.value.copy(prev.col); sh.uFog.value.copy(prev.fog); sh.uFogCol.value.copy(prev.fogCol);
      engine.sun = prev.sun;
    },
  };
}
