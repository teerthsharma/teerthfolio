// CAST layer for pr-tensorflow-128930: Godsealzilla's fins, Mechasealzilla (the fake, skin burning off) and the operator seal, all second heroes on the hero rig.
// Threads: the look's finGlow (h.fins.set), the `mecha` variant, castHero, plain + uniform outfit. Written new: the burn patch on the fake's materials, the foam rings, the staging.
import { Group, Mesh, RingGeometry, Vector3 } from "three";
import { castHero } from "../../framework/seal.js";
import { mecha } from "../../../kit/hero/looks/pr-tensorflow-128930.js";
import { variant } from "../../../kit/hero/looks/_merge.js";
import { paint, painted } from "../../../sdf.js";
import { cameras, ground, shotAt } from "../stage.js";
import { SHOTS } from "../layout.js";
import { burnPatch } from "./burn.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const fr = (t) => Math.floor(t * 12 + 0.02);
// face the lens, turned a little toward the hero
const faceYaw = (cam, p, h) => { const yc = Math.atan2(cam.eye.x - p.x, cam.eye.z - p.z), yh = Math.atan2(h[0] - p.x, h[2] - p.z); let d = yh - yc; d = Math.atan2(Math.sin(d), Math.cos(d)); return yc + 0.5 * d; };
const lockN = (f) => clamp(Math.floor((f - 78) / 2) + 1, 0, 9);

export default function build(ctx) {
  const { THREE, engine } = ctx, group = new Group();
  const hero = ctx.seal.hero;
  ctx.scene.seal.hero.extras?.(engine, hero);
  const fins = hero.fins;
  // after the breath the plates hold a faint ember that sinks to dark (E39)
  const lit = fins.mesh.material.uniforms.uLit.value, ext = fins.mesh.material.uniforms.uExt.value, sync = fins.mesh.onBeforeRender;
  let ember = 1;
  fins.mesh.onBeforeRender = (...a) => { sync(...a); for (let j = 0; j < 10; j++) lit[j] *= ember; if (ember < 1) ext.fill(0); };

  const guest = castHero(engine, variant(mecha, { fur: { coat: "#3a3d44", belly: "#8a8478", bellyShade: "#5a564e" } }), { at: [0, 0, 0], yaw: 0, scale: 6.48, track: [
    { t: 4.5, pose: "zilla-wade", dur: 0.05, hold: 0.7, out: 0.1 },
    { t: 5.25, pose: "zilla-stand", dur: 0.1, hold: 99 },
    { t: 5.25, set: { rx: -0.12, y: 0.02 }, dur: 0.1, hold: 0.2, out: 0.15 },
    { t: 8.458, pose: "blown", dur: 0.25, hold: 99 },
  ] });
  // the visor: a red band that flares as it arrives, holds, and gutters when the breath lands
  const visors = [];
  guest.group.traverse((o) => { const e = o.material?.uniforms?.uEmit; if (e && e.value.r > 0.5) visors.push(e.value); });
  guest.group.visible = false;
  const burn = burnPatch(guest.group);
  const operator = castHero(engine, variant({}, { outfit: [{ kind: "uniform", col: "#1f2632" }], acc: [{ kind: "headband", col: "#2a2a34" }] }), { at: [0, 0, 0], yaw: 0, scale: 0.8, track: [{ t: 0, pose: "idle", dur: 0.05, hold: 99 }, { t: 8.333, pose: "cower", dur: 0.1, hold: 99 }, { t: 8.333, expr: "terror", dur: 0.1, hold: 99 }] });
  operator.group.visible = false;
  group.add(guest.group, operator.group);

  // a foam collar round the shins: the creature stands in water
  const ringGeo = painted(new RingGeometry(0.6, 0.95, 28, 1).rotateX(-Math.PI / 2), paint("#9aa8b4", "#6a7a88", { line: 0.4 }));
  const foam = engine.prop(ringGeo, 0.5), foamFake = engine.prop(ringGeo, 0.5);
  for (const m of [foam, foamFake]) m.material.uniforms.uEmit.value.setRGB(0.3, 0.36, 0.42);
  foam.userData.layer = foamFake.userData.layer = 1;
  group.add(foam, foamFake);

  let cams = null, asp = 0, warm = false;
  return {
    group,
    update(t, dt, cue) {
      if (!warm) { warm = true; engine.renderer.compile(ctx.root, ctx.player.camera); } // link every program before the first drawing
      const a = ctx.aspect();
      if (!cams || Math.abs(a - asp) > 1e-3) { asp = a; cams = cameras(ctx, a); }
      const f = fr(t), i = cue.shot?.i ?? shotAt(cams, t), cam = cams[i], L = SHOTS[i];
      // Godsealzilla: the plates lock tail to head; the breath snaps them shut
      const n = t >= 8.333 ? 0 : t >= 8.208 ? 9 : lockN(f);
      fins.set(n, f, t >= 8.208 && t < 8.333 ? 1 : 0);
      ember = t < 8.333 ? 1 : t < 8.458 ? 0 : t < 10.5 ? 0.3 : 0.3 * clamp(1 - (f - 126) / 12);
      foam.position.set(ctx.seal.at[0], 0.03, ctx.seal.at[2]); foam.scale.setScalar(ctx.seal.scale);
      // Mechasealzilla: wades in on threes (f54..f63), stands, burns, topples out right by f106
      const g = L.fake, tt = Math.floor(t * 4 + 0.02) / 4;
      ctx.gz = ctx.gz ?? {}; ctx.gz.fake = null;
      guest.group.visible = foamFake.visible = !!g && t >= 4.5 && t < 8.84;
      if (guest.group.visible) {
        const arrive = clamp((tt - 4.5) / 0.75), u = lerp(g[0] + 0.3, g[0], arrive) + (t >= 8.458 ? 0.75 * clamp((t - 8.458) / 0.375) ** 2 : 0);
        const p = { pos: ground(cam, u, g[1], a), scale: 1.08 * ctx.seal.scale };
        guest.at = [p.pos.x, p.pos.y, p.pos.z]; guest.scale = p.scale;
        guest.yaw = faceYaw(cam, p.pos, ctx.seal.at);
        guest.update(tt, dt);
        foamFake.position.set(p.pos.x, 0.03, p.pos.z); foamFake.scale.setScalar(p.scale);
        burn.set(cam, t, p);
        ctx.gz.fake = new Vector3(p.pos.x, p.pos.y + 0.4 * p.scale, p.pos.z);
      }
      const vk = f < 60 ? 0.12 : f < 62 ? 0.82 : t < 8.458 ? 0.45 : [0.4, 0.3, 0.2, 0.1, 0][t < 8.5 ? 0 : t < 8.583 ? 1 : t < 8.667 ? 2 : t < 8.75 ? 3 : 4];
      for (const e of visors) e.setRGB(1.1 * vk, 0.08 * vk, 0.04 * vk);
      const o = L.op;
      operator.group.visible = !!o && t >= 2;
      if (operator.group.visible) {
        const p = { pos: ground(cam, o[0], o[1], a), scale: 0.8 };
        operator.at = [p.pos.x, p.pos.y, p.pos.z]; operator.scale = p.scale;
        operator.yaw = Math.atan2(cam.eye.x - p.pos.x, cam.eye.z - p.pos.z) * 0.6;
        operator.update(t, dt);
      }
    },
    dispose() { guest.dispose(); operator.dispose(); },
  };
}
