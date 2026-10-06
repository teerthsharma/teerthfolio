// FX layer for pr-mujoco-3450 (One Punch Man: the hull in one stroke). Layer 1. Every effect of bible section 6, one module each:
//   rays.js   E05 48 ink-ray-stroke ribbons (coral -> mint snap, hot nine, smear doubles, landing ticks)
//   hull.js   E03/E04 hull faces (spiral sweep mint -> violet, ink hull, hatch, star glint) + wire + 42 vertex dots
//   smear.js  E07 smear-frame multiples of the punching flipper (f94 double, f95-96 multiple)
//   shock.js  E10 ring A / ring B / dome / dust push / landing puffs
//   debris.js E12 24 ink-edged shards with glints
//   shaft.js  E13 light shaft through the split + E17 motes
//   screen.js E09 speed-lines (24 radial + 4 mint + 18 parallel), E11 red-black impact card, E16/E19 brush lettering, the wipe home
//   grade.js  E18 vignette / saturation / trauma / engine impact + shock one-offs
// CUE NAMES read (scene.js beats, all optional, bible frames are the default): punch (TP, f94), hull (born f41), number (f230), wipe (f330).
// Reserved beats impact / speedlines / shock / trauma are NEVER double-fired: grade.js registers them only if scene.js has none.
// Seal-local frame: every object sits in a rig that follows the seal (position, yaw, scale). Nothing here is emissive on the seal; additive
// volumes (shaft, dome fill) draw BACK faces only so the seal is depth-tested clean; screen overlays discard inside the seal's screen box.
// No shader links during playback: every material is built in build().
import { Group, IcosahedronGeometry, Vector2, Vector3, Vector4 } from "three";
import { timeline, figureFrame, hullVertices, rayPlan, easeOut3, fr } from "./util.js";
import * as rays from "./rays.js";
import * as hull from "./hull.js";
import * as smear from "./smear.js";
import * as shock from "./shock.js";
import * as debris from "./debris.js";
import * as shaft from "./shaft.js";
import * as screen from "./screen.js";
import * as grade from "./grade.js";

export default function build(ctx) {
  const T = timeline(ctx.scene), F = figureFrame();
  const ico = new IcosahedronGeometry(1, 1);
  const verts = hullVertices(ico); ico.dispose();
  const plan = rayPlan(F, verts);
  const cam = ctx.player?.camera ?? null;
  const S = {
    T, F, verts, plan, cam,
    resH: { value: 720 }, pxK: { value: 0.002 }, uBox: { value: new Vector4(9, 9, 9, 9) },
    fist: new Vector2(0.4, 0.2),
    // hull radius: swells in f41-55 (ease-out cubic) to 1.1 m; angle 0.3 rad/s, frozen 2 drawings at the strike (impact freeze f94-96)
    hullR: (t) => F.R * easeOut3((t - T.born) / fr(14)),
    hullAng: (t) => 0.3 * (t - T.born - Math.min(Math.max(t - T.TP, 0), fr(2))),
  };
  const rig = new Group(); rig.name = "mujoco-3450-fx";
  const group = new Group(); group.add(rig);
  const mods = [], tmp = new Vector3(), size = new Vector2();
  for (const [name, mod] of [["rays", rays], ["hull", hull], ["smear", smear], ["shock", shock], ["debris", debris], ["shaft", shaft], ["screen", screen], ["grade", grade]]) {
    try { const m = mod.make(ctx, S); if (m.group) rig.add(m.group); mods.push({ name, m, dead: false }); }
    catch (e) { console.error(`[pr-mujoco-3450 fx] ${name} failed to build`, e); ctx.player?.errors?.push({ layer: "fx/" + name, message: String(e?.stack ?? e) }); }
  }
  ctx.setLayer(group, 1);

  function frameState() {
    const s = ctx.seal;
    rig.position.set(s.at[0], s.at[1], s.at[2]); rig.rotation.set(0, s.yaw, 0); rig.scale.setScalar(s.scale);
    rig.updateMatrixWorld(true);
    ctx.engine.renderer.getDrawingBufferSize(size);
    S.resH.value = Math.max(2, size.y);
    if (cam) {
      cam.updateMatrixWorld?.();
      S.pxK.value = 2 * Math.tan((cam.fov * Math.PI / 180) / 2) / S.resH.value;           // world metres per pixel per metre of distance
      tmp.copy(F.M).applyMatrix4(rig.matrixWorld).project(cam);                            // the mitt on screen (ndc): focus of the radial lines
      S.fist.set(Math.min(0.9, Math.max(-0.9, tmp.x)), Math.min(0.9, Math.max(-0.9, tmp.y)));
      try { ctx.player.boxOf(); } catch { /* no box yet */ }
    }
    const b = ctx.player?.box;
    if (b) S.uBox.value.set(b[0], b[1], b[2], b[3]); else S.uBox.value.set(9, 9, 9, 9);
  }

  return {
    group,
    update(t, dt, cue) {
      frameState();
      for (const o of mods) {
        if (o.dead) continue;
        try { o.m.update(t, dt, cue); }
        catch (e) { o.dead = true; if (o.m.group) o.m.group.visible = false; console.error(`[pr-mujoco-3450 fx] ${o.name} muted`, e); ctx.player?.errors?.push({ layer: "fx/" + o.name, message: String(e?.stack ?? e) }); }
      }
    },
    dispose() { for (const o of mods) { try { o.m.dispose(); } catch (e) { console.error(e); } } },
  };
}
